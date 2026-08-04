"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  calculateCostBreakdown,
  calculateMaterialCost,
  sellingPriceFromMargin,
} from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import {
  bomLineSchema,
  pricingSchema,
  productSchema,
  productWithVariantSchema,
  variantSchema,
  type BomLineInput,
  type PricingInput,
  type ProductInput,
  type ProductWithVariantInput,
  type VariantInput,
} from "@/lib/validations/products";

export type ActionResult = {
  success: boolean;
  error?: string;
  id?: string;
  productId?: string;
};

function emptyToNull(value?: string | null) {
  if (!value || value.trim() === "") return null;
  return value;
}

async function recomputeVariantCosts(
  tx: Prisma.TransactionClient,
  variantId: string,
) {
  const variant = await tx.productVariant.findUnique({
    where: { id: variantId },
    include: {
      bomLines: {
        include: { rawMaterial: true },
      },
    },
  });

  if (!variant) {
    throw new Error("Variant not found.");
  }

  const materialCost = calculateMaterialCost(
    variant.bomLines.map((line) => ({
      quantityPerUnit: Number(line.quantityPerUnit.toString()),
      costPerUnit: Number(line.rawMaterial.costPerUnit.toString()),
    })),
  );

  const breakdown = calculateCostBreakdown({
    materialCost,
    laborCost: Number(variant.laborCostPerUnit.toString()),
    overheadPercent: Number(variant.overheadPercent.toString()),
  });

  await tx.productVariant.update({
    where: { id: variantId },
    data: {
      materialCostCached: new Prisma.Decimal(breakdown.materialCost),
      totalCostCached: new Prisma.Decimal(breakdown.totalCost),
      costIsStale: false,
    },
  });

  return breakdown;
}

export async function createProductWithVariant(
  input: ProductWithVariantInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = productWithVariantSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const data = parsed.data;
  const code = data.code.trim().toUpperCase();
  const sku =
    emptyToNull(data.sku) ??
    `${code}-${data.size}-${data.color}`
      .replace(/\s+/g, "-")
      .toUpperCase();

  try {
    const existingCode = await prisma.product.findFirst({
      where: { code: { equals: code, mode: "insensitive" }, isActive: true },
    });
    if (existingCode) {
      return { success: false, error: "Product code already exists." };
    }

    const created = await prisma.$transaction(async (tx) => {
      const maxNo = await tx.product.aggregate({ _max: { productNo: true } });
      const nextNo = (maxNo._max.productNo ?? 0) + 1;
      const buying = new Prisma.Decimal(data.buyingPrice);
      return tx.product.create({
        data: {
          productNo: nextNo,
          name: data.name,
          code,
          categoryId: data.categoryId,
          description: emptyToNull(data.description),
          garmentInfo: emptyToNull(data.garmentInfo),
          variants: {
            create: {
              size: data.size,
              color: data.color,
              sku,
              buyingPrice: buying,
              totalCostCached: buying,
              materialCostCached: buying,
              sellingPrice: new Prisma.Decimal(data.sellingPrice),
              laborCostPerUnit: new Prisma.Decimal(0),
              overheadPercent: new Prisma.Decimal(0),
            },
          },
        },
        include: { variants: true },
      });
    });

    revalidatePath("/products");
    revalidatePath("/central");
    return {
      success: true,
      id: created.id,
      productId: created.id,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "Code, SKU, or size/color already exists.",
      };
    }
    return { success: false, error: "Could not create product." };
  }
}

export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const code = parsed.data.code.trim().toUpperCase();
    const clash = await prisma.product.findFirst({
      where: {
        code: { equals: code, mode: "insensitive" },
        isActive: true,
        NOT: { id },
      },
    });
    if (clash) {
      return { success: false, error: "Product code already exists." };
    }

    await prisma.product.update({
      where: { id },
      data: {
        name: parsed.data.name,
        code,
        categoryId: parsed.data.categoryId,
        description: emptyToNull(parsed.data.description),
        garmentInfo: emptyToNull(parsed.data.garmentInfo),
      },
    });
  } catch {
    return { success: false, error: "Product not found." };
  }

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { success: true, id };
}

