"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import {
  adjustRawMaterialBranchStock,
  ensureMaterialBookOnBranch,
  resolveMaterialBranchId,
} from "@/lib/raw-material-stock";
import {
  capitalAssetSchema,
  rawMaterialSchema,
  rawMaterialTransferSchema,
  stockMovementSchema,
  type CapitalAssetInput,
  type RawMaterialInput,
  type RawMaterialTransferInput,
  type StockMovementInput,
} from "@/lib/validations/inventory";

export type ActionResult = {
  success: boolean;
  error?: string;
  id?: string;
};

function emptyToNull(value?: string | null) {
  if (!value || value.trim() === "" || value === "__none__") return null;
  return value;
}

export async function createRawMaterial(
  input: RawMaterialInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = rawMaterialSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const data = parsed.data;
  const opening = new Prisma.Decimal(data.quantity ?? 0);
  const created = await prisma.$transaction(async (tx) => {
    const material = await tx.rawMaterial.create({
      data: {
        name: data.name,
        code: emptyToNull(data.code),
        categoryId: data.categoryId,
        unitOfMeasure: data.unitOfMeasure,
        supplierId: emptyToNull(data.supplierId),
        costPerUnit: new Prisma.Decimal(data.costPerUnit),
        reorderThreshold: new Prisma.Decimal(data.reorderThreshold),
        quantity: 0,
        location: emptyToNull(data.location),
        branchId: emptyToNull(data.branchId),
      },
    });

    if (opening.greaterThan(0)) {
      const branchId = await resolveMaterialBranchId(
        tx,
        material.id,
        emptyToNull(data.branchId),
      );
      await adjustRawMaterialBranchStock(tx, material.id, branchId, opening);
    }

    return material;
  });

  revalidatePath("/inventory/raw-materials");
  return { success: true, id: created.id };
}

export async function updateRawMaterial(
  id: string,
  input: RawMaterialInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = rawMaterialSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const data = parsed.data;

  try {
    const existing = await prisma.rawMaterial.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Raw material not found." };
    }

    const previousCost = Number(existing.costPerUnit.toString());
    const nextCost = data.costPerUnit;

    await prisma.rawMaterial.update({
      where: { id },
      data: {
        name: data.name,
        code: emptyToNull(data.code),
        categoryId: data.categoryId,
        unitOfMeasure: data.unitOfMeasure,
        supplierId: emptyToNull(data.supplierId),
        costPerUnit: new Prisma.Decimal(data.costPerUnit),
        reorderThreshold: new Prisma.Decimal(data.reorderThreshold),
        location: emptyToNull(data.location),
        branchId: emptyToNull(data.branchId),
      },
    });

    if (previousCost !== nextCost) {
      const { markVariantsStaleForMaterial } =
        await import("@/lib/actions/products");
      await markVariantsStaleForMaterial(id);
    }
  } catch {
    return { success: false, error: "Raw material not found." };
  }

  revalidatePath("/inventory/raw-materials");
  revalidatePath(`/inventory/raw-materials/${id}`);
  revalidatePath("/products");
  return { success: true, id };
}

export async function createCapitalAsset(
  input: CapitalAssetInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = capitalAssetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const data = parsed.data;
  const serial = emptyToNull(data.serialNumber);

  try {
    const created = await prisma.capitalAsset.create({
      data: {
        name: data.name,
        typeId: emptyToNull(data.typeId),
        typeName: data.typeName,
        serialNumber: serial,
        purchaseDate: data.purchaseDate
          ? new Date(data.purchaseDate)
          : null,
        purchaseCost: new Prisma.Decimal(data.purchaseCost),
        condition: data.condition,
        location: emptyToNull(data.location),
        branchId: emptyToNull(data.branchId),
      },
    });

    revalidatePath("/inventory/capital-assets");
    return { success: true, id: created.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Serial number already exists." };
    }
    return { success: false, error: "Could not create capital asset." };
  }
}

export async function updateCapitalAsset(
  id: string,
  input: CapitalAssetInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = capitalAssetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const data = parsed.data;

  try {
    await prisma.capitalAsset.update({
      where: { id },
      data: {
        name: data.name,
        typeId: emptyToNull(data.typeId),
        typeName: data.typeName,
        serialNumber: emptyToNull(data.serialNumber),
        purchaseDate: data.purchaseDate
          ? new Date(data.purchaseDate)
          : null,
        purchaseCost: new Prisma.Decimal(data.purchaseCost),
        condition: data.condition,
        location: emptyToNull(data.location),
        branchId: emptyToNull(data.branchId),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Serial number already exists." };
    }
    return { success: false, error: "Capital asset not found." };
  }

  revalidatePath("/inventory/capital-assets");
  revalidatePath(`/inventory/capital-assets/${id}`);
  return { success: true, id };
}

export async function setRawMaterialActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await prisma.rawMaterial.update({
      where: { id },
      data: { isActive },
    });
    revalidatePath("/inventory/raw-materials");
    revalidatePath(`/inventory/raw-materials/${id}`);
    return { success: true, id };
  } catch {
    return { success: false, error: "Raw material not found." };
  }
}

