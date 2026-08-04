import Link from "next/link";

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Shops</h1>
          <p className="mt-1 text-sm text-muted">
            Open, edit, or close retail locations controlled by central
            inventory. {openCount} open · {rows.length} total.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/central">Central inventory</Link>
          </Button>
          <Button asChild>
            <Link href="/setup/shops/new">Initiate new shop</Link>
          </Button>
        </div>
      </div>

      <Card className="text-sm text-muted">
        New shops start empty. Restock products into each shop, then import
        sales from their external POS. Oversee everything from{" "}
        <Link href="/central" className="text-secondary hover:underline">
          Central inventory
        </Link>
        .
      </Card>

      <Card className="overflow-x-auto p-0">
        <ShopsAdminTable shops={rows} />
      </Card>
    </div>
  );
}
