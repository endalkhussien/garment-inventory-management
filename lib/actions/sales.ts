"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { recordActionResult } from "@/lib/activity-log";
import { adjustFinishedGoodsWithMovement } from "@/lib/finished-goods-stock";
import { createNotificationForAdmins } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { getAppSettings } from "@/lib/settings";
import {
  returnSchema,
  saleSchema,
  transferSchema,
  type ReturnInput,
  type SaleInput,
  type TransferInput,
} from "@/lib/validations/sales";

export type ActionResult = {
  success: boolean;
  error?: string;
  id?: string;
};

function emptyToNull(value?: string | null) {
  if (!value || value.trim() === "" || value === "__none__") return null;
  return value;
}

async function nextReceiptNumber(tx: Prisma.TransactionClient) {
  const count = await tx.sale.count();
  return `RCP-${String(count + 1).padStart(6, "0")}`;
}

export async function transferFinishedGoods(
  input: TransferInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = transferSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const session = await getServerSession(authOptions);
  const data = parsed.data;
  const settings = await getAppSettings();

  try {
    const transfer = await prisma.$transaction(async (tx) => {
      const created = await tx.stockTransfer.create({
        data: {
          variantId: data.variantId,
          fromBranchId: data.fromBranchId,
          toBranchId: data.toBranchId,
          quantity: data.quantity,
          note: emptyToNull(data.note),
          transferredById: session?.user?.id ?? null,
        },
      });

      await adjustFinishedGoodsWithMovement(tx, {
        variantId: data.variantId,
        branchId: data.fromBranchId,
        delta: -data.quantity,
        type: "TRANSFER_OUT",
        note: emptyToNull(data.note) ?? "Transfer out",
        referenceType: "StockTransfer",
        referenceId: created.id,
        createdById: session?.user?.id ?? null,
        defaultReorderAt: settings.defaultFinishedGoodsReorderAt,
      });
      await adjustFinishedGoodsWithMovement(tx, {
        variantId: data.variantId,
        branchId: data.toBranchId,
        delta: data.quantity,
        type: "TRANSFER_IN",
        note: emptyToNull(data.note) ?? "Transfer in",
        referenceType: "StockTransfer",
        referenceId: created.id,
        createdById: session?.user?.id ?? null,
        defaultReorderAt: settings.defaultFinishedGoodsReorderAt,
      });

      return created;
    });

    revalidatePath("/shops/stock");
    revalidatePath("/shops/transfers");
    revalidatePath("/central");
    return recordActionResult(
      { success: true, id: transfer.id },
      {
        action: "TRANSFER",
        entityType: "Transfer",
        entityId: transfer.id,
        title: `Stock transfer · ${data.quantity} unit(s)`,
        successMessage: `Moved ${data.quantity} unit(s) between shops`,
        branchId: data.toBranchId,
      },
    );
  } catch (error) {
    return recordActionResult(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Transfer failed. No stock was moved.",
      },
      {
        action: "TRANSFER",
        entityType: "Transfer",
        title: "Stock transfer",
        branchId: data.toBranchId,
      },
    );
  }
}

