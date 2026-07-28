import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/format";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function getFactoryDashboardMetrics() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = daysAgo(7);
  const monthStart = daysAgo(30);
  const prevWeekStart = daysAgo(14);

  const [
    outputsToday,
    outputsThisWeek,
    outputsPrevWeek,
    outputsThisMonth,
    inProgressOrders,
    recentOrders,
    lowMaterials,
    finishedUnits,
    materialCount,
    activeEmployees,
    recentOutputs,
  ] = await Promise.all([
    prisma.productionOutput.aggregate({
      where: { outputDate: { gte: todayStart } },
      _sum: { quantityGood: true, quantityRejected: true },
    }),
    prisma.productionOutput.aggregate({
      where: { outputDate: { gte: weekStart } },
      _sum: { quantityGood: true, quantityRejected: true },
    }),
    prisma.productionOutput.aggregate({
      where: { outputDate: { gte: prevWeekStart, lt: weekStart } },
      _sum: { quantityGood: true, quantityRejected: true },
    }),
    prisma.productionOutput.aggregate({
      where: { outputDate: { gte: monthStart } },
      _sum: { quantityGood: true, quantityRejected: true },
    }),
    prisma.productionOrder.findMany({
      where: { status: "IN_PROGRESS" },
      include: { variant: { include: { product: true } } },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.productionOrder.findMany({
      where: { status: { in: ["IN_PROGRESS", "COMPLETED"] } },
      include: { variant: { include: { product: true } } },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.rawMaterial.findMany({ where: { isActive: true } }),
    prisma.finishedGoodsStock.aggregate({ _sum: { quantity: true } }),
    prisma.rawMaterial.count({ where: { isActive: true } }),
    prisma.employee.count({ where: { isActive: true } }),
    prisma.productionOutput.findMany({
      where: { outputDate: { gte: monthStart } },
      select: {
        outputDate: true,
        quantityGood: true,
        quantityRejected: true,
      },
      orderBy: { outputDate: "asc" },
    }),
  ]);

  const goodToday = outputsToday._sum.quantityGood ?? 0;
  const goodWeek = outputsThisWeek._sum.quantityGood ?? 0;
  const rejectedWeek = outputsThisWeek._sum.quantityRejected ?? 0;
  const goodPrevWeek = outputsPrevWeek._sum.quantityGood ?? 0;
  const goodMonth = outputsThisMonth._sum.quantityGood ?? 0;
  const rejectedMonth = outputsThisMonth._sum.quantityRejected ?? 0;

  const weekTotal = goodWeek + rejectedWeek;
  const defectRate =
    weekTotal === 0 ? 0 : Math.round((rejectedWeek / weekTotal) * 1000) / 10;

  const monthTotal = goodMonth + rejectedMonth;
  const monthDefectRate =
    monthTotal === 0
      ? 0
      : Math.round((rejectedMonth / monthTotal) * 1000) / 10;

  const weekGrowth =
    goodPrevWeek === 0
      ? goodWeek > 0
        ? 100
        : 0
      : Math.round(((goodWeek - goodPrevWeek) / goodPrevWeek) * 1000) / 10;

  const targetUnits = inProgressOrders.reduce(
    (sum, o) => sum + o.quantityTarget,
    0,
  );
  const producedUnits = inProgressOrders.reduce(
    (sum, o) => sum + o.quantityGood,
    0,
  );
  const efficiency =
    targetUnits === 0
      ? 0
      : Math.round((producedUnits / targetUnits) * 1000) / 10;

  const lowCount = lowMaterials.filter(
    (m) => toNumber(m.quantity) <= toNumber(m.reorderThreshold),
  ).length;

  const materialValue = lowMaterials.reduce(
    (sum, m) => sum + toNumber(m.quantity) * toNumber(m.costPerUnit),
    0,
  );

  const productionByDay = new Map<string, number>();
  for (const row of recentOutputs) {
    const key = formatDateKey(row.outputDate);
    productionByDay.set(
      key,
      (productionByDay.get(key) ?? 0) + row.quantityGood,
    );
  }

  const productionSeries = Array.from(productionByDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));

  const inventoryRows = lowMaterials
    .map((m) => {
      const qty = toNumber(m.quantity);
      const threshold = toNumber(m.reorderThreshold);
      let status: "In stock" | "Low stock" | "Out of stock" = "In stock";
      if (qty <= 0) status = "Out of stock";
      else if (qty <= threshold) status = "Low stock";
      return {
        id: m.id,
        name: m.name,
        category: m.unitOfMeasure,
        stock: qty,
        status,
      };
    })
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 8);

  return {
    kpis: {
      unitsToday: goodToday,
      unitsThisWeek: goodWeek,
      weekGrowth,
      efficiency,
      defectRate,
      monthDefectRate,
      lowMaterials: lowCount,
      finishedUnits: finishedUnits._sum.quantity ?? 0,
      materialCount,
      materialValue,
      activeEmployees,
      inProgressCount: inProgressOrders.length,
    },
    productionSeries,
    currentOrders: recentOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      name: o.variant.product.name,
      variant: `${o.variant.size}/${o.variant.color}`,
      good: o.quantityGood,
      target: o.quantityTarget,
      status: o.status,
      startedAt: o.startedAt,
    })),
    inventoryRows,
  };
}

export async function getEmployeePerformance(periodDays = 30) {
  const since = daysAgo(periodDays);

  const [employees, outputs] = await Promise.all([
    prisma.employee.findMany({
      where: { isActive: true },
      include: { branch: true },
      orderBy: { name: "asc" },
    }),
    prisma.productionOutput.groupBy({
      by: ["employeeId"],
      where: {
        employeeId: { not: null },
        outputDate: { gte: since },
      },
      _sum: { quantityGood: true, quantityRejected: true },
      _count: { id: true },
    }),
  ]);

  const stats = new Map(
    outputs.map((o) => [
      o.employeeId!,
      {
        good: o._sum.quantityGood ?? 0,
        rejected: o._sum.quantityRejected ?? 0,
        entries: o._count.id,
      },
    ]),
  );

  const rows = employees
    .map((e) => {
      const s = stats.get(e.id) ?? { good: 0, rejected: 0, entries: 0 };
      const total = s.good + s.rejected;
      const defect =
        total === 0 ? 0 : Math.round((s.rejected / total) * 1000) / 10;
      const piecePay = toNumber(e.pieceRatePerUnit) * s.good;
      return {
        id: e.id,
        name: e.name,
        code: e.code,
        branch: e.branch?.name ?? "—",
        good: s.good,
        rejected: s.rejected,
        defect,
        entries: s.entries,
        monthlyBaseSalary: toNumber(e.monthlyBaseSalary),
        pieceRatePerUnit: toNumber(e.pieceRatePerUnit),
        estimatedPiecePay: piecePay,
      };
    })
    .sort((a, b) => b.good - a.good);

  return { rows, periodDays, since };
}
