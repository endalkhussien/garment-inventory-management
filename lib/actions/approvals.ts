"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { createNotificationForAdmins, createNotificationForUser } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { recordStockMovement } from "@/lib/actions/inventory";
import { updateVariantPricing } from "@/lib/actions/products";
import { applyStocktakeAdjustments } from "@/lib/actions/stocktake";
import type { PricingInput } from "@/lib/validations/products";
import type { StockMovementInput } from "@/lib/validations/inventory";

import { getAppSettings } from "@/lib/settings";

export type ActionResult = {
  success: boolean;
  error?: string;
  id?: string;
  pendingApproval?: boolean;
};

async function getLargeStockOutThreshold() {
  const settings = await getAppSettings();
  return settings.largeStockOutThreshold;
}

/** Stock-out: large ones go to approval queue instead of applying immediately. */
export async function requestOrApplyStockOut(
  input: StockMovementInput,
): Promise<ActionResult> {
  if (input.type !== "OUT") {
    return recordStockMovement(input);
  }

  const threshold = await getLargeStockOutThreshold();
  if (input.quantity < threshold) {
    return recordStockMovement(input);
  }

  const session = await getServerSession(authOptions);
  const material = await prisma.rawMaterial.findUnique({
    where: { id: input.rawMaterialId },
  });

  const approval = await prisma.approval.create({
    data: {
      type: "LARGE_STOCK_OUT",
      title: `Large stock-out: ${material?.name ?? "material"}`,
      summary: `${input.quantity} ${material?.unitOfMeasure ?? ""} · ${input.reasonCode}`,
      payload: input,
      requestedById: session?.user?.id ?? null,
    },
  });

  await createNotificationForAdmins({
    title: "Approval needed",
    body: approval.title,
    href: "/approvals",
  });

  revalidatePath("/approvals");
  return {
    success: true,
    id: approval.id,
    pendingApproval: true,
  };
}

export async function requestPriceOverrideIfNeeded(
  variantId: string,
  input: PricingInput,
  totalCost: number,
): Promise<ActionResult> {
  const settings = await getAppSettings();

  const proposed =
    input.mode === "manual" ? (input.sellingPrice ?? 0) : 0;

  // Only gate manual prices below cost when setting is on
  if (
    !settings.requirePriceOverrideApproval ||
    input.mode !== "manual" ||
    proposed >= totalCost
  ) {
    return updateVariantPricing(variantId, input);
  }

  const session = await getServerSession(authOptions);
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });

  const approval = await prisma.approval.create({
    data: {
      type: "PRICE_OVERRIDE",
      title: `Price below cost: ${variant?.product.name ?? "product"}`,
      summary: `Proposed ETB ${proposed} vs cost ETB ${totalCost}`,
      payload: { variantId, pricing: input },
      requestedById: session?.user?.id ?? null,
    },
  });

  await createNotificationForAdmins({
    title: "Price override approval",
    body: approval.title,
    href: "/approvals",
  });

  revalidatePath("/approvals");
  return { success: true, id: approval.id, pendingApproval: true };
}

export async function reviewApproval(
  approvalId: string,
  decision: "APPROVED" | "REJECTED",
  reviewNote?: string,
): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  const approval = await prisma.approval.findUnique({
    where: { id: approvalId },
  });

  if (!approval || approval.status !== "PENDING") {
    return { success: false, error: "Approval not found or already reviewed." };
  }

  if (decision === "APPROVED") {
    if (approval.type === "LARGE_STOCK_OUT") {
      const payload = approval.payload as StockMovementInput;
      const result = await recordStockMovement(payload);
      if (!result.success) return result;
    }
    if (approval.type === "PRICE_OVERRIDE") {
      const payload = approval.payload as {
        variantId: string;
        pricing: PricingInput;
      };
      const result = await updateVariantPricing(
        payload.variantId,
        payload.pricing,
      );
      if (!result.success) return result;
    }
    if (approval.type === "STOCK_ADJUSTMENT") {
      const payload = approval.payload as { sessionId?: string };
      if (!payload.sessionId) {
        return { success: false, error: "Invalid stocktake payload." };
      }
      const result = await applyStocktakeAdjustments(payload.sessionId);
      if (!result.success) return result;
    }
  }

  if (decision === "REJECTED" && approval.type === "STOCK_ADJUSTMENT") {
    const payload = approval.payload as { sessionId?: string };
    if (payload.sessionId) {
      await prisma.stocktakeSession.updateMany({
        where: {
          id: payload.sessionId,
          status: "PENDING_APPROVAL",
        },
        data: { status: "CANCELLED" },
      });
    }
  }

  await prisma.approval.update({
    where: { id: approvalId },
    data: {
      status: decision,
      reviewedById: session?.user?.id ?? null,
      reviewNote: reviewNote || null,
      reviewedAt: new Date(),
    },
  });

  if (approval.requestedById) {
    await createNotificationForUser({
      userId: approval.requestedById,
      title: `Request ${decision.toLowerCase()}`,
      body: approval.title,
      href: "/approvals",
    });
  }

  revalidatePath("/approvals");
  return { success: true, id: approvalId };
}
