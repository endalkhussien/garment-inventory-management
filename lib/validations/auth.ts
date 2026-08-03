import { z } from "zod";

/** Login username: letters, numbers, . _ -  (3–32 chars) */
export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username is too long")
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "Username: letters, numbers, . _ - only (no spaces)",
  )
  .transform((v) => v.toLowerCase());

export const loginSchema = z.object({
  login: z
    .string()
    .trim()
    .min(1, "Username or email is required")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const updateMyProfileSchema = z.object({
  name: z.string().trim().min(1, "Display name is required"),
  username: usernameSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateMyProfileInput = z.infer<typeof updateMyProfileSchema>;
