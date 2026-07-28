import { z } from "zod";

export const STOCK_REASON_CODES = [
  "PURCHASE",
  "PRODUCTION_USE",
  "ADJUSTMENT",
  "DAMAGE",
  "RETURN",
  "TRANSFER",
  "OTHER",
] as const;

export const ASSET_CONDITIONS = [
  "NEW",
  "GOOD",
  "FAIR",
  "POOR",
  "RETIRED",
] as const;

const nonNegativeNumber = z
  .number({ error: "Enter a valid number" })
  .min(0, "Must be 0 or greater");

const positiveNumber = z
  .number({ error: "Enter a valid number" })
  .positive("Quantity must be greater than 0");

export const rawMaterialSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  categoryId: z.string().min(1, "Category is required"),
  unitOfMeasure: z.string().trim().min(1, "Unit of measure is required"),
  supplierId: z.string().optional().nullable(),
  costPerUnit: nonNegativeNumber,
  reorderThreshold: nonNegativeNumber,
  quantity: nonNegativeNumber.optional(),
  location: z.string().trim().optional().nullable(),
  branchId: z.string().optional().nullable(),
});

export const capitalAssetSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  typeId: z.string().optional().nullable(),
  typeName: z.string().trim().min(1, "Type is required"),
  serialNumber: z.string().trim().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  purchaseCost: nonNegativeNumber,
  condition: z.enum(ASSET_CONDITIONS),
  location: z.string().trim().optional().nullable(),
  branchId: z.string().optional().nullable(),
});

export const stockMovementSchema = z.object({
  rawMaterialId: z.string().min(1, "Raw material is required"),
  type: z.enum(["IN", "OUT"]),
  quantity: positiveNumber,
  reasonCode: z.enum(STOCK_REASON_CODES, {
    message: "Reason code is required",
  }),
  note: z.string().trim().optional().nullable(),
});

export type RawMaterialInput = z.infer<typeof rawMaterialSchema>;
export type CapitalAssetInput = z.infer<typeof capitalAssetSchema>;
export type StockMovementInput = z.infer<typeof stockMovementSchema>;

export const reasonCodeLabels: Record<(typeof STOCK_REASON_CODES)[number], string> =
  {
    PURCHASE: "Purchase",
    PRODUCTION_USE: "Production use",
    ADJUSTMENT: "Adjustment",
    DAMAGE: "Damage / wastage",
    RETURN: "Return",
    TRANSFER: "Transfer",
    OTHER: "Other",
  };

export const conditionLabels: Record<(typeof ASSET_CONDITIONS)[number], string> =
  {
    NEW: "New",
    GOOD: "Good",
    FAIR: "Fair",
    POOR: "Poor",
    RETIRED: "Retired",
  };
