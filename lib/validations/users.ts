import { z } from "zod";

import { usernameSchema } from "@/lib/validations/auth";

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  username: usernameSchema,
  email: z
    .union([z.literal(""), z.string().trim().email("Valid email is required")])
    .optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Include a letter")
    .regex(/[0-9]/, "Include a number"),
  roleId: z.string().min(1, "Select a role"),
  branchId: z.string().optional().nullable(),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  username: usernameSchema,
  roleId: z.string().min(1, "Select a role"),
  branchId: z.string().optional().nullable(),
  isActive: z.enum(["true", "false"]),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional()
    .or(z.literal("")),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserPayload = Omit<UpdateUserInput, "isActive"> & {
  isActive: boolean;
};

/** Internal email when admin only sets a username. */
export function emailFromUsername(username: string) {
  return `${username.toLowerCase()}@users.local`;
}
