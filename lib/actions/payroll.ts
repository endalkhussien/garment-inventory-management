"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { computeShopCommission } from "@/lib/commission";
import { toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { getAppSettings } from "@/lib/settings";
import {
  payrollLineAdjustSchema,
  payrollRunSchema,
  type PayrollLineAdjustInput,
  type PayrollRunInput,
} from "@/lib/validations/payroll";

export type ActionResult = {
  success: boolean;
  error?: string;
  id?: string;
};

function periodBounds(start: string, end: string) {
  const periodStart = new Date(start);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(end);
  periodEnd.setHours(23, 59, 59, 999);
  return { periodStart, periodEnd };
}

function prorateBaseSalary(
  monthlyBase: number,
  periodStart: Date,
  periodEnd: Date,
  daysPerMonth: number,
) {
  const days =
    Math.floor(
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;
  const basis = daysPerMonth > 0 ? daysPerMonth : 30;
  return Math.round((monthlyBase / basis) * days * 100) / 100;
}

export async function createPayrollRun(
  input: PayrollRunInput,
): Promise<ActionResult> {
  const parsed = payrollRunSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const session = await getServerSession(authOptions);
  const { periodStart, periodEnd } = periodBounds(
    parsed.data.periodStart,
    parsed.data.periodEnd,
  );

  try {
    const settings = await getAppSettings();
    const run = await prisma.$transaction(async (tx) => {
      const employees = await tx.employee.findMany({
        where: { isActive: true },
        include: { branch: { select: { id: true, isShop: true } } },
      });

      const outputs = await tx.productionOutput.groupBy({
        by: ["employeeId"],
        where: {
          employeeId: { not: null },
          outputDate: { gte: periodStart, lte: periodEnd },
        },
        _sum: { quantityGood: true },
      });

      const goodByEmployee = new Map(
        outputs.map((o) => [o.employeeId!, o._sum.quantityGood ?? 0]),
      );

      // Shop sales for commission (branch-level; Sale.soldById is User, not Employee)
      const shopBranchIds = Array.from(
        new Set(
          employees
            .filter((e) => e.branch?.isShop && e.branchId)
            .map((e) => e.branchId!),
        ),
      );

      const shopSalesByBranch = new Map<
        string,
        { revenue: number; unitsSold: number }
      >();
      if (shopBranchIds.length > 0) {
        const sales = await tx.sale.findMany({
          where: {
            branchId: { in: shopBranchIds },
            isReturn: false,
            createdAt: { gte: periodStart, lte: periodEnd },
          },
          select: {
            branchId: true,
            total: true,
            items: { select: { quantity: true } },
          },
        });
        for (const s of sales) {
          const agg = shopSalesByBranch.get(s.branchId) ?? {
            revenue: 0,
            unitsSold: 0,
          };
          agg.revenue += toNumber(s.total);
          agg.unitsSold += s.items.reduce((n, i) => n + i.quantity, 0);
          shopSalesByBranch.set(s.branchId, agg);
        }
      }

      let totalNet = 0;
      const lines = employees.map((e) => {
        const goodUnits = goodByEmployee.get(e.id) ?? 0;
        const baseSalary = prorateBaseSalary(
          toNumber(e.monthlyBaseSalary),
          periodStart,
          periodEnd,
          settings.payrollDaysPerMonth,
        );

        let pieceUnits = goodUnits;
        let piecePay: number;

        if (e.branch?.isShop && e.branchId) {
          const shopSales = shopSalesByBranch.get(e.branchId) ?? {
            revenue: 0,
            unitsSold: 0,
          };
          pieceUnits = shopSales.unitsSold;
          piecePay = computeShopCommission(e, shopSales);
        } else {
          piecePay =
            Math.round(toNumber(e.pieceRatePerUnit) * goodUnits * 100) / 100;
        }

        const netPay = Math.round((baseSalary + piecePay) * 100) / 100;
        totalNet += netPay;

        return {
          employeeId: e.id,
          baseSalary: new Prisma.Decimal(baseSalary),
          goodUnits: pieceUnits,
          piecePay: new Prisma.Decimal(piecePay),
          bonus: new Prisma.Decimal(0),
          deductions: new Prisma.Decimal(0),
          netPay: new Prisma.Decimal(netPay),
        };
      });

      return tx.payrollRun.create({
        data: {
          title: parsed.data.title,
          periodStart,
          periodEnd,
          note: parsed.data.note?.trim() || null,
          totalNet: new Prisma.Decimal(totalNet),
          createdById: session?.user?.id ?? null,
          lines: { create: lines },
        },
      });
    });

    revalidatePath("/payroll");
    return { success: true, id: run.id };
  } catch {
    return { success: false, error: "Could not create payroll run." };
  }
}

export async function updatePayrollLine(
  input: PayrollLineAdjustInput,
): Promise<ActionResult> {
  const parsed = payrollLineAdjustSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const line = await tx.payrollLine.findUnique({
        where: { id: parsed.data.lineId },
      });
      if (!line) throw new Error("Line not found");

      const base = toNumber(line.baseSalary);
      const piece = toNumber(line.piecePay);
      const netPay =
        Math.round(
          (base + piece + parsed.data.bonus - parsed.data.deductions) * 100,
        ) / 100;

      await tx.payrollLine.update({
        where: { id: line.id },
        data: {
          bonus: new Prisma.Decimal(parsed.data.bonus),
          deductions: new Prisma.Decimal(parsed.data.deductions),
          netPay: new Prisma.Decimal(netPay),
          note: parsed.data.note?.trim() || null,
        },
      });

      const allLines = await tx.payrollLine.findMany({
        where: { payrollRunId: line.payrollRunId },
      });
      const totalNet = allLines.reduce(
        (sum, l) =>
          sum +
          (l.id === line.id
            ? netPay
            : toNumber(l.netPay)),
        0,
      );

      await tx.payrollRun.update({
        where: { id: line.payrollRunId },
        data: { totalNet: new Prisma.Decimal(totalNet) },
      });
    });

    revalidatePath("/payroll");
    return { success: true };
  } catch {
    return { success: false, error: "Could not update payroll line." };
  }
}

export async function markPayrollPaid(id: string): Promise<ActionResult> {
  try {
    await prisma.payrollRun.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date() },
    });
    revalidatePath("/payroll");
    revalidatePath(`/payroll/${id}`);
    return { success: true, id };
  } catch {
    return { success: false, error: "Payroll run not found." };
  }
}

export async function deleteDraftPayroll(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    const run = await prisma.payrollRun.findUnique({ where: { id } });
    if (!run) return { success: false, error: "Payroll run not found." };
    if (run.status !== "DRAFT") {
      return {
        success: false,
        error: "Only draft payroll can be deleted. Paid runs are kept for history.",
      };
    }
    await prisma.payrollRun.delete({ where: { id } });
    revalidatePath("/payroll");
    return { success: true, id };
  } catch {
    return { success: false, error: "Could not delete payroll run." };
  }
}
