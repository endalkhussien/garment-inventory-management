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
        <h1 className="page-title">Dashboard</h1>
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
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">{branchName ?? "Shop"}</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/products/new">
              <PackagePlus className="h-4 w-4" />
              Product
            </Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/shops/restock">Restock</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="On hand"
          value={String(units)}
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
          value={String(
            new Set(stocks.map((s) => s.variant.productId)).size,
          )}
          icon={ShoppingBag}
          accent="violet"
        />
      </div>

      {low.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-warning">
              {low.length} low stock
            </p>
            <Button asChild size="sm" variant="secondary">
              <Link href="/shops/restock">Restock</Link>
            </Button>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {low.slice(0, 5).map((s) => (
              <li key={s.id}>
                {s.variant.product.name} · {s.variant.size}/{s.variant.color} —{" "}
                <span className="font-medium text-warning">{s.quantity}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Quick actions
          </p>
          <div className="grid gap-2">
            <Link
              href="/products/new"
              className="rounded-lg border border-border px-3 py-2.5 text-sm font-medium hover:border-primary/40 hover:bg-page"
            >
              New product
            </Link>
            <Link
              href="/shops/stock"
              className="rounded-lg border border-border px-3 py-2.5 text-sm font-medium hover:border-primary/40 hover:bg-page"
            >
              View stock
            </Link>
            <Link
              href="/shops/import"
              className="rounded-lg border border-border px-3 py-2.5 text-sm font-medium hover:border-primary/40 hover:bg-page"
            >
              Import
            </Link>
            <Link
              href="/shops/staff"
              className="rounded-lg border border-border px-3 py-2.5 text-sm font-medium hover:border-primary/40 hover:bg-page"
            >
              Staff
            </Link>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Recent activity
          </p>
          <ul className="divide-y divide-border text-sm">
            {recentMoves.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
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
                      ? "shrink-0 font-medium text-success"
                      : "shrink-0 font-medium text-danger"
                  }
                >
                  {m.delta > 0 ? `+${m.delta}` : m.delta}
                </span>
              </li>
            ))}
            {recentMoves.length === 0 && (
              <li className="py-6 text-center text-muted">No activity yet</li>
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const shopIds = shops.map((s) => s.id);

  const [stocks, todaySales, productCount] = await Promise.all([
    prisma.finishedGoodsStock.findMany({
      where: shopIds.length
        ? { branchId: { in: shopIds } }
        : { branchId: "__none__" },
      include: { branch: true, variant: true },
    }),
    prisma.sale.findMany({
      where: {
        isReturn: false,
        createdAt: { gte: today },
        ...(shopIds.length ? { branchId: { in: shopIds } } : {}),
      },
      include: {
        items: { include: { variant: true } },
      },
    }),
    prisma.product.count({ where: { isActive: true } }),
  ]);

  const low = stocks.filter((s) => s.quantity <= s.reorderAt);
  const units = stocks.reduce((sum, s) => sum + s.quantity, 0);
  const revenue = todaySales.reduce((sum, s) => sum + toNumber(s.total), 0);
  let cogs = 0;
  for (const s of todaySales) {
    for (const item of s.items) {
      cogs += toNumber(item.variant.buyingPrice) * item.quantity;
    }
  }

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
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link href="/products/new">New product</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/setup/shops/new">New shop</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/central">Inventory</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Stock units"
          value={units.toLocaleString("en-ET")}
          icon={Package}
          accent="blue"
        />
        <KpiCard
          label="Low stock"
          value={String(low.length)}
          variant={low.length > 0 ? "warning" : "success"}
          icon={AlertTriangle}
          accent="amber"
        />
        <KpiCard
          label="Today sales"
          value={formatEtb(revenue)}
          hint={`Profit ${formatEtb(revenue - cogs)}`}
          icon={TrendingUp}
          accent="green"
        />
        <KpiCard
          label="Products / shops"
          value={`${productCount} / ${shops.length}`}
          icon={Store}
          accent="violet"
        />
      </div>

      {low.length > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-warning/30 bg-warning/5">
          <p className="text-sm font-medium text-warning">
            {low.length} low-stock alert{low.length === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link href="/shops/restock">Restock</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href="/central">View</Link>
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-x-auto p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Shops</p>
            <Link
              href="/setup/shops"
              className="text-xs font-medium text-secondary hover:underline"
            >
              Manage
            </Link>
          </div>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--bg-elevated)] text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Shop</th>
                <th className="px-4 py-2.5 font-medium">Units</th>
                <th className="px-4 py-2.5 font-medium">Alerts</th>
                <th className="px-4 py-2.5 font-medium">Sales</th>
                <th className="px-4 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {shopCards.map(({ shop, shopUnits, shopLow, shopRev }) => (
                <tr
                  key={shop.id}
                  className="border-t border-border/60 hover:bg-page/60"
                >
                  <td className="px-4 py-3 font-medium">{shop.name}</td>
                  <td className="px-4 py-3 tabular-nums">{shopUnits}</td>
                  <td className="px-4 py-3">
                    {shopLow > 0 ? (
                      <span className="font-medium text-warning">{shopLow}</span>
                    ) : (
                      <span className="text-muted">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatEtb(shopRev)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/shops/stock?branchId=${shop.id}`}
                      className="text-secondary hover:underline"
                    >
                      Stock
                    </Link>
                  </td>
                </tr>
              ))}
              {shopCards.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
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
        </Card>

        <Card>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            Shortcuts
          </p>
          <div className="grid gap-2">
            {[
              { href: "/products", label: "Products", icon: Package },
              { href: "/setup/shops", label: "Manage shops", icon: Store },
              { href: "/shops/restock", label: "Restock", icon: Upload },
              { href: "/shops/finance", label: "Finance", icon: WalletCards },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-page"
                >
                  <span className="rounded-md bg-primary/10 p-1.5 text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
