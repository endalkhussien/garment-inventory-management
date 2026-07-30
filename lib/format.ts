type MoneyConfig = {
  currency: string;
  locale: string;
};

let moneyConfig: MoneyConfig = {
  currency: "ETB",
  locale: "en-ET",
};

/** Applied by getAppSettings() so formatEtb follows admin currency settings. */
export function setMoneyConfig(config: MoneyConfig) {
  moneyConfig = config;
}

export function getMoneyConfig(): MoneyConfig {
  return moneyConfig;
}

export function formatMoney(
  value: number | string,
  options?: Partial<MoneyConfig>,
): string {
  const amount = typeof value === "string" ? Number(value) : value;
  const currency = options?.currency ?? moneyConfig.currency;
  const locale = options?.locale ?? moneyConfig.locale;

  if (Number.isNaN(amount)) {
    return `${currency} 0.00`;
  }

  return `${currency} ${amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Formats money using current app settings (or ETB default). */
export function formatEtb(value: number | string): string {
  return formatMoney(value);
}

export function formatQuantity(value: number | string, unit?: string): string {
  const amount = typeof value === "string" ? Number(value) : value;
  const locale = moneyConfig.locale;

  if (Number.isNaN(amount)) {
    return unit ? `0 ${unit}` : "0";
  }

  const formatted = amount.toLocaleString(locale, {
    maximumFractionDigits: 3,
  });

  return unit ? `${formatted} ${unit}` : formatted;
}

export function toNumber(value: { toString(): string } | number | string): number {
  if (typeof value === "number") return value;
  return Number(value.toString());
}
