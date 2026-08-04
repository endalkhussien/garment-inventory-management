"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { adjustFinishedGoodsWithMovement } from "@/lib/finished-goods-stock";
import { createNotificationForAdmins, createNotificationForUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getShopBranchId, isAdminRole, isShopRole, requireAdmin } from "@/lib/rbac";
import { getAppSettings } from "@/lib/settings";
import {
  createShopStockOrderSchema,
  reviewShopStockOrderSchema,
  updateShopReorderSchema,
  type CreateShopStockOrderInput,
  type ReviewShopStockOrderInput,
  type UpdateShopReorderInput,
} from "@/lib/validations/shop-orders";

export type ActionResult = {
  success: boolean;
  error?: string;
  id?: string;
};

function emptyToNull(value?: string | null) {
  if (!value || value.trim() === "") return null;
  return value;
}

async function nextShopOrderNumber() {
  const count = await prisma.shopStockOrder.count();
  return `SO-${String(count + 1).padStart(5, "0")}`;
}

/** Live warehouse availability for shop order form. */
export async function getWarehouseAvailability(warehouseBranchId: string) {
  const stocks = await prisma.finishedGoodsStock.findMany({
    where: {
      branchId: warehouseBranchId,
      quantity: { gt: 0 },
      variant: { isActive: true, product: { isActive: true } },
    },
    include: {
      variant: { include: { product: true } },
    },
    orderBy: { variant: { sku: "asc" } },
  });

  return stocks.map((s) => ({
    variantId: s.variantId,
    label: `${s.variant.product.name} · ${s.variant.size}/${s.variant.color} (${s.variant.sku})`,
    available: s.quantity,
    sellingPrice: Number(s.variant.sellingPrice.toString()),
  }));
}

export async function createShopStockOrder(
  input: CreateShopStockOrderInput,
): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { success: false, error: "Sign in required." };
  }

  const parsed = createShopStockOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const shopBranchId = isShopRole(session.user.role.name)
    ? getShopBranchId(session)
    : null;

  if (!shopBranchId) {
    return {
      success: false,
      error: "Only shop users with an assigned branch can place stock orders.",
    };
  }

  if (parsed.data.warehouseBranchId === shopBranchId) {
    return { success: false, error: "Choose the warehouse, not your shop." };
  }

  const warehouse = await prisma.branch.findFirst({
    where: {
      id: parsed.data.warehouseBranchId,
      isActive: true,
      isWarehouse: true,
    },
  });
  if (!warehouse) {
    return { success: false, error: "Invalid warehouse." };
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const lines = [];
      for (const line of parsed.data.lines) {
        const [wh, shop] = await Promise.all([
          tx.finishedGoodsStock.findUnique({
            where: {
              variantId_branchId: {
                variantId: line.variantId,
                branchId: warehouse.id,
              },
            },
          }),
          tx.finishedGoodsStock.findUnique({
            where: {
              variantId_branchId: {
                variantId: line.variantId,
                branchId: shopBranchId,
              },
            },
          }),
        ]);

        const available = wh?.quantity ?? 0;
        if (available < line.quantityRequested) {
          const variant = await tx.productVariant.findUnique({
            where: { id: line.variantId },
            include: { product: true },
          });
          throw new Error(
            `Not enough at warehouse for ${variant?.product.name ?? "item"}: available ${available}, requested ${line.quantityRequested}.`,
          );
        }

        lines.push({
          variantId: line.variantId,
          quantityRequested: line.quantityRequested,
          quantityApproved: line.quantityRequested,
          warehouseAvailableSnap: available,
          shopQtySnap: shop?.quantity ?? 0,
        });
      }

      const orderNumber = await nextShopOrderNumber();
      return tx.shopStockOrder.create({
        data: {
          orderNumber,
          shopBranchId,
          warehouseBranchId: warehouse.id,
          status: "PENDING",
          note: emptyToNull(parsed.data.note),
          requestedById: session.user.id,
          lines: { create: lines },
        },
      });
    });

    await createNotificationForAdmins({
      title: "Shop stock order",
      body: `${order.orderNumber} needs review`,
      href: `/shops/orders/${order.id}`,
    });

    revalidatePath("/shops/orders");
    revalidatePath("/shops/stock");
    return { success: true, id: order.id };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Could not create order.",
    };
  }
}