export async function createSale(input: SaleInput): Promise<ActionResult> {
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) {
    return recordActionResult(
      { success: false, error: parsed.error.issues[0]?.message },
      { action: "SALE", entityType: "Sale", title: "Direct sale" },
    );
  }

  const session = await getServerSession(authOptions);
  const data = { ...parsed.data };

  if (session?.user?.role?.name === "Shop") {
    if (!session.user.branch?.id) {
      return recordActionResult(
        { success: false, error: "Shop user has no branch assigned." },
        { action: "SALE", entityType: "Sale", title: "Direct sale" },
      );
    }
    data.branchId = session.user.branch.id;
  }

  const lineTotal = data.quantity * data.unitPrice;

  try {
    const sale = await prisma.$transaction(async (tx) => {
      let customerId: string | null = null;
      const customerName = emptyToNull(data.customerName);
      if (customerName) {
        const customer = await tx.customer.create({
          data: { name: customerName },
        });
        customerId = customer.id;
      } else {
        const walkIn = await tx.customer.upsert({
          where: { id: "seed-customer-walkin" },
          update: {},
          create: {
            id: "seed-customer-walkin",
            name: "Walk-in customer",
            isWalkIn: true,
          },
        });
        customerId = walkIn.id;
      }

      const receiptNumber = await nextReceiptNumber(tx);
      const created = await tx.sale.create({
        data: {
          receiptNumber,
          branchId: data.branchId,
          customerId,
          subtotal: new Prisma.Decimal(lineTotal),
          total: new Prisma.Decimal(lineTotal),
          soldById: session?.user?.id ?? null,
          items: {
            create: {
              variantId: data.variantId,
              quantity: data.quantity,
              unitPrice: new Prisma.Decimal(data.unitPrice),
              lineTotal: new Prisma.Decimal(lineTotal),
            },
          },
          payments: {
            create: {
              method: data.paymentMethod,
              amount: new Prisma.Decimal(lineTotal),
            },
          },
        },
      });

      await adjustFinishedGoodsWithMovement(tx, {
        variantId: data.variantId,
        branchId: data.branchId,
        delta: -data.quantity,
        type: "SALE",
        note: receiptNumber,
        referenceType: "Sale",
        referenceId: created.id,
        createdById: session?.user?.id ?? null,
      });

      return created;
    });

    if (lineTotal >= 10000) {
      await createNotificationForAdmins({
        title: "Large sale recorded",
        body: `${sale.receiptNumber} · ETB ${lineTotal.toLocaleString("en-ET")}`,
        href: `/sales/${sale.id}`,
      });
    }

    revalidatePath("/sales");
    revalidatePath("/shops/sales");
    revalidatePath("/shops/stock");
    revalidatePath("/shops/finance");
    revalidatePath("/central");
    revalidatePath("/");
    return recordActionResult(
      { success: true, id: sale.id },
      {
        action: "SALE",
        entityType: "Sale",
        entityId: sale.id,
        title: `Sale · ${sale.receiptNumber}`,
        successMessage: `${data.quantity} unit(s) · ETB ${lineTotal.toLocaleString("en-ET", { minimumFractionDigits: 2 })}`,
        href: `/sales/${sale.id}`,
        branchId: data.branchId,
        userId: session?.user?.id,
      },
    );
  } catch (error) {
    return recordActionResult(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Sale failed. Stock was not changed.",
      },
      {
        action: "SALE",
        entityType: "Sale",
        title: "Direct sale",
        branchId: data.branchId,
      },
    );
  }
}

export async function createReturn(input: ReturnInput): Promise<ActionResult> {
  const parsed = returnSchema.safeParse(input);
  if (!parsed.success) {
    return recordActionResult(
      { success: false, error: parsed.error.issues[0]?.message },
      { action: "RETURN", entityType: "Sale", title: "Sale return" },
    );
  }

  const session = await getServerSession(authOptions);
  const settings = await getAppSettings();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const original = await tx.sale.findUnique({
        where: { id: parsed.data.saleId },
        include: { items: true, payments: true },
      });
      if (!original || original.isReturn) {
        throw new Error("Original sale not found.");
      }

      const receiptNumber = await nextReceiptNumber(tx);
      const created = await tx.sale.create({
        data: {
          receiptNumber,
          branchId: original.branchId,
          customerId: original.customerId,
          subtotal: original.subtotal.mul(-1),
          total: original.total.mul(-1),
          isReturn: true,
          returnReason: parsed.data.reason,
          originalSaleId: original.id,
          soldById: session?.user?.id ?? null,
          items: {
            create: original.items.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal.mul(-1),
            })),
          },
          payments: {
            create: original.payments.map((p) => ({
              method: p.method,
              amount: p.amount.mul(-1),
            })),
          },
        },
      });

      for (const item of original.items) {
        await adjustFinishedGoodsWithMovement(tx, {
          variantId: item.variantId,
          branchId: original.branchId,
          delta: item.quantity,
          type: "RETURN",
          note: parsed.data.reason,
          referenceType: "Sale",
          referenceId: created.id,
          createdById: session?.user?.id ?? null,
          defaultReorderAt: settings.defaultFinishedGoodsReorderAt,
        });
      }

      return { created, original };
    });

    revalidatePath("/sales");
    revalidatePath(`/sales/${parsed.data.saleId}`);
    revalidatePath("/shops/stock");
    revalidatePath("/shops/finance");
    revalidatePath("/central");
    return recordActionResult(
      { success: true, id: result.created.id },
      {
        action: "RETURN",
        entityType: "Sale",
        entityId: result.created.id,
        title: `Return · ${result.created.receiptNumber}`,
        successMessage: `Return of ${result.original.receiptNumber}${parsed.data.reason ? ` · ${parsed.data.reason}` : ""}`,
        href: `/sales/${result.created.id}`,
        branchId: result.original.branchId,
      },
    );
  } catch (error) {
    return recordActionResult(
      {
        success: false,
        error: error instanceof Error ? error.message : "Return failed.",
      },
      {
        action: "RETURN",
        entityType: "Sale",
        entityId: parsed.data.saleId,
        title: "Sale return",
      },
    );
  }
}
