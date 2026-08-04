import Link from "next/link";
import {
  AlertTriangle,
  Package,
  Store,
  Upload,
  WalletCards,
} from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
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
        <h1 className="text-2xl font-semibold">Shop home</h1>
        <p className="text-sm text-danger">
          Your account has no shop assigned. Ask Admin under Users &amp; roles.
        </p>
      </div>
    );
  }

  const stocks = await prisma.finishedGoodsStock.findMany({
    where: { branchId },
    include: { variant: { include: { product: true } } },
  });
  const low = stocks.filter((s) => s.quantity <= s.reorderAt);
  const units = stocks.reduce((sum, s) => sum + s.quantity, 0);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const todaySales = await prisma.sale.findMany({
    where: {
      branchId,
      isReturn: false,
      createdAt: { gte: start },
    },
    include: {
      items: { include: { variant: true } },
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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{branchName ?? "Shop"}</h1>
        <p className="mt-1 text-sm text-muted">
          Your shop only — watch stock, add your stock, import external POS sales.
        </p>
      </div>

      {low.length > 0 && (
        <Card className="border-warning/40">
          <p className="font-medium text-warning">
            Stock alert — {low.length} product
            {low.length === 1 ? "" : "s"} low
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            {low.slice(0, 6).map((s) => (
              <li key={s.id}>
                {s.variant.product.name} ({s.variant.size}/{s.variant.color}):{" "}
                <span className="text-warning">{s.quantity} left</span> (alert
                at {s.reorderAt})
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <Link
              href="/shops/restock"
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-on-primary"
            >
              Add stock now
            </Link>
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Units on hand" value={String(units)} icon={Package} />
        <KpiCard
          label="Stock alerts"
          value={String(low.length)}
          variant={low.length > 0 ? "warning" : "success"}
          icon={AlertTriangle}
        />
        <KpiCard
          label="Today's sales (imported)"
          value={formatEtb(revenue)}
          hint={`${todaySales.length} lines`}
          icon={Upload}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/shops/restock"
          className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-on-primary shadow-sm hover:bg-primary-hover"
        >
          Add stock
        </Link>
        <Link
          href="/shops/sales"
          className="inline-flex rounded-lg border border-border px-4 py-2 text-sm text-secondary"
        >
          Import sales
        </Link>
        <Link
          href="/shops/stock"
          className="inline-flex rounded-lg border border-border px-4 py-2 text-sm text-secondary"
        >
          My stock
        </Link>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Recent movements</h2>
        <ul className="space-y-2 text-sm">
          {recentMoves.map((m) => (
            <li
              key={m.id}
              className="flex justify-between gap-2 border-b border-border/40 pb-2"
            >
              <span>
                {m.variant.product.name} ·{" "}
                {m.type.replace(/_/g, " ").toLowerCase()}
                <span
                  className={m.delta >= 0 ? " text-success" : " text-danger"}
                >
                  {" "}
                  {m.delta > 0 ? `+${m.delta}` : m.delta}
                </span>
              </span>
              <span className="text-xs text-muted">
                {m.createdAt.toLocaleString("en-ET")}
              </span>
            </li>
          ))}
          {recentMoves.length === 0 && (
            <li className="text-muted">No movements yet.</li>
          )}
        </ul>
      </Card>
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
      where: shopIds.length ? { branchId: { in: shopIds } } : { branchId: "__none__" },
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
        <div>
          <h1 className="page-title">Shop control</h1>
          <p className="mt-1 text-sm text-muted">
            Central inventory controls every shop: products, stock, external
            sales, and finance — one place to see performance and restock.
          </p>
        </div>
        <Link
          href="/central"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-on-primary shadow-sm hover:bg-primary-hover"
        >
          Open central inventory
        </Link>
      </div>

      {low.length > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-warning/40">
          <div>
            <p className="text-sm font-medium text-warning">
              {low.length} stock alert{low.length === 1 ? "" : "s"} across shops
            </p>
            <p className="text-xs text-muted">
              Restock shops so they keep selling.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/shops/restock"
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-on-primary"
            >
              Restock
            </Link>
            <Link
              href="/central"
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              View alerts
            </Link>
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Units in shops"
          value={units.toLocaleString("en-ET")}
          icon={Package}
        />
        <KpiCard
          label="Stock alerts"
          value={String(low.length)}
          variant={low.length > 0 ? "warning" : "success"}
          icon={AlertTriangle}
        />
        <KpiCard
          label="Today's sales"
          value={formatEtb(revenue)}
          hint={`Est. profit ${formatEtb(revenue - cogs)} · imported + records`}
          icon={Upload}
        />
        <KpiCard
          label="Products / shops"
          value={`${productCount} / ${shops.length}`}
          icon={Store}
        />
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Shops (same as central)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="pb-2 pr-3">Shop</th>
                <th className="pb-2 pr-3">Units</th>
                <th className="pb-2 pr-3">Alerts</th>
                <th className="pb-2 pr-3">Sales today</th>
                <th className="pb-2">Open</th>
              </tr>
            </thead>
            <tbody>
              {shopCards.map(({ shop, shopUnits, shopLow, shopRev }) => (
                <tr key={shop.id} className="border-t border-border/50">
                  <td className="py-2 pr-3 font-medium">{shop.name}</td>
                  <td className="py-2 pr-3">{shopUnits}</td>
                  <td className="py-2 pr-3">
                    {shopLow > 0 ? (
                      <span className="text-warning">{shopLow}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="py-2 pr-3">{formatEtb(shopRev)}</td>
                  <td className="py-2">
                    <Link
                      href={`/shops/stock?branchId=${shop.id}`}
                      className="text-secondary hover:underline"
                    >
                      Stock
                    </Link>
                    {" · "}
                    <Link
                      href={`/shops/finance?branchId=${shop.id}`}
                      className="text-secondary hover:underline"
                    >
                      Finance
                    </Link>
                  </td>
                </tr>
              ))}
              {shopCards.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-muted">
                    No shops yet.{" "}
                    <Link
                      href="/setup/shops/new"
                      className="text-secondary hover:underline"
                    >
                      Open a shop
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-semibold">How control works</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>
            Register products (Male / Ladies / Kids) with buy &amp; sell prices.
          </li>
          <li>Open shops and assign shop logins.</li>
          <li>Restock each shop (manual or import).</li>
          <li>Import external POS sales — stock drops, finance updates.</li>
          <li>
            Use Central inventory for all movements, stock alerts, and product
            performance.
          </li>
        </ol>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/products/new"
            className="rounded-lg border border-border/60 px-3 py-2 text-sm text-secondary hover:border-primary/40"
          >
            Register product
          </Link>
          <Link
            href="/shops/restock"
            className="rounded-lg border border-border/60 px-3 py-2 text-sm text-secondary hover:border-primary/40"
          >
            Restock shops
          </Link>
          <Link
            href="/shops/sales"
            className="rounded-lg border border-border/60 px-3 py-2 text-sm text-secondary hover:border-primary/40"
          >
            Import sales
          </Link>
          <Link
            href="/shops/finance"
            className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm text-secondary hover:border-primary/40"
          >
            <WalletCards className="h-4 w-4" />
            Finance
          </Link>
        </div>
      </Card>
    </div>
  );
}
