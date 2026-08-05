import { z } from "zod";

const nonNegativeNumber = z
  .number({ error: "Enter a valid number" })
  .min(0, "Must be 0 or greater");

const positiveQuantity = z
  .number({ error: "Enter a valid number" })
  .positive("Quantity must be greater than 0");

/** Optional size/color on the form — empty becomes a neutral default in the action. */
const optionalAttr = z.string().trim().optional().nullable();

export const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  code: z.string().trim().min(1, "Code is required"),
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().trim().optional().nullable(),
  garmentInfo: z.string().trim().optional().nullable(),
});

/** Admin create: buy + sell. */
export const productWithVariantSchema = productSchema.extend({
  size: optionalAttr,
  color: optionalAttr,
  sku: z.string().trim().optional().nullable(),
  buyingPrice: nonNegativeNumber,
  sellingPrice: nonNegativeNumber,
});

/** Shop create: sell only (admin sets buy later). */
export const shopProductWithVariantSchema = productSchema.extend({
  size: optionalAttr,
  color: optionalAttr,
  sku: z.string().trim().optional().nullable(),
  sellingPrice: nonNegativeNumber,
});

export const variantSchema = z.object({
  size: optionalAttr,
  color: optionalAttr,
  sku: z.string().trim().min(1, "SKU is required"),
  buyingPrice: nonNegativeNumber,
  sellingPrice: nonNegativeNumber,
});

export const shopVariantSchema = z.object({
  size: optionalAttr,
  color: optionalAttr,
  sku: z.string().trim().min(1, "SKU is required"),
  sellingPrice: nonNegativeNumber,
});

export const bomLineSchema = z.object({
  rawMaterialId: z.string().min(1, "Raw material is required"),
  quantityPerUnit: positiveQuantity,
});

export const pricingSchema = z
  .object({
    mode: z.enum(["margin", "manual"]),
    marginPercent: nonNegativeNumber.optional(),
    sellingPrice: nonNegativeNumber.optional(),
    buyingPrice: nonNegativeNumber.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "margin" && data.marginPercent === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Margin % is required",
        path: ["marginPercent"],
      });
    }
    if (data.mode === "manual" && data.sellingPrice === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Selling price is required",
        path: ["sellingPrice"],
      });
    }
  });

/** Normalize empty size/color for DB unique constraint. */
export function normalizeVariantAttr(value?: string | null) {
  const t = value?.trim();
  return t && t.length > 0 ? t : "—";
}

export type ProductInput = z.infer<typeof productSchema>;
export type ProductWithVariantInput = z.infer<typeof productWithVariantSchema>;
export type ShopProductWithVariantInput = z.infer<
  typeof shopProductWithVariantSchema
>;
export type VariantInput = z.infer<typeof variantSchema>;
export type ShopVariantInput = z.infer<typeof shopVariantSchema>;
export type BomLineInput = z.infer<typeof bomLineSchema>;
export type PricingInput = z.infer<typeof pricingSchema>;
