import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import {
  getShopBranchId,
  isAdminRole,
  isShopRole,
  requireSession,
} from "@/lib/rbac";

export default async function ShopOrdersPage() {
  const session = await requireSession();
  const shopOnly = isShopRole(session.user.role.name);
  const shopBranchId = getShopBranchId(session);

  const orders = await prisma.shopStockOrder.findMany({
    where: shopOnly && shopBranchId ? { shopBranchId } : undefined,
    include: {
      shopBranch: true,
      warehouseBranch: true,
      _count: { select: { lines: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {shopOnly ? "My stock orders" : "Shop stock orders"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {shopOnly
              ? "Request finished goods from the warehouse. Live availability is checked when you submit."
              : "Review and fulfill shop restock requests (Admin / Manager)."}
          </p>
        </div>
        {shopOnly && (
          <Button asChild>
            <Link href="/shops/orders/new">New order</Link>
          </Button>
        )}
      </div>

      <Card className="overflow-x-auto p-0">
        {orders.length === 0 ? (
          <p className="p-6 text-sm text-muted">No stock orders yet.</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-page text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-3">Order</th>
                {!shopOnly && <th className="px-3 py-3">Shop</th>}
                <th className="px-3 py-3">Warehouse</th>
                <th className="px-3 py-3">Lines</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-border/60">
                  <td className="px-3 py-3">
                    <Link
                      href={`/shops/orders/${o.id}`}
                      className="font-medium text-secondary hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  {!shopOnly && (
                    <td className="px-3 py-3">{o.shopBranch.name}</td>
                  )}
                  <td className="px-3 py-3">{o.warehouseBranch.name}</td>
                  <td className="px-3 py-3">{o._count.lines}</td>
                  <td className="px-3 py-3">{o.status}</td>
                  <td className="px-3 py-3 text-muted">
                    {o.createdAt.toLocaleString("en-ET")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {isAdminRole(session.user.role.name) && (
        <p className="text-sm text-muted">
          Tip: open a pending order → adjust quantities →{" "}
          <strong>Fulfill</strong> to transfer stock instantly.
        </p>
      )}
    </div>
  );
}
