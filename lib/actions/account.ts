"use server";

import { compare, hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import {
  changePasswordSchema,
  updateMyProfileSchema,
  type ChangePasswordInput,
  type UpdateMyProfileInput,
} from "@/lib/validations/auth";

export type ActionResult = {
  success: boolean;
  error?: string;
};

export async function changeMyPassword(
  input: ChangePasswordInput,
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) return { success: false, error: "User not found." };

  const ok = await compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return { success: false, error: "Current password is wrong." };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hash(parsed.data.newPassword, 12) },
  });

  revalidatePath("/account");
  return { success: true };
}

export async function updateMyProfile(
  input: UpdateMyProfileInput,
): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = updateMyProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: parsed.data.name,
        username: parsed.data.username,
      },
    });
    revalidatePath("/account");
    return { success: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "That username is already taken." };
    }
    return { success: false, error: "Could not update profile." };
  }
}
