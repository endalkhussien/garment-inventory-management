import { z } from "zod";

export const initiateShopSchema = z
  .object({
    name: z.string().trim().min(1, "Shop name is required"),
    code: z
      .string()
      .trim()
      .min(1, "Code is required")
      .max(20, "Code is too long")
      .regex(/^[A-Za-z0-9_-]+$/, "Code: letters, numbers, - or _ only"),
    address: z.string().trim().optional().nullable(),
    createManager: z.boolean().default(false),
    managerName: z.string().trim().optional().nullable(),
    managerEmail: z
      .union([z.literal(""), z.string().trim().email("Invalid email")])
      .optional()
      .nullable(),
    managerPassword: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!data.createManager) return;
    if (!data.managerName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Manager name is required",
        path: ["managerName"],
      });
    }
    if (!data.managerEmail?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Manager email is required",
        path: ["managerEmail"],
      });
    }
    if (!data.managerPassword || data.managerPassword.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password must be at least 6 characters",
        path: ["managerPassword"],
      });
    }
  });

export const updateShopSchema = z.object({
  name: z.string().trim().min(1, "Shop name is required"),
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/, "Code: letters, numbers, - or _ only"),
  address: z.string().trim().optional().nullable(),
});

export type InitiateShopInput = z.infer<typeof initiateShopSchema>;
export type UpdateShopInput = z.infer<typeof updateShopSchema>;
