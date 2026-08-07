"use server";

import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { recordActionResult } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import {
  createUserSchema,
  emailFromUsername,
  shopLoginSchema,
  updateShopLoginSchema,
  updateUserSchema,
  type CreateUserInput,
  type ShopLoginInput,
  type UpdateShopLoginPayload,
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

function revalidateUserPaths(userId?: string, branchId?: string | null) {
  revalidatePath("/users");
  revalidatePath("/setup/shops");
  revalidatePath("/activity");
  if (userId) revalidatePath(`/users/${userId}`);
  if (branchId) revalidatePath(`/setup/shops/${branchId}`);
}

async function countActiveAdmins(excludeUserId?: string) {
  return prisma.user.count({
    where: {
      isActive: true,
      role: { name: "Admin" },
      ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
    },
  });
}

async function getUserWithRole(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { role: true, branch: true },
  });
}

/** Admin role accounts are protected from deletion; last active admin cannot be demoted/disabled. */
async function protectAdminAccount(
  target: {
    id: string;
    role: { name: string };
    isActive: boolean;
  },
  ops: {
    delete?: boolean;
    deactivate?: boolean;
    changeRoleAwayFromAdmin?: boolean;
  },
): Promise<string | null> {
  const isAdminRole = target.role.name === "Admin";
  if (!isAdminRole) return null;

  if (ops.delete) {
    return "Admin accounts cannot be deleted. Deactivate other admins carefully, or change password instead.";
  }

  if (ops.deactivate || ops.changeRoleAwayFromAdmin) {
    const remaining = await countActiveAdmins(target.id);
    if (remaining === 0) {
      return "Cannot remove or deactivate the last active Admin account.";
    }
  }

  return null;
}

export async function createUser(input: CreateUserInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return recordActionResult(
      { success: false, error: parsed.error.issues[0]?.message },
      { action: "CREATE", entityType: "User", title: "Create user" },
    );
  }

  const role = await prisma.role.findUnique({
    where: { id: parsed.data.roleId },
  });
  if (!role) {
    return recordActionResult(
      { success: false, error: "Role not found." },
      { action: "CREATE", entityType: "User", title: "Create user" },
    );
  }

  const branchId = emptyToNull(parsed.data.branchId);
  if (role.name === "Shop" && !branchId) {
    return recordActionResult(
      {
        success: false,
        error: "Shop users must be assigned to a shop branch.",
      },
      { action: "CREATE", entityType: "User", title: "Create user" },
    );
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
        branchId: role.name === "Shop" ? branchId : branchId,
        isActive: true,
      },
    });
    revalidateUserPaths(created.id, branchId);
    return recordActionResult(
      { success: true, id: created.id },
      {
        action: "CREATE",
        entityType: "User",
        entityId: created.id,
        title: `User created · ${username}`,
        successMessage: `${parsed.data.name} · ${role.name}`,
        href: `/users/${created.id}`,
        branchId,
      },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = (error.meta?.target as string[] | undefined)?.join(" ") ?? "";
      if (target.includes("username")) {
        return recordActionResult(
          { success: false, error: "Username already taken." },
          { action: "CREATE", entityType: "User", title: "Create user" },
        );
      }
      return recordActionResult(
        { success: false, error: "Email already exists." },
        { action: "CREATE", entityType: "User", title: "Create user" },
      );
    }
    return recordActionResult(
      { success: false, error: "Could not create user." },
      { action: "CREATE", entityType: "User", title: "Create user" },
    );
  }
}

