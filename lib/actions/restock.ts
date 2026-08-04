"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { adjustFinishedGoodsWithMovement } from "@/lib/finished-goods-stock";
import { prisma } from "@/lib/prisma";
import { isAdminRole, isShopRole } from "@/lib/rbac";
import { getAppSettings } from "@/lib/settings";
import {
  importRestockSchema,
  manualRestockSchema,
  type ImportRestockInput,
  type ManualRestockInput,
} from "@/lib/validations/restock";

export type ActionResult = {
  success: boolean;
  error?: string;
  id?: string;
  imported?: number;
  skipped?: string[];
};

function emptyToNull(value?: string | null) {
  if (!value || value.trim() === "") return null;
  return value;
}

async function resolveRestockBranch(
  requestedBranchId: string,
): Promise<{ branchId: string; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { branchId: "", error: "Not signed in." };
  }

  const role = session.user.role?.name;

  if (isShopRole(role)) {
    const shopBranchId = session.user.branch?.id;
    if (!shopBranchId) {
      return { branchId: "", error: "Shop user has no branch assigned." };
    }
    return { branchId: shopBranchId };
  }

  if (!isAdminRole(role)) {
    return { branchId: "", error: "Not allowed." };
  }

  return { branchId: requestedBranchId };
}

/** Match product code, variant SKU, or product name (case-insensitive). */
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
  if (byProductCode?.variants[0]) return byProductCode.variants[0];

  const bySku = await prisma.productVariant.findFirst({
    where: {
      isActive: true,
      sku: { equals: normalized, mode: "insensitive" },
    },
  });
  if (bySku) return bySku;

  return null;
}

export async function restockManually(
  input: ManualRestockInput,
): Promise<ActionResult> {
  const parsed = manualRestockSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const session = await getServerSession(authOptions);
  const resolved = await resolveRestockBranch(parsed.data.branchId);
  if (resolved.error) return { success: false, error: resolved.error };

  const settings = await getAppSettings();

  try {
    const variant = await prisma.productVariant.findFirst({
      where: { id: parsed.data.variantId, isActive: true },
    });
    if (!variant) {
      return { success: false, error: "Product not found." };
    }

    await prisma.$transaction(async (tx) => {
      await adjustFinishedGoodsWithMovement(tx, {
        variantId: parsed.data.variantId,
        branchId: resolved.branchId,
        delta: parsed.data.quantity,
        type: "RESTOCK_MANUAL",
        note: emptyToNull(parsed.data.note) ?? "Manual restock",
        createdById: session?.user?.id ?? null,
        defaultReorderAt: settings.defaultFinishedGoodsReorderAt,
      });
    });

    revalidatePath("/shops/stock");
    revalidatePath("/shops/restock");
    revalidatePath("/central");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Restock failed.",
    };
  }
}

export async function restockImport(
  input: ImportRestockInput,
): Promise<ActionResult> {
  const parsed = importRestockSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const session = await getServerSession(authOptions);
  const resolved = await resolveRestockBranch(parsed.data.branchId);
  if (resolved.error) return { success: false, error: resolved.error };

  const settings = await getAppSettings();
  const skipped: string[] = [];
  let imported = 0;

  try {
    await prisma.$transaction(async (tx) => {
      for (const line of parsed.data.lines) {
        const variant = await findVariantByCode(line.code);
        if (!variant) {
          skipped.push(line.code);
          continue;
        }

        await adjustFinishedGoodsWithMovement(tx, {
          variantId: variant.id,
          branchId: resolved.branchId,
          delta: line.quantity,
          type: "RESTOCK_IMPORT",
          note:
            emptyToNull(parsed.data.note) ??
            `Import restock · code ${line.code}`,
          createdById: session?.user?.id ?? null,
          defaultReorderAt: settings.defaultFinishedGoodsReorderAt,
        });
        imported += 1;
      }

      if (imported === 0) {
        throw new Error(
          skipped.length
            ? `No matching products for codes: ${skipped.join(", ")}`
            : "Nothing to import.",
        );
      }
    });

    revalidatePath("/shops/stock");
    revalidatePath("/shops/restock");
    revalidatePath("/central");
    revalidatePath("/");
    return { success: true, imported, skipped };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Import restock failed.",
      skipped,
    };
  }
}
