"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { recordActionResult } from "@/lib/activity-log";
import { adjustFinishedGoodsWithMovement } from "@/lib/finished-goods-stock";
import { prisma } from "@/lib/prisma";
import { isAdminRole, isShopRole } from "@/lib/rbac";
import {
  importSalesSchema,
  type ImportSaleLineInput,
  type ImportSalesInput,
} from "@/lib/validations/import-sales";
import { PAYMENT_METHODS } from "@/lib/validations/sales";

export type ActionResult = {
  success: boolean;
  error?: string;
  /** Number of Sale records created. */
  imported?: number;
  /** Number of product lines imported across all sales. */
  lineCount?: number;
  skipped?: string[];
  totalRevenue?: number;
};

type PaymentMethod = (typeof PAYMENT_METHODS)[number];

function emptyToNull(value?: string | null) {
  if (!value || value.trim() === "") return null;
  return value;
}

async function resolveBranch(requestedBranchId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { branchId: "", error: "Not signed in.", userId: null as string | null };
  }
  const role = session.user.role?.name;
  if (isShopRole(role)) {
    const shopBranchId = session.user.branch?.id;
    if (!shopBranchId) {
      return { branchId: "", error: "Shop user has no branch.", userId: session.user.id };
    }
    return { branchId: shopBranchId, userId: session.user.id };
  }
  if (!isAdminRole(role)) {
    return { branchId: "", error: "Not allowed.", userId: session.user.id };
  }
  return { branchId: requestedBranchId, userId: session.user.id };
}

