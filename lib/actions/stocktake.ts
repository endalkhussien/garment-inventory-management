"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { createNotificationForAdmins } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import {
  adjustRawMaterialBranchStock,
  ensureMaterialBookOnBranch,
  resolveMaterialBranchId,
} from "@/lib/raw-material-stock";
import {
  createStocktakeSchema,
  stocktakeCountsSchema,
  type CreateStocktakeInput,
  type StocktakeCountsInput,
} from "@/lib/validations/lots";

export type ActionResult = {
  success: boolean;
  error?: string;
  id?: string;
  pendingApproval?: boolean;
};

function emptyToNull(value?: string | null) {
  if (!value || value.trim() === "") return null;
  return value;
}

export async function createStocktakeSession(
  input: CreateStocktakeInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = createStocktakeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const session = await getServerSession(authOptions);
  const materials = await prisma.rawMaterial.findMany({
    where: { id: { in: parsed.data.rawMaterialIds }, isActive: true },
  });

  if (materials.length === 0) {
    return { success: false, error: "No active materials selected." };
  }

  const created = await prisma.stocktakeSession.create({
    data: {
      title: parsed.data.title.trim(),
      note: emptyToNull(parsed.data.note),
      status: "DRAFT",
      createdById: session?.user?.id ?? null,
      lines: {
        create: materials.map((m) => ({
          rawMaterialId: m.id,
          systemQty: m.quantity,
        })),
      },
    },
  });

  revalidatePath("/inventory/stocktake");
  return { success: true, id: created.id };
}

/** Save physical counts and submit for approval when any variance exists. */
export async function submitStocktakeCounts(
  input: StocktakeCountsInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = stocktakeCountsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const auth = await getServerSession(authOptions);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const stocktake = await tx.stocktakeSession.findUnique({
        where: { id: parsed.data.sessionId },
        include: {
          lines: { include: { rawMaterial: true } },
        },
      });

      if (!stocktake) throw new Error("Stocktake not found.");
      if (
        stocktake.status !== "DRAFT" &&
        stocktake.status !== "COUNTED"
      ) {
        throw new Error("This stocktake can no longer be edited.");
      }

      for (const row of parsed.data.lines) {
        await tx.stocktakeLine.update({
          where: { id: row.lineId },
          data: {
            countedQty: new Prisma.Decimal(row.countedQty),
            note: emptyToNull(row.note),
          },
        });
      }

      const refreshed = await tx.stocktakeSession.findUnique({
        where: { id: stocktake.id },
        include: {
          lines: { include: { rawMaterial: true } },
        },
      });
      if (!refreshed) throw new Error("Stocktake not found.");

      const variances = refreshed.lines
        .filter((l) => l.countedQty !== null)
        .map((l) => {
          const system = Number(l.systemQty.toString());
          const counted = Number(l.countedQty!.toString());
          return {
            lineId: l.id,
            rawMaterialId: l.rawMaterialId,
            materialName: l.rawMaterial.name,
            unit: l.rawMaterial.unitOfMeasure,
            systemQty: system,
            countedQty: counted,
            variance: counted - system,
          };
        })
        .filter((v) => Math.abs(v.variance) > 0.0001);

      if (variances.length === 0) {
        await tx.stocktakeSession.update({
          where: { id: stocktake.id },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
        return { id: stocktake.id, pendingApproval: false };
      }

      await tx.stocktakeSession.update({
        where: { id: stocktake.id },
        data: { status: "PENDING_APPROVAL" },
      });

      const summary = variances
        .slice(0, 5)
        .map(
          (v) =>
            `${v.materialName}: ${v.variance > 0 ? "+" : ""}${v.variance} ${v.unit}`,
        )
        .join("; ");

      await tx.approval.create({
        data: {
          type: "STOCK_ADJUSTMENT",
          title: `Stocktake adjustment: ${stocktake.title}`,
          summary:
            variances.length > 5
              ? `${summary}; +${variances.length - 5} more`
              : summary,
          payload: {
            sessionId: stocktake.id,
            variances,
          },
          requestedById: auth?.user?.id ?? null,
        },
      });

      return { id: stocktake.id, pendingApproval: true };
    });

    if (result.pendingApproval) {
      await createNotificationForAdmins({
        title: "Stocktake approval needed",
        body: "Physical count differs from system — review adjustments.",
        href: "/approvals",
      });
    }

    revalidatePath("/inventory/stocktake");
    revalidatePath(`/inventory/stocktake/${result.id}`);
    revalidatePath("/approvals");
    return {
      success: true,
      id: result.id,
      pendingApproval: result.pendingApproval,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not submit stocktake.",
    };
  }
}

/** Apply approved stocktake variances as ADJUSTMENT movements. */
export async function applyStocktakeAdjustments(
  sessionId: string,
): Promise<ActionResult> {
  const auth = await getServerSession(authOptions);

  try {
    await prisma.$transaction(async (tx) => {
      const stocktake = await tx.stocktakeSession.findUnique({
        where: { id: sessionId },
        include: {
          lines: { include: { rawMaterial: true } },
        },
      });

      if (!stocktake) throw new Error("Stocktake not found.");
      if (stocktake.status !== "PENDING_APPROVAL") {
        throw new Error("Stocktake is not awaiting approval.");
      }

      for (const line of stocktake.lines) {
        if (line.countedQty === null) continue;
        const system = new Prisma.Decimal(line.systemQty);
        const counted = new Prisma.Decimal(line.countedQty);
        const variance = counted.sub(system);
        if (variance.equals(0)) continue;

        const material = await tx.rawMaterial.findUnique({
          where: { id: line.rawMaterialId },
        });
        if (!material) throw new Error("Material missing.");

        const branchId = await resolveMaterialBranchId(
          tx,
          material.id,
          material.branchId,
        );
        await ensureMaterialBookOnBranch(tx, material.id, branchId);

        // Apply variance on primary branch so book total moves to counted qty
        const delta = counted.sub(new Prisma.Decimal(line.systemQty));
        const { totalQty } = await adjustRawMaterialBranchStock(
          tx,
          material.id,
          branchId,
          delta,
        );

        await tx.stockMovement.create({
          data: {
            rawMaterialId: material.id,
            type: variance.greaterThan(0) ? "IN" : "OUT",
            quantity: variance.abs(),
            reasonCode: "ADJUSTMENT",
            note: `Stocktake ${stocktake.title}`,
            balanceAfter: totalQty,
            branchId,
            createdById: auth?.user?.id ?? null,
          },
        });
      }

      await tx.stocktakeSession.update({
        where: { id: sessionId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    });
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not apply stocktake adjustments.",
    };
  }

  revalidatePath("/inventory/stocktake");
  revalidatePath(`/inventory/stocktake/${sessionId}`);
  revalidatePath("/inventory/raw-materials");
  return { success: true, id: sessionId };
}

export async function cancelStocktake(sessionId: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    const current = await prisma.stocktakeSession.findUnique({
      where: { id: sessionId },
    });
    if (!current) return { success: false, error: "Not found." };
    if (current.status === "COMPLETED") {
      return { success: false, error: "Completed stocktakes cannot be cancelled." };
    }
    await prisma.stocktakeSession.update({
      where: { id: sessionId },
      data: { status: "CANCELLED" },
    });
    revalidatePath("/inventory/stocktake");
    return { success: true, id: sessionId };
  } catch {
    return { success: false, error: "Could not cancel stocktake." };
  }
}