export async function setCapitalAssetActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await prisma.capitalAsset.update({
      where: { id },
      data: { isActive },
    });
    revalidatePath("/inventory/capital-assets");
    revalidatePath(`/inventory/capital-assets/${id}`);
    return { success: true, id };
  } catch {
    return { success: false, error: "Capital asset not found." };
  }
}

export async function recordStockMovement(
  input: StockMovementInput,
): Promise<ActionResult> {
  const parsed = stockMovementSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const data = parsed.data;
  const session = await getServerSession(authOptions);
  const qty = new Prisma.Decimal(data.quantity);

  try {
    await prisma.$transaction(async (tx) => {
      const material = await tx.rawMaterial.findUnique({
        where: { id: data.rawMaterialId },
      });

      if (!material || !material.isActive) {
        throw new Error("Raw material not found.");
      }

      const branchId = await resolveMaterialBranchId(
        tx,
        material.id,
        emptyToNull(data.branchId),
      );

      await ensureMaterialBookOnBranch(tx, material.id, branchId);

      const delta = data.type === "IN" ? qty : qty.neg();
      const { totalQty } = await adjustRawMaterialBranchStock(
        tx,
        material.id,
        branchId,
        delta,
      );

      await tx.stockMovement.create({
        data: {
          rawMaterialId: material.id,
          type: data.type,
          quantity: qty,
          reasonCode: data.reasonCode,
          note: emptyToNull(data.note),
          balanceAfter: totalQty,
          branchId,
          createdById: session?.user?.id ?? null,
        },
      });
    });
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Stock movement failed. No changes were saved.",
    };
  }

  revalidatePath("/inventory/raw-materials");
  revalidatePath(`/inventory/raw-materials/${data.rawMaterialId}`);
  revalidatePath("/inventory/stock-movements");
  revalidatePath("/inventory/raw-transfers");
  return { success: true };
}

export async function transferRawMaterial(
  input: RawMaterialTransferInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = rawMaterialTransferSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const data = parsed.data;
  const session = await getServerSession(authOptions);
  const qty = new Prisma.Decimal(data.quantity);

  try {
    const transfer = await prisma.$transaction(async (tx) => {
      const material = await tx.rawMaterial.findUnique({
        where: { id: data.rawMaterialId },
      });
      if (!material || !material.isActive) {
        throw new Error("Raw material not found.");
      }

      await ensureMaterialBookOnBranch(
        tx,
        data.rawMaterialId,
        data.fromBranchId,
      );

      await adjustRawMaterialBranchStock(
        tx,
        data.rawMaterialId,
        data.fromBranchId,
        qty.neg(),
      );
      const { totalQty } = await adjustRawMaterialBranchStock(
        tx,
        data.rawMaterialId,
        data.toBranchId,
        qty,
      );

      await tx.stockMovement.create({
        data: {
          rawMaterialId: data.rawMaterialId,
          type: "OUT",
          quantity: qty,
          reasonCode: "TRANSFER",
          note:
            emptyToNull(data.note) ??
            `Transfer to branch ${data.toBranchId}`,
          balanceAfter: totalQty,
          branchId: data.fromBranchId,
          createdById: session?.user?.id ?? null,
        },
      });
      await tx.stockMovement.create({
        data: {
          rawMaterialId: data.rawMaterialId,
          type: "IN",
          quantity: qty,
          reasonCode: "TRANSFER",
          note:
            emptyToNull(data.note) ??
            `Transfer from branch ${data.fromBranchId}`,
          balanceAfter: totalQty,
          branchId: data.toBranchId,
          createdById: session?.user?.id ?? null,
        },
      });

      return tx.rawMaterialTransfer.create({
        data: {
          rawMaterialId: data.rawMaterialId,
          fromBranchId: data.fromBranchId,
          toBranchId: data.toBranchId,
          quantity: qty,
          note: emptyToNull(data.note),
          transferredById: session?.user?.id ?? null,
        },
      });
    });

    revalidatePath("/inventory/raw-transfers");
    revalidatePath("/inventory/raw-materials");
    revalidatePath(`/inventory/raw-materials/${data.rawMaterialId}`);
    return { success: true, id: transfer.id };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Transfer failed. No stock was moved.",
    };
  }
}
