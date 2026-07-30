"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  appSettingsSchema,
  type AppSettingsInput,
} from "@/lib/validations/settings";

export type ActionResult = {
  success: boolean;
  error?: string;
};

export async function updateAppSettings(
  input: AppSettingsInput,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = appSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const data = parsed.data;

  try {
    await prisma.appSetting.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        companyName: data.companyName,
        companyTagline: data.companyTagline?.trim() || "Ethiopia",
        currencyCode: data.currencyCode,
        locale: data.locale,
        largeStockOutThreshold: new Prisma.Decimal(data.largeStockOutThreshold),
        requirePriceOverrideApproval: data.requirePriceOverrideApproval,
        defaultOverheadPercent: new Prisma.Decimal(data.defaultOverheadPercent),
        defaultMarginPercent: new Prisma.Decimal(data.defaultMarginPercent),
        defaultFinishedGoodsReorderAt: data.defaultFinishedGoodsReorderAt,
        payrollDaysPerMonth: data.payrollDaysPerMonth,
      },
      update: {
        companyName: data.companyName,
        companyTagline: data.companyTagline?.trim() || "Ethiopia",
        currencyCode: data.currencyCode,
        locale: data.locale,
        largeStockOutThreshold: new Prisma.Decimal(data.largeStockOutThreshold),
        requirePriceOverrideApproval: data.requirePriceOverrideApproval,
        defaultOverheadPercent: new Prisma.Decimal(data.defaultOverheadPercent),
        defaultMarginPercent: new Prisma.Decimal(data.defaultMarginPercent),
        defaultFinishedGoodsReorderAt: data.defaultFinishedGoodsReorderAt,
        payrollDaysPerMonth: data.payrollDaysPerMonth,
      },
    });

    revalidatePath("/", "layout");
    revalidatePath("/setup/settings");
    revalidatePath("/login");
    return { success: true };
  } catch (error) {
    console.error("[settings] update failed:", error);
    return { success: false, error: "Could not save settings." };
  }
}
