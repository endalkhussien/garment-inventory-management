import { cache } from "react";
import { Prisma } from "@prisma/client";

import { setMoneyConfig } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export type AppSettings = {
  companyName: string;
  companyTagline: string;
  currencyCode: string;
  locale: string;
  largeStockOutThreshold: number;
  requirePriceOverrideApproval: boolean;
  defaultOverheadPercent: number;
  defaultMarginPercent: number;
  defaultFinishedGoodsReorderAt: number;
  payrollDaysPerMonth: number;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  companyName: "Esset Inventory",
  companyTagline: "Ethiopia",
  currencyCode: "ETB",
  locale: "en-ET",
  largeStockOutThreshold: 50,
  requirePriceOverrideApproval: false,
  defaultOverheadPercent: 10,
  defaultMarginPercent: 30,
  defaultFinishedGoodsReorderAt: 5,
  payrollDaysPerMonth: 30,
};

function mapRow(row: {
  companyName: string;
  companyTagline: string;
  currencyCode: string;
  locale: string;
  largeStockOutThreshold: Prisma.Decimal | { toString(): string };
  requirePriceOverrideApproval: boolean;
  defaultOverheadPercent: Prisma.Decimal | { toString(): string };
  defaultMarginPercent: Prisma.Decimal | { toString(): string };
  defaultFinishedGoodsReorderAt: number;
  payrollDaysPerMonth: number;
}): AppSettings {
  return {
    companyName: row.companyName,
    companyTagline: row.companyTagline,
    currencyCode: row.currencyCode,
    locale: row.locale,
    largeStockOutThreshold: Number(row.largeStockOutThreshold.toString()),
    requirePriceOverrideApproval: row.requirePriceOverrideApproval,
    defaultOverheadPercent: Number(row.defaultOverheadPercent.toString()),
    defaultMarginPercent: Number(row.defaultMarginPercent.toString()),
    defaultFinishedGoodsReorderAt: row.defaultFinishedGoodsReorderAt,
    payrollDaysPerMonth: row.payrollDaysPerMonth,
  };
}

/** Cached per request — also applies money format defaults for formatEtb. */
export const getAppSettings = cache(async (): Promise<AppSettings> => {
  try {
    const row = await prisma.appSetting.upsert({
      where: { id: "default" },
      update: {},
      create: {
        id: "default",
        companyName: DEFAULT_APP_SETTINGS.companyName,
        companyTagline: DEFAULT_APP_SETTINGS.companyTagline,
        currencyCode: DEFAULT_APP_SETTINGS.currencyCode,
        locale: DEFAULT_APP_SETTINGS.locale,
        largeStockOutThreshold: new Prisma.Decimal(
          DEFAULT_APP_SETTINGS.largeStockOutThreshold,
        ),
        requirePriceOverrideApproval:
          DEFAULT_APP_SETTINGS.requirePriceOverrideApproval,
        defaultOverheadPercent: new Prisma.Decimal(
          DEFAULT_APP_SETTINGS.defaultOverheadPercent,
        ),
        defaultMarginPercent: new Prisma.Decimal(
          DEFAULT_APP_SETTINGS.defaultMarginPercent,
        ),
        defaultFinishedGoodsReorderAt:
          DEFAULT_APP_SETTINGS.defaultFinishedGoodsReorderAt,
        payrollDaysPerMonth: DEFAULT_APP_SETTINGS.payrollDaysPerMonth,
      },
    });

    const settings = mapRow(row);
    setMoneyConfig({
      currency: settings.currencyCode,
      locale: settings.locale,
    });
    return settings;
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
});
