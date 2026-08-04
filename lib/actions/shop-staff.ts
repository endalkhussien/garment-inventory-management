"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
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

/** Map commission % onto pieceRatePerUnit (shop retail interpretation). */
function commissionToDb(commissionPercent: number) {
  return new Prisma.Decimal(commissionPercent);
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
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const resolved = await resolveShopBranch(input.branchId);
  if (resolved.error) return { success: false, error: resolved.error };

  try {
    const staff = await prisma.employee.create({
      data: {
        name: parsed.data.name.trim(),
        jobTitle: emptyToNull(parsed.data.jobTitle),
        phone: emptyToNull(parsed.data.phone),
        code: emptyToNull(parsed.data.code),
        monthlyBaseSalary: new Prisma.Decimal(parsed.data.monthlyBaseSalary),
        // Stores commission % of sales for shop staff
        pieceRatePerUnit: commissionToDb(parsed.data.commissionPercent),
        branchId: resolved.branchId,
        isActive: true,
        hireDate: new Date(),
      },
    });
    revalidatePath("/shops/staff");
    revalidatePath("/shops/finance");
    revalidatePath("/central");
    return { success: true, id: staff.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Staff code already exists." };
    }
    return { success: false, error: "Could not save staff." };
  }
}

export async function updateShopStaff(
  id: string,
  input: ShopStaffInput,
): Promise<ActionResult> {
  const parsed = shopStaffSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing?.branchId) {
    return { success: false, error: "Staff not found." };
  }

  const resolved = await resolveShopBranch(existing.branchId);
  if (resolved.error) return { success: false, error: resolved.error };
  if (resolved.branchId !== existing.branchId) {
    return { success: false, error: "Not allowed for this shop." };
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
        pieceRatePerUnit: commissionToDb(parsed.data.commissionPercent),
      },
    });
    revalidatePath("/shops/staff");
    revalidatePath("/shops/finance");
    return { success: true, id };
  } catch {
    return { success: false, error: "Could not update staff." };
  }
}

export async function setShopStaffActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing?.branchId) {
    return { success: false, error: "Staff not found." };
  }

  const resolved = await resolveShopBranch(existing.branchId);
  if (resolved.error) return { success: false, error: resolved.error };
  if (resolved.branchId !== existing.branchId) {
    return { success: false, error: "Not allowed." };
  }

  await prisma.employee.update({
    where: { id },
    data: { isActive },
  });
  revalidatePath("/shops/staff");
  return { success: true, id };
}
