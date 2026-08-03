"use server";

import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import {
  initiateShopSchema,
  updateShopSchema,
  type InitiateShopInput,
  type UpdateShopInput,
} from "@/lib/validations/shops";

export type ActionResult = {
  success: boolean;
  error?: string;
  id?: string;
};

function emptyToNull(value?: string | null) {
  if (!value || value.trim() === "") return null;
  return value;
}

function revalidateShopPaths(shopId?: string) {
  revalidatePath("/setup/shops");
  revalidatePath("/setup/branches");
  revalidatePath("/shops/stock");
  revalidatePath("/shops/orders");
  revalidatePath("/shops/finance");
  revalidatePath("/users");
  if (shopId) revalidatePath(`/setup/shops/${shopId}`);
}

/**
 * Formally open a new retail shop: branch + optional first Shop login.
 */
export async function initiateShop(
  input: InitiateShopInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = initiateShopSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const data = parsed.data;
  const code = data.code.toUpperCase();

  try {
    const shop = await prisma.$transaction(async (tx) => {
      const created = await tx.branch.create({
        data: {
          name: data.name,
          code,
          address: emptyToNull(data.address),
          isShop: true,
          isWarehouse: false,
          isActive: true,
        },
      });

      if (data.createManager) {
        const shopRole = await tx.role.findUnique({ where: { name: "Shop" } });
        if (!shopRole) {
          throw new Error('Shop role missing. Run seed first.');
        }
        await tx.user.create({
          data: {
            name: data.managerName!.trim(),
            email: data.managerEmail!.trim().toLowerCase(),
            passwordHash: await hash(data.managerPassword!, 12),
            roleId: shopRole.id,
            branchId: created.id,
            isActive: true,
          },
        });
      }

      return created;
    });

    revalidateShopPaths(shop.id);
    return { success: true, id: shop.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = (error.meta?.target as string[] | undefined)?.join(" ") ?? "";
      if (target.includes("email")) {
        return { success: false, error: "That email is already in use." };
      }
      return { success: false, error: "Shop code already exists." };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not create shop.",
    };
  }
}

export async function updateShop(
  id: string,
  input: UpdateShopInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateShopSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const shop = await prisma.branch.findFirst({
    where: { id, isShop: true },
  });
  if (!shop) return { success: false, error: "Shop not found." };
  if (shop.isWarehouse) {
    return {
      success: false,
      error: "This location is also a warehouse — edit it under Branches.",
    };
  }

  try {
    await prisma.branch.update({
      where: { id },
      data: {
        name: parsed.data.name,
        code: parsed.data.code.toUpperCase(),
        address: emptyToNull(parsed.data.address),
        isShop: true,
        isWarehouse: false,
      },
    });
    revalidateShopPaths(id);
    return { success: true, id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Shop code already exists." };
    }
    return { success: false, error: "Could not update shop." };
  }
}

export async function setShopActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  const shop = await prisma.branch.findFirst({
    where: { id, isShop: true },
  });
  if (!shop) return { success: false, error: "Shop not found." };
  if (shop.isWarehouse && !isActive) {
    return {
      success: false,
      error: "Cannot close a warehouse from Shops — use Branches.",
    };
  }

  await prisma.branch.update({ where: { id }, data: { isActive } });
  revalidateShopPaths(id);
  return { success: true, id };
}

/**
 * Soft-close when the shop has history; hard-delete only when empty.
 */
export async function deleteShop(id: string): Promise<ActionResult> {
  await requireAdmin();

  const shop = await prisma.branch.findFirst({
    where: { id, isShop: true },
    include: {
      _count: {
        select: {
          sales: true,
          users: true,
          transfersFrom: true,
          transfersTo: true,
          shopOrdersAsShop: true,
          productionOrders: true,
          materialLots: true,
          rawMaterialStocks: true,
          capitalAssets: true,
          employees: true,
        },
      },
    },
  });
  if (!shop) return { success: false, error: "Shop not found." };
  if (shop.isWarehouse) {
    return {
      success: false,
      error: "Cannot delete a warehouse from Shops.",
    };
  }

  const stockUnits = await prisma.finishedGoodsStock.aggregate({
    where: { branchId: id },
    _sum: { quantity: true },
  });
  const units = stockUnits._sum.quantity ?? 0;

  const hasHistory =
    shop._count.sales > 0 ||
    shop._count.transfersFrom > 0 ||
    shop._count.transfersTo > 0 ||
    shop._count.shopOrdersAsShop > 0 ||
    shop._count.productionOrders > 0 ||
    shop._count.materialLots > 0 ||
    shop._count.rawMaterialStocks > 0 ||
    shop._count.capitalAssets > 0 ||
    shop._count.employees > 0 ||
    units > 0;

  // History? Close (deactivate) — never wipe sales/stock.
  if (hasHistory) {
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { branchId: id },
        data: { isActive: false },
      });
      await tx.branch.update({
        where: { id },
        data: { isActive: false },
      });
    });
    revalidateShopPaths(id);
    return { success: true, id };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { branchId: id },
        data: { branchId: null, isActive: false },
      });
      await tx.finishedGoodsStock.deleteMany({ where: { branchId: id } });
      await tx.branch.delete({ where: { id } });
    });
    revalidateShopPaths();
    return { success: true, id };
  } catch {
    await prisma.branch.update({ where: { id }, data: { isActive: false } });
    revalidateShopPaths(id);
    return { success: true, id };
  }
}