export async function cancelShopStockOrder(
  orderId: string,
): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Sign in required." };

  const order = await prisma.shopStockOrder.findUnique({
    where: { id: orderId },
  });
  if (!order) return { success: false, error: "Order not found." };
  if (order.status !== "PENDING") {
    return { success: false, error: "Only pending orders can be cancelled." };
  }

  const shopBranchId = getShopBranchId(session);
  const isOwner =
    isShopRole(session.user.role.name) &&
    shopBranchId === order.shopBranchId;
  if (!isOwner && !isAdminRole(session.user.role.name)) {
    return { success: false, error: "Not allowed." };
  }

  await prisma.shopStockOrder.update({
    where: { id: orderId },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/shops/orders");
  revalidatePath(`/shops/orders/${orderId}`);
  return { success: true, id: orderId };
}

/**
 * Admin/Manager: approve (optionally adjust qtys), reject, or fulfill (transfer stock).
 * FULFILL also works from APPROVED status.
 */
export async function reviewShopStockOrder(
  input: ReviewShopStockOrderInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = reviewShopStockOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const session = await getServerSession(authOptions);
  const settings = await getAppSettings();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.shopStockOrder.findUnique({
        where: { id: parsed.data.orderId },
        include: { lines: true },
      });
      if (!order) throw new Error("Order not found.");

      if (parsed.data.decision === "REJECTED") {
        if (order.status !== "PENDING" && order.status !== "APPROVED") {
          throw new Error("Cannot reject this order.");
        }
        await tx.shopStockOrder.update({
          where: { id: order.id },
          data: {
            status: "REJECTED",
            reviewedById: session?.user?.id ?? null,
            reviewNote: emptyToNull(parsed.data.reviewNote),
            reviewedAt: new Date(),
          },
        });
        return { id: order.id, status: "REJECTED" as const };
      }

      if (parsed.data.decision === "APPROVED") {
        if (order.status !== "PENDING") {
          throw new Error("Only pending orders can be approved.");
        }
        if (parsed.data.lines?.length) {
          for (const line of parsed.data.lines) {
            await tx.shopStockOrderLine.update({
              where: { id: line.lineId },
              data: { quantityApproved: line.quantityApproved },
            });
          }
        }
        await tx.shopStockOrder.update({
          where: { id: order.id },
          data: {
            status: "APPROVED",
            reviewedById: session?.user?.id ?? null,
            reviewNote: emptyToNull(parsed.data.reviewNote),
            reviewedAt: new Date(),
          },
        });
        return { id: order.id, status: "APPROVED" as const };
      }

      // FULFILL
      if (order.status !== "PENDING" && order.status !== "APPROVED") {
        throw new Error("Only pending/approved orders can be fulfilled.");
      }

      if (parsed.data.lines?.length) {
        for (const line of parsed.data.lines) {
          await tx.shopStockOrderLine.update({
            where: { id: line.lineId },
            data: { quantityApproved: line.quantityApproved },
          });
        }
      }

      const fresh = await tx.shopStockOrder.findUnique({
        where: { id: order.id },
        include: { lines: true },
      });
      if (!fresh) throw new Error("Order not found.");

      for (const line of fresh.lines) {
        const qty = line.quantityApproved ?? line.quantityRequested;
        if (qty <= 0) continue;

        await adjustFinishedGoodsWithMovement(tx, {
          variantId: line.variantId,
          branchId: fresh.warehouseBranchId,
          delta: -qty,
          type: "TRANSFER_OUT",
          note: `Fulfill ${fresh.orderNumber}`,
          referenceType: "ShopStockOrder",
          referenceId: fresh.id,
          createdById: session?.user?.id ?? null,
          defaultReorderAt: settings.defaultFinishedGoodsReorderAt,
        });

        await adjustFinishedGoodsWithMovement(tx, {
          variantId: line.variantId,
          branchId: fresh.shopBranchId,
          delta: qty,
          type: "ORDER_FULFILL",
          note: `Fulfill ${fresh.orderNumber}`,
          referenceType: "ShopStockOrder",
          referenceId: fresh.id,
          createdById: session?.user?.id ?? null,
          defaultReorderAt: settings.defaultFinishedGoodsReorderAt,
        });

        await tx.stockTransfer.create({
          data: {
            variantId: line.variantId,
            fromBranchId: fresh.warehouseBranchId,
            toBranchId: fresh.shopBranchId,
            quantity: qty,
            note: `Fulfill ${fresh.orderNumber}`,
            transferredById: session?.user?.id ?? null,
          },
        });
      }

      await tx.shopStockOrder.update({
        where: { id: fresh.id },
        data: {
          status: "FULFILLED",
          reviewedById: session?.user?.id ?? null,
          reviewNote: emptyToNull(parsed.data.reviewNote),
          reviewedAt: new Date(),
          fulfilledAt: new Date(),
        },
      });

      return { id: fresh.id, status: "FULFILLED" as const };
    });

    const order = await prisma.shopStockOrder.findUnique({
      where: { id: result.id },
    });
    if (order?.requestedById) {
      await createNotificationForUser({
        userId: order.requestedById,
        title: `Stock order ${result.status.toLowerCase()}`,
        body: order.orderNumber,
        href: `/shops/orders/${order.id}`,
      });
    }

    revalidatePath("/shops/orders");
    revalidatePath(`/shops/orders/${result.id}`);
    revalidatePath("/shops/stock");
    revalidatePath("/shops/transfers");
    return { success: true, id: result.id };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Could not review order.",
    };
  }
}

/** Shop can set reorder level on their own FG rows. */
export async function updateShopReorderAt(
  input: UpdateShopReorderInput,
): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Sign in required." };

  const parsed = updateShopReorderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const stock = await prisma.finishedGoodsStock.findUnique({
    where: { id: parsed.data.stockId },
  });
  if (!stock) return { success: false, error: "Stock row not found." };

  if (isShopRole(session.user.role.name)) {
    const shopBranchId = getShopBranchId(session);
    if (shopBranchId !== stock.branchId) {
      return { success: false, error: "You can only edit your shop stock." };
    }
  } else if (!isAdminRole(session.user.role.name)) {
    return { success: false, error: "Not allowed." };
  }

  await prisma.finishedGoodsStock.update({
    where: { id: stock.id },
    data: { reorderAt: parsed.data.reorderAt },
  });

  revalidatePath("/shops/stock");
  return { success: true, id: stock.id };
}
