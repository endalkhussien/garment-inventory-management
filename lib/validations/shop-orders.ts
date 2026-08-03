import { z } from "zod";

export const shopStockOrderLineSchema = z.object({
  variantId: z.string().min(1),
  quantityRequested: z.number().int().positive("Quantity must be at least 1"),
});

export const createShopStockOrderSchema = z.object({
  warehouseBranchId: z.string().min(1, "Select warehouse"),
  note: z.string().trim().optional().nullable(),
  lines: z
    .array(shopStockOrderLineSchema)
    .min(1, "Add at least one product"),
});

export const reviewShopStockOrderSchema = z.object({
  orderId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED", "FULFILL"]),
  reviewNote: z.string().trim().optional().nullable(),
  lines: z
    .array(
      z.object({
        lineId: z.string().min(1),
        quantityApproved: z.number().int().min(0),
      }),
    )
    .optional(),
});

export const updateShopReorderSchema = z.object({
  stockId: z.string().min(1),
  reorderAt: z.number().int().min(0),
});

export type CreateShopStockOrderInput = z.infer<
  typeof createShopStockOrderSchema
>;
export type ReviewShopStockOrderInput = z.infer<
  typeof reviewShopStockOrderSchema
>;
export type UpdateShopReorderInput = z.infer<typeof updateShopReorderSchema>;
