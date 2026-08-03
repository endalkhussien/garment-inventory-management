"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  adjustRawMaterialBranchStock,
  ensureMaterialBookOnBranch,
  resolveMaterialBranchId,
} from "@/lib/raw-material-stock";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import {
  leftoverReturnSchema,
  receiveLotSchema,
  type LeftoverReturnInput,
  type ReceiveLotInput,
} from "@/lib/validations/lots";

export type ActionResult = {
  success: boolean;
  error?: string;
  id?: string;
};

function emptyToNull(value?: string | null) {
  if (!value || value.trim() === "" || value === "__none__") return null;
  return value;
}

/** Receive a fabric/trim lot or roll — increases book qty and creates lot record. */
export async function receiveMaterialLot(
  input: ReceiveLotInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = receiveLotSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const data = parsed.data;
  const session = await getServerSession(authOptions);
  const qty = new Prisma.Decimal(data.quantity);

  try {
    const lot = await prisma.$transaction(async (tx) => {
      const material = await tx.rawMaterial.findUnique({
        where: { id: data.rawMaterialId },
      });
      if (!material || !material.isActive) {
        throw new Error("Raw material not found.");
      }

      const branchId = await resolveMaterialBranchId(
        tx,
        material.id,
        emptyToNull(data.branchId) ?? material.branchId,
      );

      await ensureMaterialBookOnBranch(tx, material.id, branchId);

      const { totalQty } = await adjustRawMaterialBranchStock(
        tx,
        material.id,
        branchId,
        qty,
      );

      await tx.stockMovement.create({
        data: {
          rawMaterialId: material.id,
          type: "IN",
          quantity: qty,
          reasonCode: "PURCHASE",
          note: `Lot ${data.lotCode}${data.rollNumber ? ` / roll ${data.rollNumber}` : ""}`,
          balanceAfter: totalQty,
          branchId,
          createdById: session?.user?.id ?? null,
        },
      });

      return tx.materialLot.create({
        data: {
          rawMaterialId: material.id,
          lotCode: data.lotCode.trim(),
          rollNumber: emptyToNull(data.rollNumber),
          shade: emptyToNull(data.shade),
          originalQty: qty,
          usableQty: qty,
          status: "AVAILABLE",
          location: emptyToNull(data.location) ?? material.location,
          branchId,
          defects: emptyToNull(data.defects),
          notes: emptyToNull(data.notes),
        },
      });
    });

    revalidatePath("/inventory/lots");
    revalidatePath("/inventory/raw-materials");
    revalidatePath(`/inventory/raw-materials/${data.rawMaterialId}`);
    return { success: true, id: lot.id };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Could not receive lot.",
    };
  }
}

/**
 * Return leftover fabric after cutting — restores book qty and creates a LEFTOVER lot
 * (materials were already fully issued at production start).
 */
export async function returnLeftoverFabric(
  input: LeftoverReturnInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = leftoverReturnSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const data = parsed.data;
  const session = await getServerSession(authOptions);
  const qty = new Prisma.Decimal(data.quantity);

  try {
    const lot = await prisma.$transaction(async (tx) => {
      const order = await tx.productionOrder.findUnique({
        where: { id: data.productionOrderId },
      });
      if (!order) throw new Error("Production order not found.");
      if (order.status === "DRAFT") {
        throw new Error("Start the order before returning leftovers.");
      }

      const material = await tx.rawMaterial.findUnique({
        where: { id: data.rawMaterialId },
      });
      if (!material || !material.isActive) {
        throw new Error("Raw material not found.");
      }

      const branchId = await resolveMaterialBranchId(
        tx,
        material.id,
        order.warehouseBranchId,
      );

      await ensureMaterialBookOnBranch(tx, material.id, branchId);

      const { totalQty } = await adjustRawMaterialBranchStock(
        tx,
        material.id,
        branchId,
        qty,
      );

      await tx.stockMovement.create({
        data: {
          rawMaterialId: material.id,
          type: "IN",
          quantity: qty,
          reasonCode: "RETURN",
          note: `Leftover from ${order.orderNumber} · lot ${data.lotCode}`,
          balanceAfter: totalQty,
          branchId,
          createdById: session?.user?.id ?? null,
        },
      });

      return tx.materialLot.create({
        data: {
          rawMaterialId: material.id,
          lotCode: data.lotCode.trim(),
          rollNumber: emptyToNull(data.rollNumber),
          shade: emptyToNull(data.shade),
          originalQty: qty,
          usableQty: qty,
          status: "LEFTOVER",
          location: emptyToNull(data.location) ?? material.location,
          branchId,
          productionOrderId: order.id,
          defects: emptyToNull(data.defects),
          notes:
            emptyToNull(data.notes) ??
            `Leftover return from ${order.orderNumber}`,
        },
      });
    });

    revalidatePath("/inventory/lots");
    revalidatePath(`/production/orders/${data.productionOrderId}`);
    revalidatePath(`/inventory/raw-materials/${data.rawMaterialId}`);
    return { success: true, id: lot.id };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not record leftover return.",
    };
  }
}

/** Consume AVAILABLE/LEFTOVER lots FIFO for a material (used when starting production). */
export async function consumeLotsFifo(
  tx: Prisma.TransactionClient,
  rawMaterialId: string,
  needed: Prisma.Decimal,
  productionOrderId: string,
) {
  let remaining = needed;
  const lots = await tx.materialLot.findMany({
    where: {
      rawMaterialId,
      status: { in: ["AVAILABLE", "LEFTOVER"] },
      usableQty: { gt: 0 },
    },
    orderBy: [{ receivedAt: "asc" }, { createdAt: "asc" }],
  });

  for (const lot of lots) {
    if (remaining.lessThanOrEqualTo(0)) break;
    const usable = new Prisma.Decimal(lot.usableQty);
    const take = usable.lessThan(remaining) ? usable : remaining;
    const nextUsable = usable.sub(take);
    await tx.materialLot.update({
      where: { id: lot.id },
      data: {
        usableQty: nextUsable,
        status: nextUsable.lessThanOrEqualTo(0) ? "DEPLETED" : "ISSUED",
        productionOrderId,
      },
    });
    remaining = remaining.sub(take);
  }

  return remaining;
}
