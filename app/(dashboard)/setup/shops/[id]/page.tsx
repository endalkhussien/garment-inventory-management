import Link from "next/link";
import { notFound } from "next/navigation";

import { ShopEditForm } from "@/components/shops/shop-edit-form";
import { ShopLifecycleActions } from "@/components/shops/shop-lifecycle-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatEtb, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";

type PageProps = { params: { id: string } };

export default async function ShopDetailPage({ params }: PageProps) {
  await requireAdmin();

  const shop = await prisma.branch.findFirst({
    where: { id: params.id, isShop: true },
    include: {
      users: {
        include: { role: true },
        orderBy: { name: "asc" },
      },
      finishedGoods: { select: { quantity: true } },
    },
  });
  if (!shop) notFound();

  const stockUnits = shop.finishedGoods.reduce((s, g) => s + g.quantity, 0);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const todaySales = await prisma.sale.aggregate({
    where: {
      branchId: shop.id,
      isReturn: false,
      createdAt: { gte: start },
    },
    _sum: { total: true },
    _count: true,
  });

  const hasData =
    stockUnits > 0 || shop.users.length > 0 || todaySales._count > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{shop.name}</h1>
            <Badge variant={shop.isActive ? "success" : "danger"}>
              {shop.isActive ? "Open" : "Closed"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {shop.code}
            {shop.address ? ` · ${shop.address}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/setup/shops">All shops</Link>
          </Button>
          <ShopLifecycleActions
            shopId={shop.id}
            shopName={shop.name}
            isActive={shop.isActive}
            hasData={hasData}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <p className="text-xs text-muted">Units on hand</p>
          <p className="text-xl font-semibold">{stockUnits}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Staff</p>
          <p className="text-xl font-semibold">{shop.users.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Today&apos;s sales (imported)</p>
          <p className="text-xl font-semibold">
            {formatEtb(toNumber(todaySales._sum.total ?? 0))}
          </p>
          <p className="text-xs text-muted">{todaySales._count} lines</p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Edit shop</h2>
        <ShopEditForm shop={shop} />
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Staff at this shop</h2>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/users?branchId=${shop.id}`}>Add / manage users</Link>
          </Button>
        </div>
        {shop.users.length === 0 ? (
          <p className="text-sm text-muted">
            No users yet. Add a Shop-role user and assign this branch.
          </p>
        ) : (
          <ul className="divide-y divide-border/60 text-sm">
            {shop.users.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <div>
                  <Link
                    href={`/users/${u.id}`}
                    className="font-medium text-secondary hover:underline"
                  >
                    {u.name ?? u.email}
                  </Link>
                  <p className="text-xs text-muted">
                    {u.email} · {u.role.name}
                  </p>
                </div>
                <Badge variant={u.isActive ? "success" : "danger"}>
                  {u.isActive ? "Active" : "Off"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Shortcuts</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href={`/shops/stock?branchId=${shop.id}`}
            className="rounded-lg border border-border px-3 py-2 text-secondary hover:border-primary/40"
          >
            Stock
          </Link>
          <Link
            href={`/shops/finance?branchId=${shop.id}`}
            className="rounded-lg border border-border px-3 py-2 text-secondary hover:border-primary/40"
          >
            Finance
          </Link>
          <Link
            href="/shops/restock"
            className="rounded-lg border border-border px-3 py-2 text-secondary hover:border-primary/40"
          >
            Restock
          </Link>
          <Link
            href="/shops/sales"
            className="rounded-lg border border-border px-3 py-2 text-secondary hover:border-primary/40"
          >
            Import sales
          </Link>
          <Link
            href="/central"
            className="rounded-lg border border-border px-3 py-2 text-secondary hover:border-primary/40"
          >
            Central inventory
          </Link>
        </div>
      </Card>
    </div>
  );
}
