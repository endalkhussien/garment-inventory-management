import { z } from "zod";

const nonNeg = z.coerce.number().min(0, "Must be 0 or greater");
const positiveInt = z.coerce.number().int().min(1, "Must be at least 1");

export const appSettingsSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required").max(80),
  companyTagline: z.string().trim().max(80).optional().nullable(),
  currencyCode: z
    .string()
    .trim()
    .min(2, "Currency code required")
    .max(8)
    .transform((v) => v.toUpperCase()),
  locale: z.string().trim().min(2, "Locale required").max(16),
  largeStockOutThreshold: nonNeg,
  requirePriceOverrideApproval: z.boolean(),
  defaultOverheadPercent: nonNeg,
  defaultMarginPercent: nonNeg,
  defaultFinishedGoodsReorderAt: positiveInt,
  payrollDaysPerMonth: z.coerce.number().int().min(1).max(31),
});

export type AppSettingsInput = z.infer<typeof appSettingsSchema>;
