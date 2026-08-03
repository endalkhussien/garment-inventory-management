"use server";

import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import {
  createUserSchema,
  emailFromUsername,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserPayload,
} from "@/lib/validations/users";

export type ActionResult = {
  success: boolean;
  error?: string;
  id?: string;
};

function emptyToNull(value?: string | null) {
  if (!value || value.trim() === "" || value === "__none__") return null;
  return value;
}

export async function createUser(input: CreateUserInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const role = await prisma.role.findUnique({
    where: { id: parsed.data.roleId },
  });
  if (!role) return { success: false, error: "Role not found." };

  const branchId = emptyToNull(parsed.data.branchId);
  if (role.name === "Shop" && !branchId) {
    return {
      success: false,
      error: "Shop users must be assigned to a shop branch.",
    };
  }

  const username = parsed.data.username;
  const email =
    parsed.data.email && parsed.data.email.trim() !== ""
      ? parsed.data.email.trim().toLowerCase()
      : emailFromUsername(username);

  try {
    const passwordHash = await hash(parsed.data.password, 12);
    const created = await prisma.user.create({
      data: {
        name: parsed.data.name,
        username,
        email,
        passwordHash,
        roleId: role.id,
        branchId,
        isActive: true,
      },
    });
    revalidatePath("/users");
    revalidatePath("/setup/shops");
    return { success: true, id: created.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = (error.meta?.target as string[] | undefined)?.join(" ") ?? "";
      if (target.includes("username")) {
        return { success: false, error: "Username already taken." };
      }
      return { success: false, error: "Email already exists." };
    }
    return { success: false, error: "Could not create user." };
  }
}

export async function updateUser(
  id: string,
  input: UpdateUserPayload,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateUserSchema.safeParse({
    ...input,
    isActive: input.isActive ? "true" : "false",
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const role = await prisma.role.findUnique({
    where: { id: parsed.data.roleId },
  });
  if (!role) return { success: false, error: "Role not found." };

  const branchId = emptyToNull(parsed.data.branchId);
  if (role.name === "Shop" && !branchId) {
    return {
      success: false,
      error: "Shop users must be assigned to a shop branch.",
    };
  }

  const isActive = parsed.data.isActive === "true";

  try {
    const data: Prisma.UserUpdateInput = {
      name: parsed.data.name,
      username: parsed.data.username,
      role: { connect: { id: role.id } },
      isActive,
      branch: branchId
        ? { connect: { id: branchId } }
        : { disconnect: true },
    };

    if (parsed.data.password && parsed.data.password.length >= 6) {
      data.passwordHash = await hash(parsed.data.password, 12);
    }

    await prisma.user.update({ where: { id }, data });
    revalidatePath("/users");
    revalidatePath(`/users/${id}`);
    return { success: true, id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Username already taken." };
    }
    return { success: false, error: "User not found." };
  }
}
