import type { ShopCommissionMode } from "@prisma/client";

import { formatEtb, toNumber } from "@/lib/format";

export type ShopSalesTotals = {
  unitsSold: number;
  revenue: number;
};

export type ShopCommissionInput = {
  commissionMode: ShopCommissionMode | string;
  /** ETB per unit sold when mode is PER_PIECE */
  pieceRatePerUnit: number | { toString(): string };
  /** Percent of revenue when mode is PERCENT_OF_REVENUE */
  commissionPercent: number | { toString(): string };
};

/**
 * Shop commission for a period.
 *
 * Assumption: sales are not attributed to individual employees
 * (`Sale.soldById` is the logged-in User, not Employee). Commission uses
 * **branch-level** units sold and/or revenue for the shop where the staff
 * member is assigned. Each staff member's rate is applied to the full shop
 * total for that period (not split across the roster).
 *
 * - PER_PIECE: unitsSold × etbPerPiece
 * - PERCENT_OF_REVENUE: revenue × percent / 100
 */
export function computeShopCommission(
  staff: ShopCommissionInput,
  sales: ShopSalesTotals,
): number {
  const mode = staff.commissionMode;
  if (mode === "PER_PIECE") {
    return (
      Math.round(sales.unitsSold * toNumber(staff.pieceRatePerUnit) * 100) / 100
    );
  }
  return (
    Math.round(
      ((sales.revenue * toNumber(staff.commissionPercent)) / 100) * 100,
    ) / 100
  );
}

/** Short rate label for tables/KPIs (e.g. "ETB 2.50/pc" or "3%"). */
export function formatCommissionRate(staff: ShopCommissionInput): string {
  if (staff.commissionMode === "PER_PIECE") {
    const rate = toNumber(staff.pieceRatePerUnit);
    return `${formatEtb(rate)}/pc`;
  }
  const pct = toNumber(staff.commissionPercent);
  return `${pct.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}
