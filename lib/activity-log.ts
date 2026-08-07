import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ActivityStatusValue = "SUCCESS" | "FAILURE";

export type ActivityAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "SALE"
  | "RETURN"
  | "RESTOCK"
  | "IMPORT"
  | "TRANSFER"
  | "EXPORT"
  | "ACTIVATE"
  | "DEACTIVATE"
  | "LOGIN"
  | "OTHER";

export type ActivityEntityType =
  | "Product"
  | "Variant"
  | "Sale"
  | "Stock"
  | "Staff"
  | "Shop"
  | "User"
  | "Expense"
  | "Category"
  | "Settings"
  | "Payroll"
  | "Transfer"
  | "Data"
  | "Account"
  | "System";

export type LogActivityInput = {
  status: ActivityStatusValue;
  action: ActivityAction | string;
  entityType: ActivityEntityType | string;
  entityId?: string | null;
  title: string;
  message: string;
  href?: string | null;
  branchId?: string | null;
  userId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Persist one activity row. Never throws to callers — logging must not break business actions.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    let userId = input.userId ?? null;
    if (userId === undefined || userId === null) {
      try {
        const session = await getServerSession(authOptions);
        userId = session?.user?.id ?? null;
      } catch {
        userId = null;
      }
    }

    await prisma.activityLog.create({
      data: {
        status: input.status,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        title: input.title.slice(0, 200),
        message: input.message.slice(0, 2000),
        href: input.href ?? null,
        branchId: input.branchId ?? null,
        userId,
        metadata:
          input.metadata === undefined
            ? undefined
            : (input.metadata as Prisma.InputJsonValue),
      },
    });
  } catch (error) {
    console.error("[activity-log]", error);
  }
}

export async function logSuccess(
  input: Omit<LogActivityInput, "status">,
): Promise<void> {
  await logActivity({ ...input, status: "SUCCESS" });
}

export async function logFailure(
  input: Omit<LogActivityInput, "status"> & { error?: string | null },
): Promise<void> {
  await logActivity({
    ...input,
    status: "FAILURE",
    message: input.error?.trim()
      ? input.error
      : input.message || "Operation failed",
  });
}

type ActionResultLike = {
  success: boolean;
  error?: string;
  id?: string;
};

/**
 * Log SUCCESS or FAILURE based on an ActionResult and return it unchanged.
 */
export async function recordActionResult<T extends ActionResultLike>(
  result: T,
  ctx: {
    action: ActivityAction | string;
    entityType: ActivityEntityType | string;
    entityId?: string | null;
    title: string;
    successMessage?: string;
    href?: string | null;
    branchId?: string | null;
    userId?: string | null;
    metadata?: Prisma.InputJsonValue;
  },
): Promise<T> {
  if (result.success) {
    await logSuccess({
      action: ctx.action,
      entityType: ctx.entityType,
      entityId: result.id ?? ctx.entityId ?? null,
      title: ctx.title,
      message: ctx.successMessage ?? ctx.title,
      href: ctx.href,
      branchId: ctx.branchId,
      userId: ctx.userId,
      metadata: ctx.metadata,
    });
  } else {
    await logFailure({
      action: ctx.action,
      entityType: ctx.entityType,
      entityId: ctx.entityId ?? result.id ?? null,
      title: `${ctx.title} failed`,
      message: result.error ?? "Operation failed",
      error: result.error,
      href: ctx.href,
      branchId: ctx.branchId,
      userId: ctx.userId,
      metadata: ctx.metadata,
    });
  }
  return result;
}

export const ACTIVITY_ENTITY_LABELS: Record<string, string> = {
  Product: "Product",
  Variant: "Variant",
  Sale: "Sales",
  Stock: "Stock",
  Staff: "Staff",
  Shop: "Shop",
  User: "User",
  Expense: "Expense",
  Category: "Category",
  Settings: "Settings",
  Payroll: "Payroll",
  Transfer: "Transfer",
  Data: "Data",
  Account: "Account",
  System: "System",
};

export const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
  SALE: "Sale",
  RETURN: "Return",
  RESTOCK: "Restock",
  IMPORT: "Import",
  TRANSFER: "Transfer",
  EXPORT: "Export",
  ACTIVATE: "Activated",
  DEACTIVATE: "Deactivated",
  LOGIN: "Login",
  OTHER: "Other",
};
