"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { recordActionResult } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";
import { isAdminRole, isShopRole } from "@/lib/rbac";
import {
  shopStaffSchema,
  type ShopStaffInput,
} from "@/lib/validations/shop-staff";

export type ActionResult = {
  success: boolean;
  error?: string;
  id?: string;
};

function emptyToNull(value?: string | null) {
  if (!value || value.trim() === "") return null;
  return value;
}

function commissionFields(data: {
  commissionMode: "PER_PIECE" | "PERCENT_OF_REVENUE";
  pieceRatePerUnit?: number;
  commissionPercent?: number;
}) {
  return {
    commissionMode: data.commissionMode,
    pieceRatePerUnit: new Prisma.Decimal(
      data.commissionMode === "PER_PIECE" ? (data.pieceRatePerUnit ?? 0) : 0,
    ),
    commissionPercent: new Prisma.Decimal(
      data.commissionMode === "PERCENT_OF_REVENUE"
        ? (data.commissionPercent ?? 0)
        : 0,
    ),
  };
}

async function resolveShopBranch(requestedBranchId?: string | null) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { branchId: "", error: "Not signed in." };
  }
  const role = session.user.role?.name;

  if (isShopRole(role)) {
    const id = session.user.branch?.id;
    if (!id) return { branchId: "", error: "No shop assigned to your account." };
    return { branchId: id };
  }

  if (!isAdminRole(role)) {
    return { branchId: "", error: "Not allowed." };
  }

  if (!requestedBranchId) {
    return { branchId: "", error: "Shop is required." };
  }
  return { branchId: requestedBranchId };
}

export async function createShopStaff(
  input: ShopStaffInput & { branchId?: string },
): Promise<ActionResult> {
  const parsed = shopStaffSchema.safeParse(input);
  if (!parsed.success) {
    return recordActionResult(
      { success: false, error: parsed.error.issues[0]?.message },
      { action: "CREATE", entityType: "Staff", title: "Add staff" },
    );
  }

  const resolved = await resolveShopBranch(input.branchId);
  if (resolved.error) {
    return recordActionResult(
      { success: false, error: resolved.error },
      { action: "CREATE", entityType: "Staff", title: "Add staff" },
    );
  }

  try {
    const staff = await prisma.employee.create({
      data: {
        name: parsed.data.name.trim(),
        jobTitle: emptyToNull(parsed.data.jobTitle),
        phone: emptyToNull(parsed.data.phone),
        code: emptyToNull(parsed.data.code),
        monthlyBaseSalary: new Prisma.Decimal(parsed.data.monthlyBaseSalary),
        ...commissionFields(parsed.data),
        branchId: resolved.branchId,
        isActive: true,
        hireDate: new Date(),
      },
    });
    revalidatePath("/shops/staff");
    revalidatePath("/shops/finance");
    revalidatePath("/central");
    return recordActionResult(
      { success: true, id: staff.id },
      {
        action: "CREATE",
        entityType: "Staff",
        entityId: staff.id,
        title: `Staff added · ${staff.name}`,
        successMessage: staff.jobTitle
          ? `${staff.name} · ${staff.jobTitle}`
          : staff.name,
        href: `/shops/staff/${staff.id}`,
        branchId: resolved.branchId,
      },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return recordActionResult(
        { success: false, error: "Staff code already exists." },
        {
          action: "CREATE",
          entityType: "Staff",
          title: "Add staff",
          branchId: resolved.branchId,
        },
      );
    }
    return recordActionResult(
      { success: false, error: "Could not save staff." },
      {
        action: "CREATE",
        entityType: "Staff",
        title: "Add staff",
        branchId: resolved.branchId,
      },
    );
  }
}

export async function updateShopStaff(
  id: string,
  input: ShopStaffInput,
): Promise<ActionResult> {
  const parsed = shopStaffSchema.safeParse(input);
  if (!parsed.success) {
    return recordActionResult(
      { success: false, error: parsed.error.issues[0]?.message },
      {
        action: "UPDATE",
        entityType: "Staff",
        entityId: id,
        title: "Update staff",
      },
    );
  }

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing?.branchId) {
    return recordActionResult(
      { success: false, error: "Staff not found." },
      {
        action: "UPDATE",
        entityType: "Staff",
        entityId: id,
        title: "Update staff",
      },
    );
  }

  const resolved = await resolveShopBranch(existing.branchId);
  if (resolved.error) {
    return recordActionResult(
      { success: false, error: resolved.error },
      {
        action: "UPDATE",
        entityType: "Staff",
        entityId: id,
        title: "Update staff",
        branchId: existing.branchId,
      },
    );
  }
  if (resolved.branchId !== existing.branchId) {
    return recordActionResult(
      { success: false, error: "Not allowed for this shop." },
      {
        action: "UPDATE",
        entityType: "Staff",
        entityId: id,
        title: "Update staff",
        branchId: existing.branchId,
      },
    );
  }

  try {
    await prisma.employee.update({
      where: { id },
      data: {
        name: parsed.data.name.trim(),
        jobTitle: emptyToNull(parsed.data.jobTitle),
        phone: emptyToNull(parsed.data.phone),
        code: emptyToNull(parsed.data.code),
        monthlyBaseSalary: new Prisma.Decimal(parsed.data.monthlyBaseSalary),
        ...commissionFields(parsed.data),
      },
    });
    revalidatePath("/shops/staff");
    revalidatePath("/shops/finance");
    return recordActionResult(
      { success: true, id },
      {
        action: "UPDATE",
        entityType: "Staff",
        entityId: id,
        title: `Staff updated · ${parsed.data.name.trim()}`,
        successMessage: "Staff details saved",
        href: `/shops/staff/${id}`,
        branchId: existing.branchId,
      },
    );
  } catch {
    return recordActionResult(
      { success: false, error: "Could not update staff." },
      {
        action: "UPDATE",
        entityType: "Staff",
        entityId: id,
        title: "Update staff",
        branchId: existing.branchId,
      },
    );
  }
}

export async function setShopStaffActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing?.branchId) {
    return recordActionResult(
      { success: false, error: "Staff not found." },
      {
        action: isActive ? "ACTIVATE" : "DEACTIVATE",
        entityType: "Staff",
        entityId: id,
        title: isActive ? "Activate staff" : "Deactivate staff",
      },
    );
  }

  const resolved = await resolveShopBranch(existing.branchId);
  if (resolved.error) {
    return recordActionResult(
      { success: false, error: resolved.error },
      {
        action: isActive ? "ACTIVATE" : "DEACTIVATE",
        entityType: "Staff",
        entityId: id,
        title: isActive ? "Activate staff" : "Deactivate staff",
        branchId: existing.branchId,
      },
    );
  }
  if (resolved.branchId !== existing.branchId) {
    return recordActionResult(
      { success: false, error: "Not allowed." },
      {
        action: isActive ? "ACTIVATE" : "DEACTIVATE",
        entityType: "Staff",
        entityId: id,
        title: isActive ? "Activate staff" : "Deactivate staff",
        branchId: existing.branchId,
      },
    );
  }

  await prisma.employee.update({
    where: { id },
    data: { isActive },
  });
  revalidatePath("/shops/staff");
  return recordActionResult(
    { success: true, id },
    {
      action: isActive ? "ACTIVATE" : "DEACTIVATE",
      entityType: "Staff",
      entityId: id,
      title: isActive
        ? `Staff activated · ${existing.name}`
        : `Staff deactivated · ${existing.name}`,
      successMessage: `${existing.name} is now ${isActive ? "active" : "inactive"}`,
      href: `/shops/staff/${id}`,
      branchId: existing.branchId,
    },
  );
}