export async function updateUser(
  id: string,
  input: UpdateUserPayload,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = updateUserSchema.safeParse({
    ...input,
    isActive: input.isActive ? "true" : "false",
  });
  if (!parsed.success) {
    return recordActionResult(
      { success: false, error: parsed.error.issues[0]?.message },
      {
        action: "UPDATE",
        entityType: "User",
        entityId: id,
        title: "Update user",
      },
    );
  }

  const existing = await getUserWithRole(id);
  if (!existing) {
    return recordActionResult(
      { success: false, error: "User not found." },
      {
        action: "UPDATE",
        entityType: "User",
        entityId: id,
        title: "Update user",
      },
    );
  }

  const role = await prisma.role.findUnique({
    where: { id: parsed.data.roleId },
  });
  if (!role) {
    return recordActionResult(
      { success: false, error: "Role not found." },
      {
        action: "UPDATE",
        entityType: "User",
        entityId: id,
        title: "Update user",
      },
    );
  }

  const branchId = emptyToNull(parsed.data.branchId);
  if (role.name === "Shop" && !branchId) {
    return recordActionResult(
      {
        success: false,
        error: "Shop users must be assigned to a shop branch.",
      },
      {
        action: "UPDATE",
        entityType: "User",
        entityId: id,
        title: "Update user",
      },
    );
  }

  const isActive = parsed.data.isActive === "true";
  const changeRoleAwayFromAdmin =
    existing.role.name === "Admin" && role.name !== "Admin";
  const deactivating = existing.isActive && !isActive;

  const guard = await protectAdminAccount(existing, {
    deactivate: deactivating,
    changeRoleAwayFromAdmin,
  });
  if (guard) {
    return recordActionResult(
      { success: false, error: guard },
      {
        action: "UPDATE",
        entityType: "User",
        entityId: id,
        title: `Update user · ${existing.username ?? existing.email}`,
      },
    );
  }

  if (session.user.id === id && !isActive) {
    return recordActionResult(
      { success: false, error: "You cannot deactivate your own account." },
      {
        action: "UPDATE",
        entityType: "User",
        entityId: id,
        title: "Update user",
      },
    );
  }

  try {
    const data: Prisma.UserUpdateInput = {
      name: parsed.data.name,
      username: parsed.data.username,
      role: { connect: { id: role.id } },
      isActive,
      branch:
        role.name === "Shop" && branchId
          ? { connect: { id: branchId } }
          : branchId
            ? { connect: { id: branchId } }
            : { disconnect: true },
    };

    const newPassword = parsed.data.password?.trim() ?? "";
    if (newPassword.length > 0) {
      data.passwordHash = await hash(newPassword, 12);
    }

    await prisma.user.update({ where: { id }, data });
    revalidateUserPaths(id, branchId ?? existing.branchId);
    return recordActionResult(
      { success: true, id },
      {
        action: "UPDATE",
        entityType: "User",
        entityId: id,
        title: `User updated · ${parsed.data.username}`,
        successMessage: newPassword
          ? `${parsed.data.name} saved · password reset`
          : `${parsed.data.name} · ${role.name} saved`,
        href: `/users/${id}`,
        branchId: branchId ?? existing.branchId,
      },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return recordActionResult(
        { success: false, error: "Username already taken." },
        {
          action: "UPDATE",
          entityType: "User",
          entityId: id,
          title: "Update user",
        },
      );
    }
    return recordActionResult(
      { success: false, error: "Could not update user." },
      {
        action: "UPDATE",
        entityType: "User",
        entityId: id,
        title: "Update user",
      },
    );
  }
}

export async function setUserActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const existing = await getUserWithRole(id);
  if (!existing) {
    return recordActionResult(
      { success: false, error: "User not found." },
      {
        action: isActive ? "ACTIVATE" : "DEACTIVATE",
        entityType: "User",
        entityId: id,
        title: isActive ? "Activate user" : "Deactivate user",
      },
    );
  }

  if (session.user.id === id && !isActive) {
    return recordActionResult(
      { success: false, error: "You cannot deactivate your own account." },
      {
        action: "DEACTIVATE",
        entityType: "User",
        entityId: id,
        title: "Deactivate user",
      },
    );
  }

  if (!isActive) {
    const guard = await protectAdminAccount(existing, { deactivate: true });
    if (guard) {
      return recordActionResult(
        { success: false, error: guard },
        {
          action: "DEACTIVATE",
          entityType: "User",
          entityId: id,
          title: `Deactivate · ${existing.username ?? existing.email}`,
        },
      );
    }
  }

  await prisma.user.update({ where: { id }, data: { isActive } });
  revalidateUserPaths(id, existing.branchId);
  return recordActionResult(
    { success: true, id },
    {
      action: isActive ? "ACTIVATE" : "DEACTIVATE",
      entityType: "User",
      entityId: id,
      title: isActive
        ? `User activated · ${existing.username ?? existing.email}`
        : `User deactivated · ${existing.username ?? existing.email}`,
      successMessage: `${existing.name ?? existing.username} is now ${
        isActive ? "active" : "inactive"
      }`,
      href: `/users/${id}`,
      branchId: existing.branchId,
    },
  );
}

/**
 * Delete a non-Admin user permanently.
 * Admin accounts cannot be deleted (use deactivate for other admins if needed).
 */
export async function deleteUser(id: string): Promise<ActionResult> {
  const session = await requireAdmin();
  const existing = await getUserWithRole(id);
  if (!existing) {
    return recordActionResult(
      { success: false, error: "User not found." },
      {
        action: "DELETE",
        entityType: "User",
        entityId: id,
        title: "Delete user",
      },
    );
  }

  if (session.user.id === id) {
    return recordActionResult(
      { success: false, error: "You cannot delete your own account." },
      {
        action: "DELETE",
        entityType: "User",
        entityId: id,
        title: "Delete user",
      },
    );
  }

  const guard = await protectAdminAccount(existing, { delete: true });
  if (guard) {
    return recordActionResult(
      { success: false, error: guard },
      {
        action: "DELETE",
        entityType: "User",
        entityId: id,
        title: `Delete user · ${existing.username ?? existing.email}`,
      },
    );
  }

  try {
    await prisma.user.delete({ where: { id } });
    revalidateUserPaths(undefined, existing.branchId);
    return recordActionResult(
      { success: true, id },
      {
        action: "DELETE",
        entityType: "User",
        entityId: id,
        title: `User deleted · ${existing.username ?? existing.email}`,
        successMessage: `${existing.name ?? existing.username} · ${existing.role.name} removed`,
        branchId: existing.branchId,
      },
    );
  } catch {
    return recordActionResult(
      {
        success: false,
        error:
          "Could not delete user. Deactivate instead if they have linked history.",
      },
      {
        action: "DELETE",
        entityType: "User",
        entityId: id,
        title: "Delete user",
      },
    );
  }
}

