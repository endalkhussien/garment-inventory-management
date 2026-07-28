"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { createNotificationForAdmins } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import {
  employeeSchema,
  outputEntrySchema,
  productionOrderSchema,
  wastageSchema,
  type EmployeeInput,
  type OutputEntryInput,
  type ProductionOrderInput,
  type WastageInput,
} from "@/lib/validations/production";

export type ActionResult = {
  success: boolean;
  error?: string;
  id?: string;
};

function emptyToNull(value?: string | null) {
  if (!value || value.trim() === "" || value === "__none__") return null;
  return value;
}

async function nextOrderNumber(tx: Prisma.TransactionClient) {
  const count = await tx.productionOrder.count();
  return `PO-${String(count + 1).padStart(5, "0")}`;
}

async function adjustFinishedGoods(
  tx: Prisma.TransactionClient,
  variantId: string,
  branchId: string,
  delta: number,
) {
  const existing = await tx.finishedGoodsStock.findUnique({
    where: { variantId_branchId: { variantId, branchId } },
  });

  const next = (existing?.quantity ?? 0) + delta;
  if (next < 0) {
    throw new Error("Not enough finished goods stock for this action.");
  }

  if (existing) {
    await tx.finishedGoodsStock.update({
      where: { id: existing.id },
      data: { quantity: next },
    });
  } else {
    await tx.finishedGoodsStock.create({
      data: { variantId, branchId, quantity: next },
    });
  }
}

export async function createEmployee(input: EmployeeInput): Promise<ActionResult> {
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const created = await prisma.employee.create({
      data: {
        name: parsed.data.name,
        code: emptyToNull(parsed.data.code),
        phone: emptyToNull(parsed.data.phone),
        branchId: emptyToNull(parsed.data.branchId),
        hireDate: parsed.data.hireDate
          ? new Date(parsed.data.hireDate)
          : null,
        monthlyBaseSalary: new Prisma.Decimal(
          parsed.data.monthlyBaseSalary ?? 0,
        ),
        pieceRatePerUnit: new Prisma.Decimal(
          parsed.data.pieceRatePerUnit ?? 0,
        ),
      },
    });
    revalidatePath("/production/employees");
    return { success: true, id: created.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Employee code already exists." };
    }
    return { success: false, error: "Could not create employee." };
  }
}

export async function updateEmployee(
  id: string,
  input: EmployeeInput,
): Promise<ActionResult> {
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    await prisma.employee.update({
      where: { id },
      data: {
        name: parsed.data.name,
        code: emptyToNull(parsed.data.code),
        phone: emptyToNull(parsed.data.phone),
        branchId: emptyToNull(parsed.data.branchId),
        hireDate: parsed.data.hireDate
          ? new Date(parsed.data.hireDate)
          : null,
        monthlyBaseSalary: new Prisma.Decimal(
          parsed.data.monthlyBaseSalary ?? 0,
        ),
        pieceRatePerUnit: new Prisma.Decimal(
          parsed.data.pieceRatePerUnit ?? 0,
        ),
      },
    });
    revalidatePath("/production/employees");
    revalidatePath(`/production/employees/${id}`);
    return { success: true, id };
  } catch {
    return { success: false, error: "Employee not found." };
  }
}

export async function createProductionOrder(
  input: ProductionOrderInput,
): Promise<ActionResult> {
  const parsed = productionOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const session = await getServerSession(authOptions);
  const data = parsed.data;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const orderNumber = await nextOrderNumber(tx);
      return tx.productionOrder.create({
        data: {
          orderNumber,
          variantId: data.variantId,
          quantityTarget: data.quantityTarget,
          targetDate: data.targetDate ? new Date(data.targetDate) : null,
          supervisorId: emptyToNull(data.supervisorId),
          warehouseBranchId: data.warehouseBranchId,
          note: emptyToNull(data.note),
          createdById: session?.user?.id ?? null,
          status: "DRAFT",
        },
      });
    });

    revalidatePath("/production/orders");
    return { success: true, id: created.id };
  } catch {
    return { success: false, error: "Could not create production order." };
  }
}

