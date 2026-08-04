import { Prisma, type FinishedGoodsMovementType } from "@prisma/client";

export async function adjustFinishedGoodsWithMovement(
  tx: Prisma.TransactionClient,
  params: {
    variantId: string;
    branchId: string;
    delta: number;
    type: FinishedGoodsMovementType;
    note?: string | null;
    referenceType?: string | null;
    referenceId?: string | null;
    createdById?: string | null;
    defaultReorderAt?: number;
  },
) {
  const {
    variantId,
    branchId,
    delta,
    type,
    note,
    referenceType,
    referenceId,
    createdById,
    defaultReorderAt = 5,
  } = params;

  const existing = await tx.finishedGoodsStock.findUnique({
    where: { variantId_branchId: { variantId, branchId } },
  });
  const next = (existing?.quantity ?? 0) + delta;
  if (next < 0) {
    throw new Error(
      `Not enough shop stock. Available: ${existing?.quantity ?? 0}`,
    );
  }

  if (existing) {
    await tx.finishedGoodsStock.update({
      where: { id: existing.id },
      data: { quantity: next },
    });
  } else if (delta > 0) {
    await tx.finishedGoodsStock.create({
      data: {
        variantId,
        branchId,
        quantity: next,
        reorderAt: defaultReorderAt,
      },
    });
  } else {
    throw new Error("No stock at this location.");
  }

  await tx.finishedGoodsMovement.create({
    data: {
      variantId,
      branchId,
      type,
      quantity: Math.abs(delta),
      delta,
      balanceAfter: next,
      note: note ?? null,
      referenceType: referenceType ?? null,
      referenceId: referenceId ?? null,
      createdById: createdById ?? null,
    },
  });

  return next;
}