export async function addProductVariant(
  productId: string,
  input: VariantInput,
): Promise<ActionResult> {
  const parsed = variantSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const buying = new Prisma.Decimal(parsed.data.buyingPrice);
    const variant = await prisma.productVariant.create({
      data: {
        productId,
        size: parsed.data.size,
        color: parsed.data.color,
        sku: parsed.data.sku,
        buyingPrice: buying,
        totalCostCached: buying,
        materialCostCached: buying,
        sellingPrice: new Prisma.Decimal(parsed.data.sellingPrice),
        laborCostPerUnit: new Prisma.Decimal(0),
        overheadPercent: new Prisma.Decimal(0),
      },
    });

    revalidatePath(`/products/${productId}`);
    revalidatePath("/products");
    return { success: true, id: variant.id, productId };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "SKU or size/color combination already exists.",
      };
    }
    return { success: false, error: "Could not add variant." };
  }
}

export async function updateProductVariant(
  variantId: string,
  input: VariantInput,
): Promise<ActionResult> {
  const parsed = variantSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const buying = new Prisma.Decimal(parsed.data.buyingPrice);
    const variant = await prisma.$transaction(async (tx) => {
      const updated = await tx.productVariant.update({
        where: { id: variantId },
        data: {
          size: parsed.data.size,
          color: parsed.data.color,
          sku: parsed.data.sku,
          buyingPrice: buying,
          sellingPrice: new Prisma.Decimal(parsed.data.sellingPrice),
          totalCostCached: buying,
          materialCostCached: buying,
        },
      });

      // Keep BOM-derived costs optional; explicit buying price is source of truth for shops
      if (
        (await tx.billOfMaterial.count({ where: { variantId } })) > 0
      ) {
        await recomputeVariantCosts(tx, variantId);
      }
      return updated;
    });

    revalidatePath(`/products/${variant.productId}`);
    revalidatePath(`/products/${variant.productId}/variants/${variantId}`);
    revalidatePath(
      `/products/${variant.productId}/variants/${variantId}/pricing`,
    );
    return { success: true, id: variantId, productId: variant.productId };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "SKU or size/color combination already exists.",
      };
    }
    return { success: false, error: "Variant not found." };
  }
}

export async function upsertBomLine(
  variantId: string,
  input: BomLineInput,
): Promise<ActionResult> {
  const parsed = bomLineSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const variant = await prisma.$transaction(async (tx) => {
      const existing = await tx.productVariant.findUnique({
        where: { id: variantId },
      });
      if (!existing) {
        throw new Error("Variant not found.");
      }

      await tx.billOfMaterial.upsert({
        where: {
          variantId_rawMaterialId: {
            variantId,
            rawMaterialId: parsed.data.rawMaterialId,
          },
        },
        update: {
          quantityPerUnit: new Prisma.Decimal(parsed.data.quantityPerUnit),
        },
        create: {
          variantId,
          rawMaterialId: parsed.data.rawMaterialId,
          quantityPerUnit: new Prisma.Decimal(parsed.data.quantityPerUnit),
        },
      });

      await recomputeVariantCosts(tx, variantId);
      return existing;
    });

    revalidatePath(`/products/${variant.productId}`);
    revalidatePath(`/products/${variant.productId}/variants/${variantId}`);
    revalidatePath(
      `/products/${variant.productId}/variants/${variantId}/pricing`,
    );
    return { success: true, id: variantId, productId: variant.productId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not save BOM line.",
    };
  }
}

export async function removeBomLine(
  variantId: string,
  bomLineId: string,
): Promise<ActionResult> {
  try {
    const variant = await prisma.$transaction(async (tx) => {
      const existing = await tx.productVariant.findUnique({
        where: { id: variantId },
      });
      if (!existing) {
        throw new Error("Variant not found.");
      }

      await tx.billOfMaterial.delete({ where: { id: bomLineId } });
      await recomputeVariantCosts(tx, variantId);
      return existing;
    });

    revalidatePath(`/products/${variant.productId}`);
    revalidatePath(`/products/${variant.productId}/variants/${variantId}`);
    revalidatePath(
      `/products/${variant.productId}/variants/${variantId}/pricing`,
    );
    return { success: true, id: variantId, productId: variant.productId };
  } catch {
    return { success: false, error: "Could not remove BOM line." };
  }
}

