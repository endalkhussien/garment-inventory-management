import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { formatEtb, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  getShopBranchId,
  isAdminRole,
  isShopRole,
  requireSession,
} from "@/lib/rbac";
import { paymentMethodLabels } from "@/lib/validations/sales";

export default async function ShopFinancePage({
  searchParams,
}: {
  searchParams?: { branchId?: string; days?: string };
}) {
  const session = await requireSession();
  const shopOnly = isShopRole(session.user.role.name);
  const locked = getShopBranchId(session);

  const days = Math.min(90, Math.max(1, Number(searchParams?.days ?? 7) || 7));
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  let branchId = locked ?? searchParams?.branchId;
  if (shopOnly) {
    if (!locked) redirect("/");
    branchId = locked;
  } else if (!isAdminRole(session.user.role.name)) {
    redirect("/");
  }

  const branches = await prisma.branch.findMany({
    where: { isActive: true, isShop: true },
    orderBy: { name: "asc" },
  });
  if (!branchId) branchId = branches[0]?.id;

  const sales = branchId
    ? await prisma.sale.findMany({
        where: {
          branchId,
          createdAt: { gte: since },
        },
        include: { payments: true, items: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const salesOnly = sales.filter((s) => !s.isReturn);
  const returns = sales.filter((s) => s.isReturn);

  const revenue = salesOnly.reduce((sum, s) => sum + toNumber(s.total), 0);
  const returnTotal = returns.reduce((sum, s) => sum + toNumber(s.total), 0);
  const net = revenue - returnTotal;
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

  const branchName =
    branches.find((b) => b.id === branchId)?.name ??
    session.user.branch?.name ??
    "Shop";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Shop finance</h1>
        <p className="mt-1 text-sm text-muted">
          Simple cash summary for {branchName} · last {days} day(s). Sales are
          settled at POS (no open receivables yet).
        </p>
      </div>

      {!shopOnly && (
        <div className="flex flex-wrap gap-2">
          {branches.map((b) => (
            <Link
              key={b.id}
              href={`/shops/finance?branchId=${b.id}&days=${days}`}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                b.id === branchId
                  ? "bg-primary/15 text-primary"
                  : "bg-surface text-muted hover:text-[var(--text-primary)]"
              }`}
            >
              {b.name}
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-sm">
        {[1, 7, 30].map((d) => (
          <Link
            key={d}
            href={
              shopOnly
                ? `/shops/finance?days=${d}`
                : `/shops/finance?branchId=${branchId}&days=${d}`
            }
            className={`rounded-lg px-3 py-1.5 ${
              d === days
                ? "bg-primary/15 text-primary"
                : "bg-surface text-muted"
            }`}
          >
            {d === 1 ? "Today" : `${d} days`}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-muted">Gross sales</p>
          <p className="text-xl font-semibold">{formatEtb(revenue)}</p>
          <p className="text-xs text-muted">{salesOnly.length} receipts</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Returns</p>
          <p className="text-xl font-semibold">{formatEtb(returnTotal)}</p>
          <p className="text-xs text-muted">{returns.length} returns</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Net</p>
          <p className="text-xl font-semibold">{formatEtb(net)}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Units sold</p>
          <p className="text-xl font-semibold">{unitsSold}</p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">By payment method</h2>
        <ul className="space-y-2 text-sm">
          {Object.entries(byMethod).map(([method, amount]) => (
            <li key={method} className="flex justify-between border-b border-border/40 pb-2">
              <span>
                {paymentMethodLabels[
                  method as keyof typeof paymentMethodLabels
                ] ?? method}
              </span>
              <span className="font-medium">{formatEtb(amount)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-page text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-3">Receipt</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Total</th>
              <th className="px-3 py-3">When</th>
            </tr>
          </thead>
          <tbody>
            {sales.slice(0, 40).map((s) => (
              <tr key={s.id} className="border-t border-border/60">
                <td className="px-3 py-3">
                  <Link
                    href={`/sales/${s.id}`}
                    className="text-secondary hover:underline"
                  >
                    {s.receiptNumber}
                  </Link>
                </td>
                <td className="px-3 py-3">
                  {s.isReturn ? "Return" : "Sale"}
                </td>
                <td className="px-3 py-3">{formatEtb(toNumber(s.total))}</td>
                <td className="px-3 py-3 text-muted">
                  {s.createdAt.toLocaleString("en-ET")}
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-muted">
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