/** Issue BOM materials and move order to IN_PROGRESS — one clear action. */
export async function startProductionOrder(
  orderId: string,
): Promise<ActionResult> {
  const session = await getServerSession(authOptions);

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.productionOrder.findUnique({
        where: { id: orderId },
        include: {
          variant: {
            include: {
              bomLines: { include: { rawMaterial: true } },
            },
          },
        },
      });

      if (!order) throw new Error("Order not found.");
      if (order.status !== "DRAFT") {
        throw new Error("Only draft orders can be started.");
      }
      if (order.variant.bomLines.length === 0) {
        throw new Error(
          "This variant has no BOM. Add materials on the product page first.",
        );
      }

      const shortages: string[] = [];
      for (const line of order.variant.bomLines) {
        const needed = new Prisma.Decimal(line.quantityPerUnit).mul(
          order.quantityTarget,
        );
        const available = new Prisma.Decimal(line.rawMaterial.quantity);
        if (available.lessThan(needed)) {
          shortages.push(
            `${line.rawMaterial.name}: need ${needed.toString()} ${line.rawMaterial.unitOfMeasure}, have ${available.toString()}`,
          );
        }
      }

      if (shortages.length > 0) {
        throw new Error(
          `Not enough materials to start this order:\n${shortages.join("\n")}`,
        );
      }

      for (const line of order.variant.bomLines) {
        const needed = new Prisma.Decimal(line.quantityPerUnit).mul(
          order.quantityTarget,
        );
        const material = await tx.rawMaterial.findUnique({
          where: { id: line.rawMaterialId },
        });
        if (!material) throw new Error("Material missing.");

        const next = new Prisma.Decimal(material.quantity).sub(needed);
        await tx.rawMaterial.update({
          where: { id: material.id },
          data: { quantity: next },
        });
        await tx.stockMovement.create({
          data: {
            rawMaterialId: material.id,
            type: "OUT",
            quantity: needed,
            reasonCode: "PRODUCTION_USE",
            note: `Issued for ${order.orderNumber}`,
            balanceAfter: next,
            createdById: session?.user?.id ?? null,
          },
        });
      }

      await tx.productionOrder.update({
        where: { id: orderId },
        data: {
          status: "IN_PROGRESS",
          materialsIssued: true,
          startedAt: new Date(),
        },
      });
    });
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not start order. Nothing was deducted.",
    };
  }

  revalidatePath("/production/orders");
  revalidatePath(`/production/orders/${orderId}`);
  revalidatePath("/inventory/raw-materials");
  revalidatePath("/inventory/stock-movements");
  return { success: true, id: orderId };
}

export async function recordOutputEntry(
  input: OutputEntryInput,
): Promise<ActionResult> {
  const parsed = outputEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.productionOrder.findUnique({
        where: { id: data.productionOrderId },
      });
      if (!order) throw new Error("Order not found.");
      if (order.status !== "IN_PROGRESS") {
        throw new Error("Output can only be recorded on in-progress orders.");
      }

      await tx.productionOutput.create({
        data: {
          productionOrderId: order.id,
          employeeId: emptyToNull(data.employeeId),
          outputDate: data.outputDate ? new Date(data.outputDate) : new Date(),
          quantityGood: data.quantityGood,
          quantityRejected: data.quantityRejected ?? 0,
          note: emptyToNull(data.note),
        },
      });

      await tx.productionOrder.update({
        where: { id: order.id },
        data: {
          quantityGood: { increment: data.quantityGood },
          quantityRejected: { increment: data.quantityRejected ?? 0 },
        },
      });
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not save output.",
    };
  }

  revalidatePath("/production/orders");
  revalidatePath(`/production/orders/${data.productionOrderId}`);
  revalidatePath("/production/output");
  revalidatePath("/production/employees");
  return { success: true };
}

export async function recordWastage(input: WastageInput): Promise<ActionResult> {
  const parsed = wastageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const session = await getServerSession(authOptions);
  const data = parsed.data;
  const qty = new Prisma.Decimal(data.quantity);

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.productionOrder.findUnique({
        where: { id: data.productionOrderId },
      });
      if (!order || order.status === "CANCELLED") {
        throw new Error("Order not found.");
      }

      const material = await tx.rawMaterial.findUnique({
        where: { id: data.rawMaterialId },
      });
      if (!material) throw new Error("Material not found.");

      const next = new Prisma.Decimal(material.quantity).sub(qty);
      if (next.lessThan(0)) {
        throw new Error(
          `Insufficient stock for wastage. Available: ${material.quantity.toString()}`,
        );
      }

      await tx.rawMaterial.update({
        where: { id: material.id },
        data: { quantity: next },
      });
      await tx.stockMovement.create({
        data: {
          rawMaterialId: material.id,
          type: "OUT",
          quantity: qty,
          reasonCode: "DAMAGE",
          note: emptyToNull(data.note) ?? `Wastage on ${order.orderNumber}`,
          balanceAfter: next,
          createdById: session?.user?.id ?? null,
        },
      });
      await tx.productionWastage.create({
        data: {
          productionOrderId: order.id,
          rawMaterialId: material.id,
          quantity: qty,
          note: emptyToNull(data.note),
        },
      });
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not record wastage.",
    };
  }

  revalidatePath(`/production/orders/${data.productionOrderId}`);
  revalidatePath("/inventory/raw-materials");
  return { success: true };
}

