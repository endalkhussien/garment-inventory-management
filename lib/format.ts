export function formatEtb(value: number | string): string {
  const amount = typeof value === "string" ? Number(value) : value;

  if (Number.isNaN(amount)) {
    return "ETB 0.00";
  }

  return `ETB ${amount.toLocaleString("en-ET", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatQuantity(value: number | string, unit?: string): string {
  const amount = typeof value === "string" ? Number(value) : value;

  if (Number.isNaN(amount)) {
    return unit ? `0 ${unit}` : "0";
  }

  const formatted = amount.toLocaleString("en-ET", {
    maximumFractionDigits: 3,
  });

  return unit ? `${formatted} ${unit}` : formatted;
}

export function toNumber(value: { toString(): string } | number | string): number {
  if (typeof value === "number") return value;
  return Number(value.toString());
}
