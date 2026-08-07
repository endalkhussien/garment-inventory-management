import { z } from "zod";

const nonNeg = z
  .number({ error: "Enter a valid number" })
  .min(0, "Must be 0 or greater");

export const shopCommissionModes = ["PER_PIECE", "PERCENT_OF_REVENUE"] as const;

export const shopStaffSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().optional().nullable(),
  jobTitle: z.string().trim().optional().nullable(),
  monthlyBaseSalary: nonNeg,
  commissionMode: z.enum(shopCommissionModes),
  /** ETB per unit sold — used when mode is PER_PIECE */
  pieceRatePerUnit: nonNeg,
  /** % of shop sales revenue — used when mode is PERCENT_OF_REVENUE */
  commissionPercent: nonNeg.max(100, "Commission max 100%"),
  code: z.string().trim().optional().nullable(),
});

export type ShopStaffInput = z.infer<typeof shopStaffSchema>;