/** Admin creates a Shop login tied to a branch. */
export async function createShopLogin(
  input: ShopLoginInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = shopLoginSchema.safeParse(input);
  if (!parsed.success) {
    return recordActionResult(
      { success: false, error: parsed.error.issues[0]?.message },
      { action: "CREATE", entityType: "User", title: "Create shop login" },
    );
  }

  const branch = await prisma.branch.findFirst({
    where: { id: parsed.data.branchId, isShop: true },
  });
  if (!branch) {
    return recordActionResult(
      { success: false, error: "Shop not found." },
      { action: "CREATE", entityType: "User", title: "Create shop login" },
    );
  }

  const shopRole = await prisma.role.findUnique({ where: { name: "Shop" } });
  if (!shopRole) {
    return recordActionResult(
      { success: false, error: "Shop role missing. Run database seed." },
      { action: "CREATE", entityType: "User", title: "Create shop login" },
    );
  }

  try {
    const passwordHash = await hash(parsed.data.password, 12);
    const created = await prisma.user.create({
      data: {
        name: parsed.data.name,
        username: parsed.data.username,
        email: emailFromUsername(parsed.data.username),
        passwordHash,
        roleId: shopRole.id,
        branchId: branch.id,
        isActive: true,
      },
    });
    revalidateUserPaths(created.id, branch.id);
    return recordActionResult(
      { success: true, id: created.id },
      {
        action: "CREATE",
        entityType: "User",
        entityId: created.id,
        title: `Shop login · ${parsed.data.username}`,
        successMessage: `${parsed.data.name} for ${branch.name}`,
        href: `/users/${created.id}`,
        branchId: branch.id,
      },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return recordActionResult(
        { success: false, error: "Username already taken." },
        { action: "CREATE", entityType: "User", title: "Create shop login" },
      );
    }
    return recordActionResult(
      { success: false, error: "Could not create shop login." },
      { action: "CREATE", entityType: "User", title: "Create shop login" },
    );
  }
}

/**
 * Admin updates a shop user's name, username, status, and/or password.
 * Target must be a non-Admin user assigned to a shop (or Shop role).
 */
export async function updateShopLogin(
  userId: string,
  input: UpdateShopLoginPayload,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = updateShopLoginSchema.safeParse({
    ...input,
    isActive: input.isActive ? "true" : "false",
  });
  if (!parsed.success) {
    return recordActionResult(
      { success: false, error: parsed.error.issues[0]?.message },
      {
        action: "UPDATE",
        entityType: "User",
        entityId: userId,
        title: "Update shop login",
      },
    );
  }

  const existing = await getUserWithRole(userId);
  if (!existing) {
    return recordActionResult(
      { success: false, error: "User not found." },
      {
        action: "UPDATE",
        entityType: "User",
        entityId: userId,
        title: "Update shop login",
      },
    );
  }

  if (existing.role.name === "Admin") {
    return recordActionResult(
      {
        success: false,
        error: "Use Users page to manage Admin accounts (cannot use shop login form).",
      },
      {
        action: "UPDATE",
        entityType: "User",
        entityId: userId,
        title: "Update shop login",
      },
    );
  }

  if (!existing.branchId) {
    return recordActionResult(
      {
        success: false,
        error: "This user is not assigned to a shop.",
      },
      {
        action: "UPDATE",
        entityType: "User",
        entityId: userId,
        title: "Update shop login",
      },
    );
  }

  const isActive = parsed.data.isActive === "true";
  try {
    const data: Prisma.UserUpdateInput = {
      name: parsed.data.name,
      username: parsed.data.username,
      isActive,
    };
    const newPassword = parsed.data.password?.trim() ?? "";
    if (newPassword.length > 0) {
      data.passwordHash = await hash(newPassword, 12);
    }

    await prisma.user.update({ where: { id: userId }, data });
    revalidateUserPaths(userId, existing.branchId);
    return recordActionResult(
      { success: true, id: userId },
      {
        action: "UPDATE",
        entityType: "User",
        entityId: userId,
        title: `Shop login updated · ${parsed.data.username}`,
        successMessage: newPassword
          ? `${parsed.data.name} · password reset`
          : `${parsed.data.name} saved`,
        href: `/users/${userId}`,
        branchId: existing.branchId,
      },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return recordActionResult(
        { success: false, error: "Username already taken." },
        {
          action: "UPDATE",
          entityType: "User",
          entityId: userId,
          title: "Update shop login",
        },
      );
    }
    return recordActionResult(
      { success: false, error: "Could not update shop login." },
      {
        action: "UPDATE",
        entityType: "User",
        entityId: userId,
        title: "Update shop login",
      },
    );
  }
}

/** For UI: whether this user is a protected Admin account. */
export async function getUserProtection(id: string) {
  await requireAdmin();
  const user = await getUserWithRole(id);
  if (!user) return { isAdmin: false, canDelete: false };
  const isAdmin = user.role.name === "Admin";
  return {
    isAdmin,
    canDelete: !isAdmin,
    roleName: user.role.name,
  };
}
