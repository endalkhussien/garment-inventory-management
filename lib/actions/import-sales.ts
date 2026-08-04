"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { adjustFinishedGoodsWithMovement } from "@/lib/finished-goods-stock";
import { prisma } from "@/lib/prisma";
import { isAdminRole, isShopRole } from "@/lib/rbac";
import {
  importSalesSchema,
  type ImportSalesInput,
} from "@/lib/validations/import-sales";

export type ActionResult = {
  success: boolean;
  error?: string;
  imported?: number;
  skipped?: string[];
  totalRevenue?: number;
};

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

/**
 * Import sales from external POS / spreadsheet.
 * Deducts shop stock and records revenue for finance & insights.
 */
export async function importExternalSales(
  input: ImportSalesInput,
): Promise<ActionResult> {
  const parsed = importSalesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const resolved = await resolveBranch(parsed.data.branchId);
  if (resolved.error) return { success: false, error: resolved.error };

  const skipped: string[] = [];
  let imported = 0;
  let totalRevenue = 0;
  const batchNote = emptyToNull(parsed.data.note);

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

      for (const line of parsed.data.lines) {
        const match = await findVariantByCode(line.code);
        if (!match) {
          skipped.push(line.code);
          continue;
        }

        const unitPrice =
          line.unitPrice != null && line.unitPrice > 0
            ? line.unitPrice
            : Number(match.variant.sellingPrice.toString());
        const lineTotal = unitPrice * line.quantity;
        const soldAt = line.soldAt
          ? new Date(line.soldAt)
          : new Date();
        if (Number.isNaN(soldAt.getTime())) {
          skipped.push(`${line.code} (bad date)`);
          continue;
        }

        const receiptNumber = await nextImportReceipt(
          tx,
          line.externalReceipt,
        );

        const sale = await tx.sale.create({
          data: {
            receiptNumber,
            branchId: resolved.branchId,
            customerId: walkIn.id,
            subtotal: new Prisma.Decimal(lineTotal),
            total: new Prisma.Decimal(lineTotal),
            soldById: resolved.userId,
            createdAt: soldAt,
            items: {
              create: {
                variantId: match.variant.id,
                quantity: line.quantity,
                unitPrice: new Prisma.Decimal(unitPrice),
                lineTotal: new Prisma.Decimal(lineTotal),
              },
            },
            payments: {
              create: {
                method: line.paymentMethod ?? "CASH",
                amount: new Prisma.Decimal(lineTotal),
              },
            },
          },
        });

        await adjustFinishedGoodsWithMovement(tx, {
          variantId: match.variant.id,
          branchId: resolved.branchId,
          delta: -line.quantity,
          type: "SALE",
          note:
            batchNote ??
            `External POS import · ${receiptNumber}`,
          referenceType: "Sale",
          referenceId: sale.id,
          createdById: resolved.userId,
        });

        imported += 1;
        totalRevenue += lineTotal;
      }

      if (imported === 0) {
        throw new Error(
          skipped.length
            ? `No matching products for: ${skipped.slice(0, 8).join(", ")}`
            : "Nothing to import.",
        );
      }
    });

    revalidatePath("/shops/sales");
    revalidatePath("/shops/stock");
    revalidatePath("/shops/finance");
    revalidatePath("/central");
    revalidatePath("/");
    return { success: true, imported, skipped, totalRevenue };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Import failed. No sales were saved.",
      skipped,
    };
  }
}
