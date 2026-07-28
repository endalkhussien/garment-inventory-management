import { z } from "zod";

const money = z
  .number({ error: "Enter a valid amount" })
  .min(0, "Amount cannot be negative");

export const payrollRunSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    periodStart: z.string().min(1, "Start date is required"),
    periodEnd: z.string().min(1, "End date is required"),
    note: z.string().trim().optional().nullable(),
  })
  .refine((d) => new Date(d.periodEnd) >= new Date(d.periodStart), {
    message: "End date must be on or after start date",
    path: ["periodEnd"],
  });

export const payrollLineAdjustSchema = z.object({
  lineId: z.string().min(1),
  bonus: money,
  deductions: money,
  note: z.string().trim().optional().nullable(),
});

export type PayrollRunInput = z.infer<typeof payrollRunSchema>;
export type PayrollLineAdjustInput = z.infer<typeof payrollLineAdjustSchema>;
