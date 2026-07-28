import { z } from "zod";

export const createUserSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    email: z.string().trim().email("Valid email is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    roleId: z.string().min(1, "Select a role"),
    branchId: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // Shop role must have a branch — enforced in action by role name lookup
    if (data.branchId === "__none__") {
      // normalized later
    }
  });

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  roleId: z.string().min(1, "Select a role"),
  branchId: z.string().optional().nullable(),
  isActive: z.enum(["true", "false"]),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional()
    .or(z.literal("")),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserPayload = Omit<UpdateUserInput, "isActive"> & {
  isActive: boolean;
};
