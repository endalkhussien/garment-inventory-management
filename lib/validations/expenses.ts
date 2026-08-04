import { z } from "zod";

export const expenseCategories = [
  "RENT",
  "UTILITIES",
  "SALARIES",
  "TRANSPORT",
  "MARKETING",
  "PACKAGING",
  "MAINTENANCE",
  "SUPPLIES",
  "OTHER",
] as const;

export const expenseCategoryLabels: Record<
  (typeof expenseCategories)[number],
  string
> = {
  RENT: "Rent",
  UTILITIES: "Utilities",
  SALARIES: "Salaries",
  TRANSPORT: "Transport",
  MARKETING: "Marketing",
  PACKAGING: "Packaging",
  MAINTENANCE: "Maintenance",
  SUPPLIES: "Supplies",
  OTHER: "Other",
};

export const expenseSchema = z.object({
  branchId: z.string().min(1, "Shop is required"),
  category: z.enum(expenseCategories),
  title: z.string().trim().min(1, "Title is required"),
  amount: z
    .number({ error: "Enter a valid amount" })
    .positive("Amount must be greater than 0"),
  expenseDate: z.string().min(1, "Date is required"),
  note: z.string().trim().optional().nullable(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
