import { z } from "zod";

import { usernameSchema } from "@/lib/validations/auth";

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
    createLogin: z.boolean().default(false),
    staffName: z.string().trim().optional().nullable(),
    username: z.string().trim().optional().nullable(),
    password: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!data.createLogin) return;
    if (!data.staffName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Staff name is required",
        path: ["staffName"],
      });
    }
    const userParsed = usernameSchema.safeParse(data.username ?? "");
    if (!userParsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: userParsed.error.issues[0]?.message ?? "Invalid username",
        path: ["username"],
      });
    }
    if (!data.password || data.password.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password must be at least 8 characters",
        path: ["password"],
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
