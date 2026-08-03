import { z } from "zod";

const positiveNumber = z
  .number({ error: "Enter a valid number" })
  .positive("Must be greater than 0");

const nonNegativeNumber = z
  .number({ error: "Enter a valid number" })
  .min(0, "Must be 0 or greater");

export const receiveLotSchema = z.object({
  rawMaterialId: z.string().min(1, "Material is required"),
  lotCode: z.string().trim().min(1, "Batch / dye lot is required"),
  rollNumber: z.string().trim().optional().nullable(),
  shade: z.string().trim().optional().nullable(),
  quantity: positiveNumber,
  location: z.string().trim().optional().nullable(),
  branchId: z.string().optional().nullable(),
  defects: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const leftoverReturnSchema = z.object({
  productionOrderId: z.string().min(1),
  rawMaterialId: z.string().min(1, "Material is required"),
  quantity: positiveNumber,
  lotCode: z.string().trim().min(1, "Batch / dye lot is required"),
  rollNumber: z.string().trim().optional().nullable(),
  shade: z.string().trim().optional().nullable(),
  location: z.string().trim().optional().nullable(),
  defects: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const createStocktakeSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  note: z.string().trim().optional().nullable(),
  rawMaterialIds: z
    .array(z.string().min(1))
    .min(1, "Select at least one material"),
});

export const stocktakeCountsSchema = z.object({
  sessionId: z.string().min(1),
  lines: z
    .array(
      z.object({
        lineId: z.string().min(1),
        countedQty: nonNegativeNumber,
        note: z.string().trim().optional().nullable(),
      }),
    )
    .min(1),
});

export type ReceiveLotInput = z.infer<typeof receiveLotSchema>;
export type LeftoverReturnInput = z.infer<typeof leftoverReturnSchema>;
export type CreateStocktakeInput = z.infer<typeof createStocktakeSchema>;
export type StocktakeCountsInput = z.infer<typeof stocktakeCountsSchema>;
