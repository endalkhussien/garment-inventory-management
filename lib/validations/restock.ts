import { z } from "zod";

const positiveInt = z
  .number({ error: "Enter a valid quantity" })
  .int("Quantity must be a whole number")
  .positive("Quantity must be greater than 0");

export const manualRestockSchema = z.object({
  branchId: z.string().min(1, "Shop is required"),
  variantId: z.string().min(1, "Product is required"),
  quantity: positiveInt,
  note: z.string().trim().optional().nullable(),
});

export const importRestockLineSchema = z.object({
  code: z.string().trim().min(1, "Code is required"),
  quantity: positiveInt,
});

export const importRestockSchema = z.object({
  branchId: z.string().min(1, "Shop is required"),
  lines: z
    .array(importRestockLineSchema)
    .min(1, "Add at least one product line"),
  note: z.string().trim().optional().nullable(),
});

export type ManualRestockInput = z.infer<typeof manualRestockSchema>;
export type ImportRestockInput = z.infer<typeof importRestockSchema>;
