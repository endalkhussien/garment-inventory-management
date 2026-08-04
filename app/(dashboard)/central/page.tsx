import Link from "next/link";
import {
  AlertTriangle,
  Package,
  Store,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatEtb, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";

function parseShopIds(raw?: string): string[] {
  if (!raw || raw === "all") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toggleShopInList(current: string[], shopId: string): string {
  const set = new Set(current);
  if (set.has(shopId)) set.delete(shopId);
  else set.add(shopId);
  const next = Array.from(set);
  return next.length === 0 ? "all" : next.join(",");
}

export default async function CentralInventoryPage({
  searchParams,
}: {
  searchParams?: {
    shops?: string;
    days?: string;
    view?: string;
  };
}) {
  await requireAdmin();

  const allShops = await prisma.branch.findMany({
    where: { isShop: true, isActive: true },
    orderBy: { name: "asc" },
  });

  const selectedIds = parseShopIds(searchParams?.shops);
  const filterIds =
    selectedIds.length > 0
      ? selectedIds.filter((id) => allShops.some((s) => s.id === id))
      : allShops.map((s) => s.id);

  const days = Math.min(90, Math.max(1, Number(searchParams?.days ?? 30) || 30));
  const view = searchParams?.view ?? "overview";
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const shopWhere =
    filterIds.length > 0
      ? { branchId: { in: filterIds } }
      : { branchId: "__none__" };

  const [stocks, sales, movements, expenses] = await Promise.all([
    prisma.finishedGoodsStock.findMany({
      where: shopWhere,
      include: {
        variant: { include: { product: { include: { category: true } } } },
        branch: true,
      },
      orderBy: { quantity: "asc" },
    }),
    prisma.sale.findMany({
      where: {
        ...shopWhere,
        createdAt: { gte: since },
        isReturn: false,
      },
      include: {
        items: {
          include: { variant: { include: { product: true } } },
        },
        branch: true,
      },
    }),
    prisma.finishedGoodsMovement.findMany({
      where: {
        ...shopWhere,
        createdAt: { gte: since },
      },
      include: {
        variant: { include: { product: true } },
        branch: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.expense.findMany({
      where: {
        ...shopWhere,
        expenseDate: { gte: since },
      },
    }),
  ]);

  const scopeLabel =
    selectedIds.length === 0
      ? "All shops (combined)"
      : selectedIds.length === 1
        ? allShops.find((s) => s.id === selectedIds[0])?.name ?? "Shop"
        : `${selectedIds.length} shops selected`;

  const totalUnits = stocks.reduce((sum, s) => sum + s.quantity, 0);
  const inventoryValue = stocks.reduce(
    (sum, s) => sum + s.quantity * toNumber(s.variant.buyingPrice),
    0,
  );
  const lowStock = stocks.filter((s) => s.quantity <= s.reorderAt);

  let revenue = 0;
  let cogs = 0;
  const productSales = new Map<
    string,
    { name: string; code: string; qty: number; revenue: number; cogs: number }
  >();

  for (const sale of sales) {
    revenue += toNumber(sale.total);
    for (const item of sale.items) {
      const buy = toNumber(item.variant.buyingPrice);
      const lineCogs = buy * item.quantity;
      cogs += lineCogs;
      const key = item.variant.productId;
      const prev = productSales.get(key) ?? {
        name: item.variant.product.name,
        code: item.variant.product.code ?? item.variant.sku,
        qty: 0,
        revenue: 0,
        cogs: 0,
      };
      prev.qty += item.quantity;
      prev.revenue += toNumber(item.lineTotal);
      prev.cogs += lineCogs;
      productSales.set(key, prev);
    }
  }

  const expenseTotal = expenses.reduce(
    (sum, e) => sum + toNumber(e.amount),
    0,
  );
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - expenseTotal;

  const ranked = Array.from(productSales.values()).sort(
    (a, b) => b.qty - a.qty,
  );

  // Per-shop rollup for table
  const shopRows = allShops
    .filter((s) => filterIds.includes(s.id))
    .map((shop) => {
      const shopStocks = stocks.filter((st) => st.branchId === shop.id);
      const units = shopStocks.reduce((sum, s) => sum + s.quantity, 0);
      const value = shopStocks.reduce(
        (sum, s) => sum + s.quantity * toNumber(s.variant.buyingPrice),
        0,
      );
      const low = shopStocks.filter((s) => s.quantity <= s.reorderAt).length;
      const shopSales = sales.filter((s) => s.branchId === shop.id);
      const shopRev = shopSales.reduce(
        (sum, s) => sum + toNumber(s.total),
        0,
      );
      return { shop, units, value, low, shopRev, receipts: shopSales.length };
    });

  const shopsParam = searchParams?.shops ?? "all";
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    p.set("shops", patch.shops ?? shopsParam);
    p.set("days", patch.days ?? String(days));
    p.set("view", patch.view ?? view);
    return `/central?${p.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Roll-up of shop inventories
        </p>
        <h1 className="text-2xl font-semibold">Central inventory</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Central does not hold its own stock. Numbers below are the{" "}
          <strong className="font-medium text-[var(--text-primary)]">
            sum of selected shops
          </strong>
          . Pick one shop, several, or all.
        </p>
      </div>

      {/* Shop filter */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Filter shops</p>
          <span className="text-xs text-muted">{scopeLabel}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={qs({ shops: "all" })}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              selectedIds.length === 0
                ? "bg-primary text-on-primary"
                : "bg-surface text-muted hover:text-[var(--text-primary)]"
            }`}
          >
            All shops
          </Link>
          {allShops.map((s) => {
            const active =
              selectedIds.length === 0 || selectedIds.includes(s.id);
            const isSingleSelected =
              selectedIds.length > 0 && selectedIds.includes(s.id);
            return (
              <Link
                key={s.id}
                href={qs({
                  shops: toggleShopInList(
                    selectedIds.length === 0 ? [] : selectedIds,
                    s.id,
                  ),
                })}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  selectedIds.length === 0
                    ? "border border-border/60 bg-surface/50 text-secondary"
                    : isSingleSelected
                      ? "bg-primary/15 text-primary"
                      : "bg-surface text-muted"
                }`}
                title={
                  selectedIds.length === 0
                    ? "Click to focus this shop only from All"
                    : active
                      ? "Remove from filter"
                      : "Add to filter"
                }
              >
                {s.name}
              </Link>
            );
          })}
        </div>
        {allShops.length === 0 && (
          <p className="text-sm text-muted">
            No open shops.{" "}
            <Link href="/setup/shops/new" className="text-secondary underline">
              Create a shop
            </Link>
          </p>
        )}
        <div className="flex flex-wrap gap-2 border-t border-border/40 pt-3 text-sm">
          <span className="text-muted self-center">Period:</span>
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={qs({ days: String(d) })}
              className={`rounded-lg px-3 py-1.5 ${
                d === days
                  ? "bg-primary/15 text-primary"
                  : "bg-surface text-muted"
              }`}
            >
              {d}d
            </Link>
          ))}
          <span className="text-muted self-center ml-2">View:</span>
          {(
            [
              ["overview", "Overview"],
              ["stock", "Stock lines"],
              ["movements", "Movements"],
              ["products", "Products"],
            ] as const
          ).map(([id, label]) => (
            <Link
              key={id}
              href={qs({ view: id })}
              className={`rounded-lg px-3 py-1.5 ${
                view === id
                  ? "bg-primary/15 text-primary"
                  : "bg-surface text-muted"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Units in selection"
          value={totalUnits.toLocaleString("en-ET")}
          hint="Shop stock only"
          icon={Package}
        />
        <KpiCard
          label="Stock alerts"
          value={String(lowStock.length)}
          variant={lowStock.length > 0 ? "warning" : "success"}
          icon={AlertTriangle}
        />
        <KpiCard
          label={`Sales (${days}d)`}
          value={formatEtb(revenue)}
          hint={`${sales.length} receipts`}
          icon={Store}
        />
        <KpiCard
          label="Inventory at cost"
          value={formatEtb(inventoryValue)}
          hint="Buying price × qty"
          icon={Package}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-muted">Gross profit</p>
          <p className="text-xl font-semibold">{formatEtb(grossProfit)}</p>
          <p className="text-xs text-muted">Rev − COGS {formatEtb(cogs)}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Expenses</p>
          <p className="text-xl font-semibold">{formatEtb(expenseTotal)}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Net after expenses</p>
          <p
            className={`text-xl font-semibold ${
              netProfit >= 0 ? "text-success" : "text-danger"
            }`}
          >
            {formatEtb(netProfit)}
          </p>
        </Card>
      </div>

      {(view === "overview" || view === "stock") && (
        <Card>
          <div className="mb-3 flex flex-wrap justify-between gap-2">
            <h2 className="text-sm font-semibold">
              Shops in this view
            </h2>
            <Link
              href="/shops/finance"
              className="text-xs text-secondary hover:underline"
            >
              Finance insights →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr>
                  <th className="pb-2 pr-3">Shop</th>
                  <th className="pb-2 pr-3">Units</th>
                  <th className="pb-2 pr-3">At cost</th>
                  <th className="pb-2 pr-3">Alerts</th>
                  <th className="pb-2 pr-3">Sales period</th>
                  <th className="pb-2">Focus</th>
                </tr>
              </thead>
              <tbody>
                {shopRows.map(
                  ({ shop, units, value, low, shopRev, receipts }) => (
                    <tr key={shop.id} className="border-t border-border/50">
                      <td className="py-2 pr-3 font-medium">{shop.name}</td>
                      <td className="py-2 pr-3">{units}</td>
                      <td className="py-2 pr-3">{formatEtb(value)}</td>
                      <td className="py-2 pr-3">
                        {low > 0 ? (
                          <span className="text-warning">{low}</span>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {formatEtb(shopRev)}
                        <span className="text-xs text-muted">
                          {" "}
                          · {receipts}
                        </span>
                      </td>
                      <td className="py-2">
                        <Link
                          href={qs({ shops: shop.id })}
                          className="text-secondary hover:underline"
                        >
                          Only this
                        </Link>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {view === "stock" && (
        <Card className="overflow-x-auto p-0">
          <div className="border-b border-border/40 px-4 py-3">
            <h2 className="text-sm font-semibold">
              Stock lines ({stocks.length})
            </h2>
          </div>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-page/40 text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">Code</th>
                <th className="px-3 py-3">Shop</th>
                <th className="px-3 py-3">Qty</th>
                <th className="px-3 py-3">Alert</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((s) => (
                <tr key={s.id} className="border-t border-border/50">
                  <td className="px-3 py-2">
                    {s.variant.product.name} ({s.variant.size}/
                    {s.variant.color})
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {s.variant.product.code ?? s.variant.sku}
                  </td>
                  <td className="px-3 py-2 text-muted">{s.branch.name}</td>
                  <td className="px-3 py-2">{s.quantity}</td>
                  <td className="px-3 py-2">{s.reorderAt}</td>
                  <td className="px-3 py-2">
                    {s.quantity <= s.reorderAt ? (
                      <Badge variant="warning">Low</Badge>
                    ) : (
                      <Badge variant="success">OK</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {stocks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-muted">
                    No stock in selected shops.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {view === "movements" && (
        <Card className="overflow-x-auto p-0">
          <div className="border-b border-border/40 px-4 py-3">
            <h2 className="text-sm font-semibold">
              Movements in period (from shops)
            </h2>
          </div>
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-3">When</th>
                <th className="px-3 py-3">Shop</th>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Δ</th>
                <th className="px-3 py-3">Balance</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-t border-border/50">
                  <td className="px-3 py-2 text-xs text-muted">
                    {m.createdAt.toLocaleString("en-ET")}
                  </td>
                  <td className="px-3 py-2">{m.branch.name}</td>
                  <td className="px-3 py-2">
                    {m.variant.product.name}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {m.type.replace(/_/g, " ")}
                  </td>
                  <td
                    className={`px-3 py-2 font-medium ${
                      m.delta >= 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </td>
                  <td className="px-3 py-2">{m.balanceAfter}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-muted">
                    No movements in this period for the selected shops.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {(view === "products" || view === "overview") && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4" />
              Best sellers ({days}d)
            </h2>
            <ul className="space-y-2 text-sm">
              {ranked.slice(0, 8).map((p) => (
                <li
                  key={p.code}
                  className="flex justify-between border-b border-border/40 pb-2"
                >
                  <span>
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted"> · {p.code}</span>
                  </span>
                  <span>
                    {p.qty} · {formatEtb(p.revenue - p.cogs)}
                  </span>
                </li>
              ))}
              {ranked.length === 0 && (
                <li className="text-muted">No sales yet in selection.</li>
              )}
            </ul>
          </Card>
          <Card>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <TrendingDown className="h-4 w-4" />
              Slower movers
            </h2>
            <ul className="space-y-2 text-sm">
              {ranked
                .slice()
                .reverse()
                .slice(0, 8)
                .map((p) => (
                  <li
                    key={`slow-${p.code}`}
                    className="flex justify-between border-b border-border/40 pb-2"
                  >
                    <span>
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted"> · {p.code}</span>
                    </span>
                    <span className="text-muted">{p.qty} sold</span>
                  </li>
                ))}
              {ranked.length === 0 && (
                <li className="text-muted">Not enough data.</li>
              )}
            </ul>
          </Card>
        </div>
      )}

      {lowStock.length > 0 && view === "overview" && (
        <Card className="border-warning/40">
          <h2 className="mb-3 text-sm font-semibold text-warning">
            Stock alerts in selected shops
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 text-sm">
            {lowStock.slice(0, 12).map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-border/50 px-3 py-2"
              >
                <span className="font-medium">{s.variant.product.name}</span>
                <span className="text-muted">
                  {" "}
                  · {s.branch.name} · {s.quantity} left
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
