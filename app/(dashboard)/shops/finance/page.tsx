import Link from "next/link";
import { redirect } from "next/navigation";

import {
  FinancePieChart,
  FinanceShopCompareChart,
  FinanceTrendChart,
} from "@/components/finance/finance-charts";
import { ExpenseForm } from "@/components/shops/expense-form";
import { Card } from "@/components/ui/card";
import { formatEtb, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { isAdminRole, requireSession } from "@/lib/rbac";
import { expenseCategoryLabels } from "@/lib/validations/expenses";
import { paymentMethodLabels } from "@/lib/validations/sales";

function parseShopIds(raw?: string): string[] {
  if (!raw || raw === "all") return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function toggleShop(current: string[], shopId: string): string {
  const set = new Set(current);
  if (set.has(shopId)) set.delete(shopId);
  else set.add(shopId);
  const next = Array.from(set);
  return next.length === 0 ? "all" : next.join(",");
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams?: { shops?: string; days?: string };
}) {
  const session = await requireSession();
  if (!isAdminRole(session.user.role.name)) {
    redirect("/");
  }

  const allShops = await prisma.branch.findMany({
    where: { isActive: true, isShop: true },
    orderBy: { name: "asc" },
  });

  const selectedIds = parseShopIds(searchParams?.shops);
  const filterIds =
    selectedIds.length > 0
      ? selectedIds.filter((id) => allShops.some((s) => s.id === id))
      : allShops.map((s) => s.id);

  const days = Math.min(90, Math.max(1, Number(searchParams?.days ?? 30) || 30));
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const shopWhere =
    filterIds.length > 0
      ? { branchId: { in: filterIds } }
      : { branchId: "__none__" };

  const [sales, expenses, staff] = await Promise.all([
    prisma.sale.findMany({
      where: { ...shopWhere, createdAt: { gte: since } },
      include: {
        payments: true,
        items: { include: { variant: true } },
        branch: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.expense.findMany({
      where: { ...shopWhere, expenseDate: { gte: since } },
      orderBy: { expenseDate: "desc" },
    }),
    prisma.employee.findMany({
      where: {
        isActive: true,
        branchId: { in: filterIds.length ? filterIds : ["__none__"] },
      },
    }),
  ]);

  const salesOnly = sales.filter((s) => !s.isReturn);
  const returns = sales.filter((s) => s.isReturn);
  const revenue = salesOnly.reduce((sum, s) => sum + toNumber(s.total), 0);
  const returnTotal = returns.reduce(
    (sum, s) => sum + Math.abs(toNumber(s.total)),
    0,
  );

  let cogs = 0;
  for (const s of salesOnly) {
    for (const item of s.items) {
      cogs += toNumber(item.variant.buyingPrice) * item.quantity;
    }
  }

  const expenseTotal = expenses.reduce(
    (sum, e) => sum + toNumber(e.amount),
    0,
  );
  const grossProfit = revenue - returnTotal - cogs;
  const netBeforeStaff = grossProfit - expenseTotal;

  // Staff cost estimate: monthly salary * (days/30) + commission% of revenue (each staff's % applied — total can exceed 100 intentionally as each has own %)
  const salaryPortion =
    staff.reduce((sum, e) => sum + toNumber(e.monthlyBaseSalary), 0) *
    (days / 30);
  // Shop staff: pieceRatePerUnit holds commission % of sales
  const commissionPortion = staff.reduce(
    (sum, e) => sum + (revenue * toNumber(e.pieceRatePerUnit)) / 100,
    0,
  );
  const staffCost = salaryPortion + commissionPortion;
  const netAfterStaff = netBeforeStaff - staffCost;

  const unitsSold = salesOnly.reduce(
    (sum, s) => sum + s.items.reduce((a, i) => a + i.quantity, 0),
    0,
  );

  const byMethod: Record<string, number> = {
    CASH: 0,
    MOBILE_MONEY: 0,
    BANK_TRANSFER: 0,
  };
  for (const s of salesOnly) {
    for (const p of s.payments) {
      byMethod[p.method] =
        (byMethod[p.method] ?? 0) + toNumber(p.amount);
    }
  }

  const byExpenseCat = new Map<string, number>();
  for (const e of expenses) {
    byExpenseCat.set(
      e.category,
      (byExpenseCat.get(e.category) ?? 0) + toNumber(e.amount),
    );
  }

  // Daily trend
  const dayMap = new Map<string, { sales: number; expenses: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toLocaleDateString("en-ET", {
      month: "short",
      day: "numeric",
    });
    dayMap.set(key, { sales: 0, expenses: 0 });
  }
  for (const s of salesOnly) {
    const key = s.createdAt.toLocaleDateString("en-ET", {
      month: "short",
      day: "numeric",
    });
    const row = dayMap.get(key);
    if (row) row.sales += toNumber(s.total);
  }
  for (const e of expenses) {
    const key = e.expenseDate.toLocaleDateString("en-ET", {
      month: "short",
      day: "numeric",
    });
    const row = dayMap.get(key);
    if (row) row.expenses += toNumber(e.amount);
  }
  const trend = Array.from(dayMap.entries()).map(([date, v]) => ({
    date,
    sales: Math.round(v.sales * 100) / 100,
    expenses: Math.round(v.expenses * 100) / 100,
  }));

  // Shop compare
  const shopCompare = allShops
    .filter((s) => filterIds.includes(s.id))
    .map((shop) => {
      const shopSales = salesOnly.filter((s) => s.branchId === shop.id);
      const rev = shopSales.reduce((sum, s) => sum + toNumber(s.total), 0);
      let shopCogs = 0;
      for (const s of shopSales) {
        for (const item of s.items) {
          shopCogs += toNumber(item.variant.buyingPrice) * item.quantity;
        }
      }
      return {
        label: shop.name.length > 12 ? shop.name.slice(0, 12) + "…" : shop.name,
        revenue: Math.round(rev * 100) / 100,
        cogs: Math.round(shopCogs * 100) / 100,
        profit: Math.round((rev - shopCogs) * 100) / 100,
      };
    });

  const marginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMarginPct = revenue > 0 ? (netAfterStaff / revenue) * 100 : 0;

  const shopsParam = searchParams?.shops ?? "all";
  const qs = (patch: { shops?: string; days?: string }) => {
    const p = new URLSearchParams();
    p.set("shops", patch.shops ?? shopsParam);
    p.set("days", patch.days ?? String(days));
    return `/shops/finance?${p.toString()}`;
  };

  const scope =
    selectedIds.length === 0
      ? "All shops"
      : selectedIds.length === 1
        ? allShops.find((s) => s.id === selectedIds[0])?.name
        : `${selectedIds.length} shops`;

  const pnlRows = [
    { label: "Gross sales", amount: revenue, tone: "default" as const },
    { label: "Returns", amount: -returnTotal, tone: "muted" as const },
    { label: "COGS", amount: -cogs, tone: "muted" as const },
    {
      label: "Gross profit",
      amount: grossProfit,
      tone: "emphasis" as const,
      hint: `${marginPct.toFixed(1)}% margin`,
    },
    { label: "Operating expenses", amount: -expenseTotal, tone: "muted" as const },
    { label: "Staff (salary + commission)", amount: -staffCost, tone: "muted" as const },
    {
      label: "Net profit",
      amount: netAfterStaff,
      tone: "net" as const,
      hint: `${netMarginPct.toFixed(1)}% of sales`,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Finance</h1>
          <p className="mt-1 text-sm text-muted">
            {scope} · {days} days
          </p>
        </div>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href={qs({ shops: "all" })}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              selectedIds.length === 0
                ? "bg-primary text-on-primary"
                : "bg-page text-muted"
            }`}
          >
            All shops
          </Link>
          {allShops.map((s) => {
            const selected =
              selectedIds.length > 0 && selectedIds.includes(s.id);
            return (
              <Link
                key={s.id}
                href={qs({
                  shops: toggleShop(
                    selectedIds.length === 0 ? [] : selectedIds,
                    s.id,
                  ),
                })}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  selected
                    ? "bg-primary/15 text-primary"
                    : "bg-page text-muted"
                }`}
              >
                {s.name}
              </Link>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {[7, 14, 30, 90].map((d) => (
            <Link
              key={d}
              href={qs({ days: String(d) })}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                d === days ? "bg-primary/15 text-primary" : "bg-page text-muted"
              }`}
            >
              {d}d
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Sales</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatEtb(revenue)}
          </p>
          <p className="text-xs text-muted">
            {salesOnly.length} receipts · {unitsSold} units
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Gross profit</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-success">
            {formatEtb(grossProfit)}
          </p>
          <p className="text-xs text-muted">{marginPct.toFixed(1)}% margin</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Expenses + staff</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatEtb(expenseTotal + staffCost)}
          </p>
          <p className="text-xs text-muted">
            Op {formatEtb(expenseTotal)} · Staff {formatEtb(staffCost)}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Net profit</p>
          <p
            className={`mt-1 text-2xl font-semibold tabular-nums ${
              netAfterStaff >= 0 ? "text-success" : "text-danger"
            }`}
          >
            {formatEtb(netAfterStaff)}
          </p>
          <p className="text-xs text-muted">{netMarginPct.toFixed(1)}% of sales</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold">P&amp;L</h2>
          <ul className="space-y-0 text-sm">
            {pnlRows.map((row) => (
              <li
                key={row.label}
                className={`flex items-baseline justify-between gap-3 border-b border-border/50 py-2.5 last:border-0 ${
                  row.tone === "emphasis" || row.tone === "net"
                    ? "font-semibold"
                    : ""
                }`}
              >
                <span>
                  <span
                    className={
                      row.tone === "net"
                        ? netAfterStaff >= 0
                          ? "text-success"
                          : "text-danger"
                        : undefined
                    }
                  >
                    {row.label}
                  </span>
                  {row.hint && (
                    <span className="mt-0.5 block text-[11px] font-normal text-muted">
                      {row.hint}
                    </span>
                  )}
                </span>
                <span
                  className={`tabular-nums ${
                    row.tone === "net"
                      ? netAfterStaff >= 0
                        ? "text-success"
                        : "text-danger"
                      : row.amount < 0
                        ? "text-muted"
                        : ""
                  }`}
                >
                  {formatEtb(row.amount)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <div className="grid gap-4 lg:col-span-2">
          <FinanceTrendChart series={trend} />
          <FinanceShopCompareChart rows={shopCompare} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FinancePieChart
          title="Payment methods"
          slices={Object.entries(byMethod).map(([name, value]) => ({
            name:
              paymentMethodLabels[name as keyof typeof paymentMethodLabels] ??
              name,
            value,
          }))}
        />
        <FinancePieChart
          title="Expense categories"
          slices={Array.from(byExpenseCat.entries()).map(([cat, value]) => ({
            name:
              expenseCategoryLabels[
                cat as keyof typeof expenseCategoryLabels
              ] ?? cat,
            value,
          }))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Record expense</h2>
          <ExpenseForm
            branches={allShops}
            defaultBranchId={filterIds[0] ?? allShops[0]?.id}
          />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold">
            Staff ({staff.length})
          </h2>
          <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
            {staff.map((e) => {
              const sal = toNumber(e.monthlyBaseSalary) * (days / 30);
              const comm = (revenue * toNumber(e.pieceRatePerUnit)) / 100;
              return (
                <li
                  key={e.id}
                  className="flex justify-between border-b border-border/40 pb-2"
                >
                  <span>
                    <span className="font-medium">{e.name}</span>
                    <span className="text-muted">
                      {" "}
                      · {toNumber(e.pieceRatePerUnit)}%
                    </span>
                  </span>
                  <span className="tabular-nums">{formatEtb(sal + comm)}</span>
                </li>
              );
            })}
            {staff.length === 0 && (
              <li className="text-muted">No staff in selection.</li>
            )}
          </ul>
        </Card>
      </div>

      <Card className="overflow-x-auto p-0">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">
          Recent sales
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--bg-elevated)] text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-3">Receipt</th>
              <th className="px-3 py-3">Shop</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Total</th>
              <th className="px-3 py-3">When</th>
            </tr>
          </thead>
          <tbody>
            {sales.slice(0, 40).map((s) => (
              <tr key={s.id} className="border-t border-border/50">
                <td className="px-3 py-2 font-mono text-xs">
                  {s.receiptNumber}
                </td>
                <td className="px-3 py-2">{s.branch.name}</td>
                <td className="px-3 py-2">
                  {s.isReturn ? "Return" : "Sale"}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {formatEtb(toNumber(s.total))}
                </td>
                <td className="px-3 py-2 text-xs text-muted">
                  {s.createdAt.toLocaleString("en-ET")}
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-muted">
                  No sales in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
