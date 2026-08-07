"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { recordActionResult } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";
import { isAdminRole, isShopRole } from "@/lib/rbac";
import {
  expenseSchema,
  type ExpenseInput,
} from "@/lib/validations/expenses";

export type ActionResult = {
  success: boolean;
  error?: string;
  id?: string;
};

function emptyToNull(value?: string | null) {
  if (!value || value.trim() === "") return null;
  return value;
}

async function resolveExpenseBranch(requestedBranchId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { branchId: "", error: "Not signed in.", userId: null as string | null };
  }

  const role = session.user.role?.name;

  if (isShopRole(role)) {
    const shopBranchId = session.user.branch?.id;
    if (!shopBranchId) {
      return {
        branchId: "",
        error: "Shop user has no branch assigned.",
        userId: session.user.id,
      };
    }
    return { branchId: shopBranchId, userId: session.user.id };
  }

  if (!isAdminRole(role)) {
    return { branchId: "", error: "Not allowed.", userId: session.user.id };
  }

  return { branchId: requestedBranchId, userId: session.user.id };
}

export async function createExpense(
  input: ExpenseInput,
): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const resolved = await resolveExpenseBranch(parsed.data.branchId);
  if (resolved.error) return { success: false, error: resolved.error };

  try {
    const expense = await prisma.expense.create({
      data: {
        branchId: resolved.branchId,
        category: parsed.data.category,
        title: parsed.data.title,
        amount: new Prisma.Decimal(parsed.data.amount),
        expenseDate: new Date(parsed.data.expenseDate),
        note: emptyToNull(parsed.data.note),
        createdById: resolved.userId,
      },
    });

    revalidatePath("/shops/finance");
    revalidatePath("/central");
    revalidatePath("/");
    return recordActionResult(
      { success: true, id: expense.id },
      {
        action: "CREATE",
        entityType: "Expense",
        entityId: expense.id,
        title: `Expense · ${parsed.data.title}`,
        successMessage: `${parsed.data.category} · ETB ${Number(parsed.data.amount).toLocaleString("en-ET", { minimumFractionDigits: 2 })}`,
        branchId: resolved.branchId,
        href: "/shops/finance",
      },
    );
  } catch {
    return recordActionResult(
      { success: false, error: "Could not save expense." },
      {
        action: "CREATE",
        entityType: "Expense",
        title: "Create expense",
        branchId: resolved.branchId,
      },
    );
  }
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { success: false, error: "Not signed in." };
  }

  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) {
    return { success: false, error: "Expense not found." };
  }

  if (isShopRole(session.user.role?.name)) {
    if (session.user.branch?.id !== expense.branchId) {
      return { success: false, error: "Not allowed." };
    }
  } else if (!isAdminRole(session.user.role?.name)) {
    return { success: false, error: "Not allowed." };
  }

  try {
    await prisma.expense.delete({ where: { id } });
    revalidatePath("/shops/finance");
    revalidatePath("/central");
    return { success: true, id };
  } catch {
    return { success: false, error: "Could not delete expense." };
  }
}