/** Complete order: move good units into finished goods at the warehouse branch. */
export async function completeProductionOrder(
  orderId: string,
): Promise<ActionResult> {
  try {
    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.productionOrder.findUnique({
        where: { id: orderId },
      });
      if (!current) throw new Error("Order not found.");
      if (current.status !== "IN_PROGRESS") {
        throw new Error("Only in-progress orders can be completed.");
      }
      if (current.quantityGood <= 0) {
        throw new Error("Record some good output before completing.");
      }

      await adjustFinishedGoods(
        tx,
        current.variantId,
        current.warehouseBranchId,
        current.quantityGood,
      );

      return tx.productionOrder.update({
        where: { id: orderId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
    });

    await createNotificationForAdmins({
      title: "Production order completed",
      body: `${order.orderNumber} finished — ${order.quantityGood} good units added to stock.`,
      href: `/production/orders/${order.id}`,
    });
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Could not complete order.",
    };
  }

  revalidatePath("/production/orders");
  revalidatePath(`/production/orders/${orderId}`);
  revalidatePath("/shops/stock");
  revalidatePath("/");
  return { success: true, id: orderId };
}

export async function cancelProductionOrder(
  orderId: string,
): Promise<ActionResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.productionOrder.findUnique({
        where: { id: orderId },
      });
      if (!current) throw new Error("Order not found.");
      if (current.status === "COMPLETED") {
        throw new Error("Completed orders cannot be cancelled.");
      }
      if (current.status === "CANCELLED") {
        throw new Error("Order is already cancelled.");
      }
      if (current.status === "IN_PROGRESS" && current.quantityGood > 0) {
        throw new Error(
          "This order already has good output. Complete it, or contact Admin before cancelling.",
        );
      }

      await tx.productionOrder.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
      });
    });
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Could not cancel order.",
    };
  }

  revalidatePath("/production/orders");
  revalidatePath(`/production/orders/${orderId}`);
  revalidatePath("/");
  return { success: true, id: orderId };
}

export async function deactivateEmployee(id: string): Promise<ActionResult> {
  try {
    await prisma.employee.update({
      where: { id },
      data: { isActive: false },
    });
    revalidatePath("/production/employees");
    revalidatePath(`/production/employees/${id}`);
    return { success: true, id };
  } catch {
    return { success: false, error: "Employee not found." };
  }
}

export async function reactivateEmployee(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await prisma.employee.update({
      where: { id },
      data: { isActive: true },
    });
    revalidatePath("/production/employees");
    revalidatePath(`/production/employees/${id}`);
    return { success: true, id };
  } catch {
    return { success: false, error: "Employee not found." };
  }
}

export async function updateDraftProductionOrder(
  id: string,
  input: ProductionOrderInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = productionOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const order = await prisma.productionOrder.findUnique({ where: { id } });
    if (!order) return { success: false, error: "Order not found." };
    if (order.status !== "DRAFT") {
      return {
        success: false,
        error: "Only draft orders can be edited. Cancel and recreate if needed.",
      };
    }

    await prisma.productionOrder.update({
      where: { id },
      data: {
        variantId: parsed.data.variantId,
        quantityTarget: parsed.data.quantityTarget,
        targetDate: parsed.data.targetDate
          ? new Date(parsed.data.targetDate)
          : null,
        supervisorId: emptyToNull(parsed.data.supervisorId),
        warehouseBranchId: parsed.data.warehouseBranchId,
        note: emptyToNull(parsed.data.note),
      },
    });
    revalidatePath("/production/orders");
    revalidatePath(`/production/orders/${id}`);
    return { success: true, id };
  } catch {
    return { success: false, error: "Could not update order." };
  }
}

/** Undo a mistaken output entry on an in-progress order (Admin). */
export async function deleteOutputEntry(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await prisma.$transaction(async (tx) => {
      const entry = await tx.productionOutput.findUnique({ where: { id } });
      if (!entry) throw new Error("Output entry not found.");

      const order = await tx.productionOrder.findUnique({
        where: { id: entry.productionOrderId },
      });
      if (!order) throw new Error("Order not found.");
      if (order.status !== "IN_PROGRESS") {
        throw new Error(
          "Only output on in-progress orders can be deleted. Completed orders keep their history.",
        );
      }

      const nextGood = order.quantityGood - entry.quantityGood;
      const nextRejected = order.quantityRejected - entry.quantityRejected;
      if (nextGood < 0 || nextRejected < 0) {
        throw new Error("Cannot reverse — order totals would go negative.");
      }

      await tx.productionOrder.update({
        where: { id: order.id },
        data: {
          quantityGood: nextGood,
          quantityRejected: nextRejected,
        },
      });
      await tx.productionOutput.delete({ where: { id } });
    });
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Could not delete output.",
    };
  }

  revalidatePath("/production/orders");
  revalidatePath("/production/output");
  revalidatePath("/production/employees");
  return { success: true, id };
}
