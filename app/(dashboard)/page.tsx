import Link from "next/link";
import {
  AlertTriangle,
  Package,
  PackagePlus,
  ShoppingBag,
  Store,
  TrendingUp,
  Upload,
  WalletCards,
} from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatEtb, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  getShopBranchId,
  isShopRole,
  requireSession,
} from "@/lib/rbac";

export default async function DashboardPage() {
  const session = await requireSession();
  const shopBranchId = getShopBranchId(session);

  if (isShopRole(session.user.role.name)) {
    return (
      <ShopDashboard
        branchId={shopBranchId}
        branchName={session.user.branch?.name}
      />
    );
  }

  return <CentralDashboard />;
}

async function ShopDashboard({
  branchId,
  branchName,
}: {
  branchId: string | null;
  branchName?: string | null;
}) {
  if (!branchId) {
    return (
      <div className="space-y-2">
        <h1 className="page-title">Shop Manager Dashboard</h1>
        <p className="text-sm text-danger">No shop assigned to this account.</p>
      </div>
    );
  }

  const stocks = await prisma.finishedGoodsStock.findMany({
    where: { branchId },
    include: { variant: { include: { product: true } } },
  });
  const low = stocks.filter((s) => s.quantity <= s.reorderAt);
  const units = stocks.reduce((sum, s) => sum + s.quantity, 0);
  const skus = stocks.length;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const todaySales = await prisma.sale.findMany({
    where: {
      branchId,
      isReturn: false,
      createdAt: { gte: start },
    },
  });
  const revenue = todaySales.reduce((sum, s) => sum + toNumber(s.total), 0);

  const recentMoves = await prisma.finishedGoodsMovement.findMany({
    where: { branchId },
    include: { variant: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Shop Manager Dashboard</h1>
          <p className="page-subtitle flex items-center gap-1.5">
            <Store className="h-4 w-4" />
            {branchName ?? "Branch"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button asChild className="flex-1 sm:flex-none">
            <Link href="/shops/sales">
              <ShoppingBag className="h-4 w-4" />
              Record / import sale
            </Link>
          </Button>
          <Button asChild variant="secondary" className="flex-1 sm:flex-none">
            <Link href="/shops/restock">Restock</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="On hand"
          value={units.toLocaleString("en-ET")}
          hint={`${skus} SKUs`}
          icon={Package}
          accent="blue"
        />
        <KpiCard
          label="Low stock"
          value={String(low.length)}
          variant={low.length > 0 ? "warning" : "success"}
          icon={AlertTriangle}
          accent="amber"
          alert={low.length > 0}
        />
        <KpiCard
          label="Today sales"
          value={formatEtb(revenue)}
          hint={`${todaySales.length} receipts`}
          icon={TrendingUp}
          accent="green"
        />
        <KpiCard
          label="Products"
          value={String(new Set(stocks.map((s) => s.variant.productId)).size)}
          icon={ShoppingBag}
          accent="violet"
        />
      </div>

      {low.length > 0 && (
        <Card className="border-[var(--error-container)] bg-[var(--error-container)]/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-danger">
              {low.length} items need restock
            </p>
            <Button asChild size="sm" variant="secondary">
              <Link href="/shops/restock">Restock now</Link>
            </Button>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {low.slice(0, 5).map((s) => (
              <li key={s.id}>
                {s.variant.product.name} · {s.variant.size}/{s.variant.color} —{" "}
                <span className="font-data font-medium text-warning">
                  {s.quantity}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <p className="label-caps mb-3">Quick actions</p>
          <div className="grid gap-2">
            {[
              { href: "/products/new", label: "New product" },
              { href: "/shops/stock", label: "View stock" },
              { href: "/shops/sales", label: "Sales / import" },
              { href: "/shops/staff", label: "Staff" },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="rounded-lg border border-border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--surface-container-low)]"
              >
                {a.label}
              </Link>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-[var(--bg-page)] px-4 py-3">
            <h3 className="text-lg font-semibold">Recent activity</h3>
            <Link
              href="/shops/stock"
              className="text-sm font-medium text-secondary hover:text-[var(--text-primary)]"
            >
              View all
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {recentMoves.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-[var(--surface-container-low)]"
              >
                <span className="min-w-0 truncate">
                  {m.variant.product.name}
                  <span className="text-muted">
                    {" "}
                    · {m.type.replace(/_/g, " ").toLowerCase()}
                  </span>
                </span>
                <span
                  className={
                    m.delta >= 0
                      ? "font-data shrink-0 font-medium text-success"
                      : "font-data shrink-0 font-medium text-danger"
                  }
                >
                  {m.delta > 0 ? `+${m.delta}` : m.delta}
                </span>
              </li>
            ))}
            {recentMoves.length === 0 && (
              <li className="px-4 py-8 text-center text-muted">
                No activity yet
              </li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}

async function CentralDashboard() {
  const shops = await prisma.branch.findMany({
    where: { isShop: true, isActive: true },
    orderBy: { name: "asc" },
  });
  const warehouses = await prisma.branch.findMany({
    where: { isWarehouse: true, isActive: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day30 = new Date();
  day30.setDate(day30.getDate() - 30);
  day30.setHours(0, 0, 0, 0);

  const shopIds = shops.map((s) => s.id);
  const allBranchIds = [
    ...shopIds,
    ...warehouses.map((w) => w.id),
  ];

  const [stocks, todaySales, monthSales, productCount, recentSales] =
    await Promise.all([
      prisma.finishedGoodsStock.findMany({
        where: allBranchIds.length
          ? { branchId: { in: allBranchIds } }
          : { branchId: "__none__" },
        include: { branch: true, variant: true },
      }),
      prisma.sale.findMany({
        where: {
          isReturn: false,
          createdAt: { gte: today },
          ...(shopIds.length ? { branchId: { in: shopIds } } : {}),
        },
        include: { items: { include: { variant: true } } },
      }),
      prisma.sale.findMany({
        where: {
          isReturn: false,
          createdAt: { gte: day30 },
          ...(shopIds.length ? { branchId: { in: shopIds } } : {}),
        },
        include: { items: true },
      }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.sale.findMany({
        where: shopIds.length ? { branchId: { in: shopIds } } : undefined,
        include: { branch: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

  const low = stocks.filter(
    (s) => s.branch.isShop && s.quantity <= s.reorderAt,
  );
  const units = stocks
    .filter((s) => s.branch.isShop)
    .reduce((sum, s) => sum + s.quantity, 0);
  const revenueToday = todaySales.reduce(
    (sum, s) => sum + toNumber(s.total),
    0,
  );
  const revenueMonth = monthSales.reduce(
    (sum, s) => sum + toNumber(s.total),
    0,
  );
  const unitsSoldMonth = monthSales.reduce(
    (sum, s) => sum + s.items.reduce((a, i) => a + i.quantity, 0),
    0,
  );

  const maxLoc = Math.max(
    1,
    ...[...warehouses, ...shops].map((b) =>
      stocks
        .filter((s) => s.branchId === b.id)
        .reduce((sum, s) => sum + s.quantity, 0),
    ),
  );

  const locations = [...warehouses, ...shops].map((b) => {
    const qty = stocks
      .filter((s) => s.branchId === b.id)
      .reduce((sum, s) => sum + s.quantity, 0);
    return {
      id: b.id,
      name: b.name,
      qty,
      pct: Math.round((qty / maxLoc) * 100),
      isWarehouse: b.isWarehouse,
    };
  });

  const shopCards = shops.map((shop) => {
    const shopStocks = stocks.filter((s) => s.branchId === shop.id);
    const shopUnits = shopStocks.reduce((sum, s) => sum + s.quantity, 0);
    const shopLow = shopStocks.filter((s) => s.quantity <= s.reorderAt).length;
    const shopRev = todaySales
      .filter((s) => s.branchId === shop.id)
      .reduce((sum, s) => sum + toNumber(s.total), 0);
    return { shop, shopUnits, shopLow, shopRev };
  });

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Business Overview</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link href="/products/new">
              <PackagePlus className="h-4 w-4" />
              New product
            </Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/setup/shops/new">New shop</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/central">Central inventory</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total revenue"
          value={formatEtb(revenueMonth)}
          hint="Last 30 days"
          icon={TrendingUp}
          accent="blue"
        />
        <KpiCard
          label="Total sales"
          value={`${unitsSoldMonth.toLocaleString("en-ET")} units`}
          hint="Across all branches · 30d"
          icon={ShoppingBag}
          accent="primary"
        />
        <KpiCard
          label="Low stock items"
          value={`${low.length} SKUs`}
          variant={low.length > 0 ? "warning" : "success"}
          hint={low.length > 0 ? "Requires attention" : "All healthy"}
          icon={AlertTriangle}
          accent="amber"
          alert={low.length > 0}
        />
        <KpiCard
          label="Active shops"
          value={`${shops.length} locations`}
          hint={`${productCount} products catalogued`}
          icon={Store}
          accent="violet"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Today snapshot</h3>
            <Link
              href="/shops/finance"
              className="flex items-center gap-1 text-sm font-medium text-secondary hover:text-[var(--text-primary)]"
            >
              Finance
              <WalletCards className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-[var(--surface-container-low)] p-4">
              <p className="label-caps">Today revenue</p>
              <p className="mt-2 font-data text-xl font-bold">
                {formatEtb(revenueToday)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-[var(--surface-container-low)] p-4">
              <p className="label-caps">Today receipts</p>
              <p className="mt-2 font-data text-xl font-bold">
                {todaySales.length}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-[var(--surface-container-low)] p-4">
              <p className="label-caps">Shop stock units</p>
              <p className="mt-2 font-data text-xl font-bold">
                {units.toLocaleString("en-ET")}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-lg font-semibold">Stock by location</h3>
          <div className="space-y-4">
            {locations.map((loc) => (
              <div key={loc.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{loc.name}</span>
                  <span className="font-data text-muted">
                    {loc.qty.toLocaleString("en-ET")}
                  </span>
                </div>
                <div className="status-bar">
                  <div
                    className={
                      loc.isWarehouse
                        ? "status-bar-fill"
                        : "status-bar-fill-muted"
                    }
                    style={{ width: `${Math.max(loc.pct, 4)}%` }}
                  />
                </div>
              </div>
            ))}
            {locations.length === 0 && (
              <p className="text-sm text-muted">No branches yet.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border bg-[var(--bg-page)] px-4 py-3">
            <h3 className="text-lg font-semibold">Shops</h3>
            <Link
              href="/setup/shops"
              className="text-sm font-medium text-secondary hover:text-[var(--text-primary)]"
            >
              Manage
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-[var(--surface-container-low)]">
                  <th className="label-caps px-4 py-3">Shop</th>
                  <th className="label-caps px-4 py-3">Units</th>
                  <th className="label-caps px-4 py-3">Alerts</th>
                  <th className="label-caps px-4 py-3 text-right">Sales today</th>
                  <th className="label-caps px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {shopCards.map(({ shop, shopUnits, shopLow, shopRev }) => (
                  <tr
                    key={shop.id}
                    className="border-b border-border hover:bg-[var(--surface-container-low)]"
                  >
                    <td className="px-4 py-3 text-sm font-medium">{shop.name}</td>
                    <td className="px-4 py-3 font-data text-sm">{shopUnits}</td>
                    <td className="px-4 py-3 text-sm">
                      {shopLow > 0 ? (
                        <span className="badge-warning">{shopLow} low</span>
                      ) : (
                        <span className="badge-success">OK</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-data text-sm">
                      {formatEtb(shopRev)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <Link
                        href={`/shops/stock?branchId=${shop.id}`}
                        className="font-medium text-secondary hover:underline"
                      >
                        Stock
                      </Link>
                    </td>
                  </tr>
                ))}
                {shopCards.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-muted"
                    >
                      No shops —{" "}
                      <Link
                        href="/setup/shops/new"
                        className="text-secondary hover:underline"
                      >
                        create one
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-border bg-[var(--bg-page)] px-4 py-3">
            <h3 className="text-lg font-semibold">Recent activity</h3>
          </div>
          <ul className="divide-y divide-border">
            {recentSales.map((s) => (
              <li
                key={s.id}
                className="flex items-start justify-between gap-2 px-4 py-3 text-sm hover:bg-[var(--surface-container-low)]"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{s.branch.name}</p>
                  <p className="text-xs text-muted">
                    {s.isReturn ? "Return" : "Sale"} ·{" "}
                    {s.createdAt.toLocaleString("en-ET", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className="font-data shrink-0 font-medium">
                  {formatEtb(toNumber(s.total))}
                </span>
              </li>
            ))}
            {recentSales.length === 0 && (
              <li className="px-4 py-8 text-center text-muted">No sales yet</li>
            )}
          </ul>
          <div className="border-t border-border p-3">
            <div className="grid gap-2">
              {[
                { href: "/products", label: "Products", icon: Package },
                { href: "/setup/shops", label: "Shop management", icon: Store },
                { href: "/shops/restock", label: "Restock", icon: Upload },
                {
                  href: "/shops/finance",
                  label: "Finance P&L",
                  icon: WalletCards,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-container-low)]"
                  >
                    <span className="rounded-md bg-[var(--secondary-container)] p-1.5 text-[var(--on-secondary-container)]">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
