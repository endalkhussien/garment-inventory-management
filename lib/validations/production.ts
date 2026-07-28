import { z } from "zod";

const nonNegInt = z.number({ error: "Enter a valid number" }).int().min(0);
const posInt = z.number({ error: "Enter a valid number" }).int().positive();

export const employeeSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  code: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  branchId: z.string().optional().nullable(),
  hireDate: z.string().optional().nullable(),
  monthlyBaseSalary: z.number({ error: "Enter a valid amount" }).min(0, "Salary cannot be negative"),
  pieceRatePerUnit: z.number({ error: "Enter a valid rate" }).min(0, "Rate cannot be negative"),
});

export const productionOrderSchema = z.object({
  variantId: z.string().min(1, "Select a product variant"),
  quantityTarget: posInt,
  targetDate: z.string().optional().nullable(),
  supervisorId: z.string().optional().nullable(),
  warehouseBranchId: z.string().min(1, "Select warehouse / branch"),
  note: z.string().trim().optional().nullable(),
});

export const outputEntrySchema = z.object({
  productionOrderId: z.string().min(1, "Select a production order"),
  employeeId: z.string().optional().nullable(),
  outputDate: z.string().optional().nullable(),
  quantityGood: nonNegInt,
  quantityRejected: nonNegInt,
  note: z.string().trim().optional().nullable(),
}).refine((d) => d.quantityGood + d.quantityRejected > 0, {
  message: "Enter at least one good or rejected unit",
  path: ["quantityGood"],
});

export const wastageSchema = z.object({
  productionOrderId: z.string().min(1),
  rawMaterialId: z.string().min(1, "Select material"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  note: z.string().trim().optional().nullable(),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
export type ProductionOrderInput = z.infer<typeof productionOrderSchema>;
export type OutputEntryInput = z.infer<typeof outputEntrySchema>;
export type WastageInput = z.infer<typeof wastageSchema>;
