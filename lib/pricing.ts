import { toNumber } from "@/lib/format";

export type BomCostLine = {
  quantityPerUnit: number;
  costPerUnit: number;
};

export type CostBreakdown = {
  materialCost: number;
  laborCost: number;
  overheadPercent: number;
  overheadAmount: number;
  totalCost: number;
};

export function calculateMaterialCost(lines: BomCostLine[]): number {
  return roundMoney(
    lines.reduce(
      (sum, line) => sum + line.quantityPerUnit * line.costPerUnit,
      0,
    ),
  );
}

export function calculateCostBreakdown(input: {
  materialCost: number;
  laborCost: number;
  overheadPercent: number;
}): CostBreakdown {
  const materialCost = roundMoney(input.materialCost);
  const laborCost = roundMoney(input.laborCost);
  const overheadPercent = input.overheadPercent;
  const overheadAmount = roundMoney(
    ((materialCost + laborCost) * overheadPercent) / 100,
  );
  const totalCost = roundMoney(materialCost + laborCost + overheadAmount);

  return {
    materialCost,
    laborCost,
    overheadPercent,
    overheadAmount,
    totalCost,
  };
}

export function sellingPriceFromMargin(
  totalCost: number,
  marginPercent: number,
): number {
  return roundMoney(totalCost * (1 + marginPercent / 100));
}

export function marginFromPrice(totalCost: number, sellingPrice: number) {
  const marginEtb = roundMoney(sellingPrice - totalCost);
  const marginPercent =
    totalCost === 0
      ? sellingPrice > 0
        ? 100
        : 0
      : roundMoney((marginEtb / totalCost) * 100);

  return { marginEtb, marginPercent };
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function decimalToNumber(
  value: { toString(): string } | number | string,
): number {
  return toNumber(value);
}
