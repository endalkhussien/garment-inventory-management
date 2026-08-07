import { z } from "zod";

import { usernameSchema } from "@/lib/validations/auth";

/** Shared password rules for create + reset. */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Za-z]/, "Include a letter")
  .regex(/[0-9]/, "Include a number");

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  username: usernameSchema,
  email: z
    .union([z.literal(""), z.string().trim().email("Valid email is required")])
    .optional(),
  password: passwordSchema,
  roleId: z.string().min(1, "Select a role"),
  branchId: z.string().optional().nullable(),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    username: usernameSchema,
    roleId: z.string().min(1, "Select a role"),
    branchId: z.string().optional().nullable(),
    isActive: z.enum(["true", "false"]),
    password: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const pwd = data.password?.trim() ?? "";
    if (pwd.length === 0) return;
    const parsed = passwordSchema.safeParse(pwd);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({
          code: "custom",
          message: issue.message,
          path: ["password"],
        });
      }
    }
  });

/** Create a Shop-role login for a specific shop (admin only). */
export const shopLoginSchema = z.object({
  branchId: z.string().min(1, "Shop is required"),
  name: z.string().trim().min(1, "Display name is required"),
  username: usernameSchema,
  password: passwordSchema,
});

/** Update shop login identity / password (admin only). */
export const updateShopLoginSchema = z
  .object({
    name: z.string().trim().min(1, "Display name is required"),
    username: usernameSchema,
    isActive: z.enum(["true", "false"]),
    password: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const pwd = data.password?.trim() ?? "";
    if (pwd.length === 0) return;
    const parsed = passwordSchema.safeParse(pwd);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({
          code: "custom",
          message: issue.message,
          path: ["password"],
        });
      }
    }
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserPayload = Omit<UpdateUserInput, "isActive"> & {
  isActive: boolean;
};
export type ShopLoginInput = z.infer<typeof shopLoginSchema>;
export type UpdateShopLoginInput = z.infer<typeof updateShopLoginSchema>;
export type UpdateShopLoginPayload = Omit<UpdateShopLoginInput, "isActive"> & {
  isActive: boolean;
};

/** Internal email when admin only sets a username. */
export function emailFromUsername(username: string) {
  return `${username.toLowerCase()}@users.local`;
}
