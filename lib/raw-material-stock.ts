import { Prisma } from "@prisma/client";

/**
 * Adjust raw material qty at a branch and keep RawMaterial.quantity = sum of branches.
 * Blocks negative branch stock.
 */
export async function adjustRawMaterialBranchStock(
  tx: Prisma.TransactionClient,
  rawMaterialId: string,
  branchId: string,
  delta: Prisma.Decimal | number,
) {
  const change =
    typeof delta === "number" ? new Prisma.Decimal(delta) : delta;

  const existing = await tx.rawMaterialStock.findUnique({
    where: {
      rawMaterialId_branchId: { rawMaterialId, branchId },
    },
  });

  const current = existing
    ? new Prisma.Decimal(existing.quantity)
    : new Prisma.Decimal(0);
  const next = current.add(change);

  if (next.lessThan(0)) {
    const material = await tx.rawMaterial.findUnique({
      where: { id: rawMaterialId },
      select: { name: true, unitOfMeasure: true },
    });
    const branch = await tx.branch.findUnique({
      where: { id: branchId },
      select: { name: true },
    });
    throw new Error(
      `Not enough ${material?.name ?? "material"} at ${branch?.name ?? "branch"}. Available: ${current.toString()} ${material?.unitOfMeasure ?? ""}.`,
    );
  }

  if (existing) {
    await tx.rawMaterialStock.update({
      where: { id: existing.id },
      data: { quantity: next },
    });
  } else {
    await tx.rawMaterialStock.create({
      data: {
        rawMaterialId,
        branchId,
        quantity: next,
      },
    });
  }

  const stocks = await tx.rawMaterialStock.findMany({
    where: { rawMaterialId },
    select: { quantity: true },
  });
  const total = stocks.reduce(
    (sum, s) => sum.add(s.quantity),
    new Prisma.Decimal(0),
  );

  await tx.rawMaterial.update({
    where: { id: rawMaterialId },
    data: { quantity: total },
  });

  return { branchQty: next, totalQty: total };
}

/**
 * If material has book qty but no branch rows yet, place the book balance
 * on the given branch without changing the total.
 */
export async function ensureMaterialBookOnBranch(
  tx: Prisma.TransactionClient,
  rawMaterialId: string,
  branchId: string,
) {
  const stockCount = await tx.rawMaterialStock.count({
    where: { rawMaterialId },
  });
  if (stockCount > 0) return;

  const material = await tx.rawMaterial.findUnique({
    where: { id: rawMaterialId },
  });
  if (!material) throw new Error("Raw material not found.");

  const book = new Prisma.Decimal(material.quantity);
  if (book.lessThanOrEqualTo(0)) return;

  await tx.rawMaterialStock.create({
    data: {
      rawMaterialId,
      branchId,
      quantity: book,
    },
  });
}

/** Resolve a branch for stock ops: explicit → material.branchId → first warehouse. */
export async function resolveMaterialBranchId(
  tx: Prisma.TransactionClient,
  rawMaterialId: string,
  preferredBranchId?: string | null,
): Promise<string> {
  if (preferredBranchId && preferredBranchId !== "__none__") {
    return preferredBranchId;
  }

  const material = await tx.rawMaterial.findUnique({
    where: { id: rawMaterialId },
    select: { branchId: true },
  });
  if (material?.branchId) return material.branchId;

  const warehouse = await tx.branch.findFirst({
    where: { isActive: true, isWarehouse: true },
    orderBy: { name: "asc" },
  });
  if (warehouse) return warehouse.id;

  const any = await tx.branch.findFirst({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  if (!any) {
    throw new Error("Create a branch before recording stock by location.");
  }
  return any.id;
}
