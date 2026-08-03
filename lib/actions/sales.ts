"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
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

async function adjustFinishedGoods(
  tx: Prisma.TransactionClient,
  variantId: string,
  branchId: string,
  delta: number,
  defaultReorderAt = 5,
) {
  const existing = await tx.finishedGoodsStock.findUnique({
    where: { variantId_branchId: { variantId, branchId } },
  });
  const next = (existing?.quantity ?? 0) + delta;
  if (next < 0) {
    throw new Error(
      `Not enough shop stock. Available: ${existing?.quantity ?? 0}`,
    );
  }
  if (existing) {
    await tx.finishedGoodsStock.update({
      where: { id: existing.id },
      data: { quantity: next },
    });
  } else if (delta > 0) {
    await tx.finishedGoodsStock.create({
      data: {
        variantId,
        branchId,
        quantity: next,
        reorderAt: defaultReorderAt,
      },
    });
  } else {
    throw new Error("No stock at this location.");
  }
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
      await adjustFinishedGoods(
        tx,
        data.variantId,
        data.fromBranchId,
        -data.quantity,
        settings.defaultFinishedGoodsReorderAt,
      );
      await adjustFinishedGoods(
        tx,
        data.variantId,
        data.toBranchId,
        data.quantity,
        settings.defaultFinishedGoodsReorderAt,
      );

      return tx.stockTransfer.create({
        data: {
          variantId: data.variantId,
          fromBranchId: data.fromBranchId,
          toBranchId: data.toBranchId,
          quantity: data.quantity,
          note: emptyToNull(data.note),
          transferredById: session?.user?.id ?? null,
        },
      });
    });

    revalidatePath("/shops/stock");
    revalidatePath("/shops/transfers");
    return { success: true, id: transfer.id };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Transfer failed. No stock was moved.",
    };
  }
}

export async function createSale(input: SaleInput): Promise<ActionResult> {
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const session = await getServerSession(authOptions);
  const data = { ...parsed.data };

  if (session?.user?.role?.name === "Shop") {
    if (!session.user.branch?.id) {
      return { success: false, error: "Shop user has no branch assigned." };
    }
    data.branchId = session.user.branch.id;
  }

  const lineTotal = data.quantity * data.unitPrice;

  try {
    const sale = await prisma.$transaction(async (tx) => {
      await adjustFinishedGoods(
        tx,
        data.variantId,
        data.branchId,
        -data.quantity,
      );

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
      return tx.sale.create({
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
    });

    if (lineTotal >= 10000) {
      await createNotificationForAdmins({
        title: "Large sale recorded",
        body: `${sale.receiptNumber} · ETB ${lineTotal.toLocaleString("en-ET")}`,
        href: `/sales/${sale.id}`,
      });
    }

    revalidatePath("/sales");
    revalidatePath("/shops/stock");
    revalidatePath("/");
    return { success: true, id: sale.id };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Sale failed. Stock was not changed.",
    };
  }
}

export async function createReturn(input: ReturnInput): Promise<ActionResult> {
  const parsed = returnSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
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

      for (const item of original.items) {
        await adjustFinishedGoods(
          tx,
          item.variantId,
          original.branchId,
          item.quantity,
          settings.defaultFinishedGoodsReorderAt,
        );
      }

      const receiptNumber = await nextReceiptNumber(tx);
      return tx.sale.create({
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
    });

    revalidatePath("/sales");
    revalidatePath(`/sales/${parsed.data.saleId}`);
    revalidatePath("/shops/stock");
    return { success: true, id: result.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Return failed.",
    };
  }
}