export async function refreshVariantCost(
  variantId: string,
): Promise<ActionResult> {
  try {
    const variant = await prisma.$transaction(async (tx) => {
      const existing = await tx.productVariant.findUnique({
        where: { id: variantId },
      });
      if (!existing) {
        throw new Error("Variant not found.");
      }
      await recomputeVariantCosts(tx, variantId);
      return existing;
    });

    revalidatePath(`/products/${variant.productId}`);
    revalidatePath(`/products/${variant.productId}/variants/${variantId}`);
    revalidatePath(
      `/products/${variant.productId}/variants/${variantId}/pricing`,
    );
    revalidatePath("/products");
    return { success: true, id: variantId, productId: variant.productId };
  } catch {
    return { success: false, error: "Could not refresh cost." };
  }
}

export async function updateVariantPricing(
  variantId: string,
  input: PricingInput,
): Promise<ActionResult> {
  const parsed = pricingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const session = await getServerSession(authOptions);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const breakdown = await recomputeVariantCosts(tx, variantId);
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
      });
      if (!variant) {
        throw new Error("Variant not found.");
      }

      const oldPrice = Number(variant.sellingPrice.toString());
      const costBase =
        parsed.data.buyingPrice !== undefined
          ? parsed.data.buyingPrice
          : Number(variant.buyingPrice.toString()) || breakdown.totalCost;
      const newPrice =
        parsed.data.mode === "margin"
          ? sellingPriceFromMargin(
              costBase,
              parsed.data.marginPercent ?? 0,
            )
          : parsed.data.sellingPrice ?? 0;

      if (oldPrice !== newPrice) {
        await tx.priceHistory.create({
          data: {
            variantId,
            oldPrice: new Prisma.Decimal(oldPrice),
            newPrice: new Prisma.Decimal(newPrice),
            changedById: session?.user?.id ?? null,
          },
        });
      }

      await tx.productVariant.update({
        where: { id: variantId },
        data: {
          sellingPrice: new Prisma.Decimal(newPrice),
          ...(parsed.data.buyingPrice !== undefined
            ? {
                buyingPrice: new Prisma.Decimal(parsed.data.buyingPrice),
                totalCostCached: new Prisma.Decimal(parsed.data.buyingPrice),
              }
            : {}),
        },
      });

      return variant;
    });

    revalidatePath(`/products/${result.productId}`);
    revalidatePath(`/products/${result.productId}/variants/${variantId}`);
    revalidatePath(
      `/products/${result.productId}/variants/${variantId}/pricing`,
    );
    revalidatePath("/products");
    return { success: true, id: variantId, productId: result.productId };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Could not update pricing.",
    };
  }
}

export async function markVariantsStaleForMaterial(
  rawMaterialId: string,
): Promise<void> {
  const lines = await prisma.billOfMaterial.findMany({
    where: { rawMaterialId },
    select: { variantId: true },
  });

  const variantIds = Array.from(new Set(lines.map((line) => line.variantId)));
  if (variantIds.length === 0) return;

  await prisma.productVariant.updateMany({
    where: { id: { in: variantIds } },
    data: { costIsStale: true },
  });

  revalidatePath("/products");
}

export async function setProductActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { isActive },
      });
      await tx.productVariant.updateMany({
        where: { productId: id },
        data: { isActive },
      });
    });
    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
    return { success: true, id };
  } catch {
    return { success: false, error: "Product not found." };
  }
}

export async function setVariantActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    const variant = await prisma.productVariant.update({
      where: { id },
      data: { isActive },
    });
    revalidatePath("/products");
    revalidatePath(`/products/${variant.productId}`);
    return { success: true, id };
  } catch {
    return { success: false, error: "Variant not found." };
  }
}
