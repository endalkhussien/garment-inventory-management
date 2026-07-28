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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">
          {branchName ?? "Shop"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Check stock, then sell at the counter.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <KpiCard label="Units on hand" value={String(units)} icon={Package} />
        <KpiCard
          label="Low stock"
          value={String(low.length)}
          variant={low.length > 0 ? "warning" : "success"}
          icon={AlertTriangle}
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
          href="/shops/stock"
          className="inline-flex rounded-lg border border-border px-4 py-2 text-sm text-secondary"
        >
          View stock
        </Link>
      </div>
    </div>
  );
}

async function FactoryDashboard() {
  const metrics = await getFactoryDashboardMetrics();
  const { kpis } = metrics;

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Home</h1>
          <p className="mt-1 text-sm text-muted">
            Stock, production, and team — at a glance.
          </p>
        </div>
        <Link
          href="/production/output"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-on-primary shadow-sm hover:bg-primary-hover"
        >
          Log today’s output
        </Link>
      </div>

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
            href="/production/employees"
            className="rounded-lg border border-border/60 px-3 py-2 text-sm text-secondary hover:border-primary/40"
          >
            Employees
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
