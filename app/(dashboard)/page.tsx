import Link from "next/link";
import {
  AlertTriangle,
  Factory,
  Package,
} from "lucide-react";

import { ProductionTrendChart } from "@/components/dashboard/dashboard-charts";
import {
  CurrentOrdersTable,
  InventoryStatusTable,
} from "@/components/dashboard/dashboard-tables";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card } from "@/components/ui/card";
import { getFactoryDashboardMetrics } from "@/lib/dashboard-metrics";
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

  return <FactoryDashboard />;
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
          Your account has no shop branch. Ask Admin to assign one under Users &
          roles.
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
  const todaySales = await prisma.sale.aggregate({
    where: {
      branchId,
      isReturn: false,
      createdAt: { gte: start },
    },
    _sum: { total: true },
    _count: true,
  });
  const pendingOrders = await prisma.shopStockOrder.count({
    where: { shopBranchId: branchId, status: "PENDING" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">
          {branchName ?? "Shop"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Sell, manage stock, and order from warehouse — connected to HQ.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Units on hand" value={String(units)} icon={Package} />
        <KpiCard
          label="Low stock"
          value={String(low.length)}
          variant={low.length > 0 ? "warning" : "success"}
          icon={AlertTriangle}
        />
        <KpiCard
          label="Today's sales"
          value={formatEtb(toNumber(todaySales._sum.total ?? 0))}
          hint={`${todaySales._count} receipts`}
          icon={Factory}
        />
        <KpiCard
          label="Pending orders"
          value={String(pendingOrders)}
          variant={pendingOrders > 0 ? "warning" : "default"}
          icon={Package}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/sales"
          className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-on-primary shadow-sm hover:bg-primary-hover"
        >
          Open POS
        </Link>
        <Link
          href={low.length > 0 ? "/shops/orders/new" : "/shops/orders"}
          className="inline-flex rounded-lg border border-border px-4 py-2 text-sm text-secondary"
        >
          {low.length > 0 ? "Reorder low stock" : "Order stock"}
        </Link>
        <Link
          href="/shops/finance"
          className="inline-flex rounded-lg border border-border px-4 py-2 text-sm text-secondary"
        >
          Finance
        </Link>
        <Link
          href="/shops/stock"
          className="inline-flex rounded-lg border border-border px-4 py-2 text-sm text-secondary"
        >
          My stock
        </Link>
      </div>
      {low.length > 0 && (
        <Card className="text-sm">
          <p className="font-medium text-warning">Low stock — reorder soon</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            {low.slice(0, 5).map((s) => (
              <li key={s.id}>
                {s.variant.product.name} ({s.variant.size}/{s.variant.color}):{" "}
                {s.quantity} left
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

async function FactoryDashboard() {
  const metrics = await getFactoryDashboardMetrics();
  const { kpis } = metrics;
  const pendingShopOrders = await prisma.shopStockOrder.count({
    where: { status: { in: ["PENDING", "APPROVED"] } },
  });

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Home</h1>
          <p className="mt-1 text-sm text-muted">
            Stock, production, shops, and team — at a glance.
          </p>
        </div>
        <Link
          href="/production/output"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-on-primary shadow-sm hover:bg-primary-hover"
        >
          Log today’s output
        </Link>
      </div>

      {pendingShopOrders > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-warning/40">
          <div>
            <p className="text-sm font-medium text-warning">
              {pendingShopOrders} shop stock order
              {pendingShopOrders === 1 ? "" : "s"} awaiting action
            </p>
            <p className="text-xs text-muted">
              Approve or fulfill so shops can keep selling.
            </p>
          </div>
          <Link
            href="/shops/orders"
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-on-primary hover:bg-primary-hover"
          >
            Review shop orders
          </Link>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Produced today"
          value={kpis.unitsToday.toLocaleString("en-ET")}
          icon={Factory}
        />
        <KpiCard
          label="Orders in progress"
          value={String(kpis.inProgressCount)}
          icon={Factory}
        />
        <KpiCard
          label="Low materials"
          value={String(kpis.lowMaterials)}
          variant={kpis.lowMaterials > 0 ? "warning" : "success"}
          icon={AlertTriangle}
        />
        <KpiCard
          label="Finished goods"
          value={kpis.finishedUnits.toLocaleString("en-ET")}
          hint={`${kpis.activeEmployees} active workers`}
          icon={Package}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProductionTrendChart series={metrics.productionSeries} />
        <CurrentOrdersTable orders={metrics.currentOrders} />
      </div>

      <InventoryStatusTable rows={metrics.inventoryRows} />

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Shortcuts</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/inventory/raw-materials"
            className="rounded-lg border border-border/60 px-3 py-2 text-sm text-secondary hover:border-primary/40"
          >
            Raw materials
          </Link>
          <Link
            href="/production/orders/new"
            className="rounded-lg border border-border/60 px-3 py-2 text-sm text-secondary hover:border-primary/40"
          >
            New production order
          </Link>
          <Link
            href="/setup/shops"
            className="rounded-lg border border-border/60 px-3 py-2 text-sm text-secondary hover:border-primary/40"
          >
            Manage shops
          </Link>
          <Link
            href="/shops/orders"
            className="rounded-lg border border-border/60 px-3 py-2 text-sm text-secondary hover:border-primary/40"
          >
            Shop orders
            {pendingShopOrders > 0 ? ` (${pendingShopOrders})` : ""}
          </Link>
          <Link
            href="/shops/transfers"
            className="rounded-lg border border-border/60 px-3 py-2 text-sm text-secondary hover:border-primary/40"
          >
            Transfer to shop
          </Link>
        </div>
      </Card>
    </div>
  );
}