async function findVariantByCode(code: string) {
  const normalized = code.trim();
  const byProductCode = await prisma.product.findFirst({
    where: {
      isActive: true,
      code: { equals: normalized, mode: "insensitive" },
    },
    include: {
      variants: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });
  if (byProductCode?.variants[0]) {
    return {
      variant: byProductCode.variants[0],
      productCode: byProductCode.code ?? byProductCode.variants[0].sku,
    };
  }

  const bySku = await prisma.productVariant.findFirst({
    where: {
      isActive: true,
      sku: { equals: normalized, mode: "insensitive" },
    },
  });
  if (bySku) {
    return { variant: bySku, productCode: bySku.sku };
  }
  return null;
}

async function nextImportReceipt(
  tx: Prisma.TransactionClient,
  external?: string | null,
) {
  if (external && external.trim()) {
    const tagged = `EXT-${external.trim()}`;
    const exists = await tx.sale.findUnique({
      where: { receiptNumber: tagged },
    });
    if (!exists) return tagged;
    return `${tagged}-${Date.now().toString(36)}`;
  }
  const count = await tx.sale.count();
  return `IMP-${String(count + 1).padStart(6, "0")}`;
}

type ResolvedItem = {
  code: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  soldAt: Date;
  paymentMethod: PaymentMethod;
  externalReceipt: string | null;
};

type SaleGroup = {
  externalReceipt: string | null;
  items: ResolvedItem[];
  soldAt: Date;
  paymentMethod: PaymentMethod;
  subtotal: number;
};

function parseSoldAt(raw?: string | null): Date | null {
  if (!raw || !raw.trim()) return new Date();
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Group resolved lines: same non-empty externalReceipt → one multi-item sale.
 * Lines without receipt → each becomes its own sale.
 */
function groupIntoSales(items: ResolvedItem[]): SaleGroup[] {
  const grouped = new Map<string, ResolvedItem[]>();
  const singles: ResolvedItem[] = [];

  for (const item of items) {
    const key = item.externalReceipt?.trim();
    if (key) {
      const list = grouped.get(key) ?? [];
      list.push(item);
      grouped.set(key, list);
    } else {
      singles.push(item);
    }
  }

  const groups: SaleGroup[] = [];

  for (const [receipt, lines] of Array.from(grouped.entries())) {
    const soldAt = lines.reduce(
      (earliest, line) =>
        line.soldAt.getTime() < earliest.getTime() ? line.soldAt : earliest,
      lines[0]!.soldAt,
    );
    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    groups.push({
      externalReceipt: receipt,
      items: lines,
      soldAt,
      paymentMethod: lines[0]!.paymentMethod,
      subtotal,
    });
  }

  for (const line of singles) {
    groups.push({
      externalReceipt: null,
      items: [line],
      soldAt: line.soldAt,
      paymentMethod: line.paymentMethod,
      subtotal: line.lineTotal,
    });
  }

  return groups;
}

/**
 * Import sales from external POS / spreadsheet.
 * Lines sharing the same receipt become one multi-item Sale.
 * Deducts shop stock and records revenue. Transaction is all-or-nothing.
 */
export async function importExternalSales(
  input: ImportSalesInput,
): Promise<ActionResult> {
  const parsed = importSalesSchema.safeParse(input);
  if (!parsed.success) {
    return recordActionResult(
      { success: false, error: parsed.error.issues[0]?.message },
      { action: "IMPORT", entityType: "Sale", title: "Bulk sales import" },
    );
  }

  const resolved = await resolveBranch(parsed.data.branchId);
  if (resolved.error) {
    return recordActionResult(
      { success: false, error: resolved.error },
      {
        action: "IMPORT",
        entityType: "Sale",
        title: "Bulk sales import",
        branchId: parsed.data.branchId,
      },
    );
  }

  const skipped: string[] = [];
  const batchNote = emptyToNull(parsed.data.note);

  // Resolve variants outside the txn (reads only)
  const resolvedItems: ResolvedItem[] = [];
  for (const line of parsed.data.lines as ImportSaleLineInput[]) {
    const match = await findVariantByCode(line.code);
    if (!match) {
      skipped.push(line.code);
      continue;
    }

    const soldAt = parseSoldAt(line.soldAt);
    if (!soldAt) {
      skipped.push(`${line.code} (bad date)`);
      continue;
    }

    const unitPrice =
      line.unitPrice != null && line.unitPrice > 0
        ? line.unitPrice
        : Number(match.variant.sellingPrice.toString());
    const lineTotal = unitPrice * line.quantity;

    resolvedItems.push({
      code: line.code,
      variantId: match.variant.id,
      quantity: line.quantity,
      unitPrice,
      lineTotal,
      soldAt,
      paymentMethod: (line.paymentMethod ?? "CASH") as PaymentMethod,
      externalReceipt: emptyToNull(line.externalReceipt),
    });
  }

  if (resolvedItems.length === 0) {
    return recordActionResult(
      {
        success: false,
        error: skipped.length
          ? `No matching products for: ${skipped.slice(0, 8).join(", ")}`
          : "Nothing to import.",
        skipped,
      },
      {
        action: "IMPORT",
        entityType: "Sale",
        title: "Bulk sales import",
        branchId: resolved.branchId,
      },
    );
  }
  const saleGroups = groupIntoSales(resolvedItems);
  let imported = 0;
  let lineCount = 0;
  let totalRevenue = 0;

  try {
    await prisma.$transaction(async (tx) => {
      const walkIn = await tx.customer.upsert({
        where: { id: "seed-customer-walkin" },
        update: {},
        create: {
          id: "seed-customer-walkin",
          name: "Walk-in customer",
          isWalkIn: true,
        },
      });

      for (const group of saleGroups) {
        const receiptNumber = await nextImportReceipt(
          tx,
          group.externalReceipt,
        );

        const sale = await tx.sale.create({
          data: {
            receiptNumber,
            branchId: resolved.branchId,
            customerId: walkIn.id,
            subtotal: new Prisma.Decimal(group.subtotal),
            total: new Prisma.Decimal(group.subtotal),
            soldById: resolved.userId,
            createdAt: group.soldAt,
            items: {
              create: group.items.map((item) => ({
                variantId: item.variantId,
                quantity: item.quantity,
                unitPrice: new Prisma.Decimal(item.unitPrice),
                lineTotal: new Prisma.Decimal(item.lineTotal),
              })),
            },
            payments: {
              create: {
                method: group.paymentMethod,
                amount: new Prisma.Decimal(group.subtotal),
              },
            },
          },
        });

        for (const item of group.items) {
          await adjustFinishedGoodsWithMovement(tx, {
            variantId: item.variantId,
            branchId: resolved.branchId,
            delta: -item.quantity,
            type: "SALE",
            note: batchNote ?? `External POS import · ${receiptNumber}`,
            referenceType: "Sale",
            referenceId: sale.id,
            createdById: resolved.userId,
          });
        }

        imported += 1;
        lineCount += group.items.length;
        totalRevenue += group.subtotal;
      }

      if (imported === 0) {
        throw new Error("Nothing to import.");
      }
    });

    revalidatePath("/shops/sales");
    revalidatePath("/sales");
    revalidatePath("/shops/stock");
    revalidatePath("/shops/finance");
    revalidatePath("/central");
    revalidatePath("/");
    return recordActionResult(
      {
        success: true,
        imported,
        lineCount,
        skipped,
        totalRevenue,
      },
      {
        action: "IMPORT",
        entityType: "Sale",
        title: `Bulk sales · ${imported} sale(s)`,
        successMessage: `${lineCount} line(s) · revenue ETB ${totalRevenue.toLocaleString("en-ET", { minimumFractionDigits: 2 })}${
          skipped.length
            ? ` · skipped ${skipped.length}`
            : ""
        }`,
        branchId: resolved.branchId,
        href: "/shops/sales",
        userId: resolved.userId,
        metadata: { imported, lineCount, totalRevenue, skipped },
      },
    );
  } catch (error) {
    return recordActionResult(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Import failed. No sales were saved.",
        skipped,
      },
      {
        action: "IMPORT",
        entityType: "Sale",
        title: "Bulk sales import",
        branchId: resolved.branchId,
        userId: resolved.userId,
      },
    );
  }
}
