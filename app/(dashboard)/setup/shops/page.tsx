import Link from "next/link";
import { MapPin, Package, Plus, Users } from "lucide-react";

import { ShopsAdminTable } from "@/components/shops/shops-admin-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";

export default async function ShopsSetupPage() {
  await requireAdmin();

  const shops = await prisma.branch.findMany({
    where: { isShop: true },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { users: true } },
      finishedGoods: { select: { quantity: true } },
    },
  });

  const rows = shops.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    address: s.address,
    isActive: s.isActive,
    userCount: s._count.users,
    stockUnits: s.finishedGoods.reduce((sum, g) => sum + g.quantity, 0),
  }));

  const openCount = rows.filter((r) => r.isActive).length;
  const totalUnits = rows.reduce((sum, r) => sum + r.stockUnits, 0);
  const totalUsers = rows.reduce((sum, r) => sum + r.userCount, 0);

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Shops</h1>
        <Button asChild>
          <Link href="/setup/shops/new">
            <Plus className="h-4 w-4" />
            New shop
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3">
          <span className="kpi-icon-blue rounded-lg p-2.5">
            <MapPin className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase text-muted">Open</p>
            <p className="text-xl font-semibold tabular-nums">
              {openCount}
              <span className="text-sm font-normal text-muted">
                /{rows.length}
              </span>
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <span className="kpi-icon-green rounded-lg p-2.5">
            <Package className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase text-muted">Units</p>
            <p className="text-xl font-semibold tabular-nums">{totalUnits}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <span className="kpi-icon-violet rounded-lg p-2.5">
            <Users className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase text-muted">Logins</p>
            <p className="text-xl font-semibold tabular-nums">{totalUsers}</p>
          </div>
        </Card>
      </div>

      {rows.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((s) => (
            <Link key={s.id} href={`/setup/shops/${s.id}`} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold group-hover:text-primary">
                      {s.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{s.code}</p>
                  </div>
                  <span
                    className={
                      s.isActive
                        ? "rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success"
                        : "rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-medium text-danger"
                    }
                  >
                    {s.isActive ? "Open" : "Closed"}
                  </span>
                </div>
                <div className="mt-4 flex gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted">Stock</p>
                    <p className="font-semibold tabular-nums">{s.stockUnits}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Users</p>
                    <p className="font-semibold tabular-nums">{s.userCount}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Card className="overflow-x-auto p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">All shops</p>
        </div>
        <ShopsAdminTable shops={rows} />
      </Card>
    </div>
  );
}
