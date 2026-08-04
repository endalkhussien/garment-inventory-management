import { z } from "zod";

import { PAYMENT_METHODS } from "@/lib/validations/sales";

const positiveInt = z
  .number({ error: "Enter a valid quantity" })
  .int()
  .positive();

export const importSaleLineSchema = z.object({
  code: z.string().trim().min(1, "Code is required"),
  quantity: positiveInt,
  unitPrice: z
    .number({ error: "Enter a valid price" })
    .min(0)
    .optional()
    .nullable(),
  soldAt: z.string().trim().optional().nullable(),
  externalReceipt: z.string().trim().optional().nullable(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
});

export const importSalesSchema = z.object({
  branchId: z.string().min(1, "Shop is required"),
  note: z.string().trim().optional().nullable(),
  lines: z
    .array(importSaleLineSchema)
    .min(1, "Add at least one sale line"),
});

export type ImportSaleLineInput = z.infer<typeof importSaleLineSchema>;
export type ImportSalesInput = z.infer<typeof importSalesSchema>;
