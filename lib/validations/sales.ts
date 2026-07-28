import { z } from "zod";

export const PAYMENT_METHODS = ["CASH", "MOBILE_MONEY", "BANK_TRANSFER"] as const;

export const transferSchema = z.object({
  variantId: z.string().min(1, "Select a product"),
  fromBranchId: z.string().min(1, "From branch required"),
  toBranchId: z.string().min(1, "To branch required"),
  quantity: z.number().int().positive("Quantity must be greater than 0"),
  note: z.string().trim().optional().nullable(),
}).refine((d) => d.fromBranchId !== d.toBranchId, {
  message: "From and to branch must be different",
  path: ["toBranchId"],
});

export const saleSchema = z.object({
  branchId: z.string().min(1, "Select shop / branch"),
  variantId: z.string().min(1, "Select a product"),
  quantity: z.number().int().positive(),
  unitPrice: z.number().min(0),
  paymentMethod: z.enum(PAYMENT_METHODS),
  customerName: z.string().trim().optional().nullable(),
});

export const returnSchema = z.object({
  saleId: z.string().min(1),
  reason: z.string().trim().min(1, "Return reason is required"),
});

export type TransferInput = z.infer<typeof transferSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type ReturnInput = z.infer<typeof returnSchema>;

export const paymentMethodLabels: Record<(typeof PAYMENT_METHODS)[number], string> = {
  CASH: "Cash",
  MOBILE_MONEY: "Mobile money",
  BANK_TRANSFER: "Bank transfer",
};
