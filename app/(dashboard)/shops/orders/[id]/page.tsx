import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { ShopOrderReviewForm } from "@/components/shops/shop-order-review-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cancelShopStockOrder } from "@/lib/actions/shop-orders";
import { prisma } from "@/lib/prisma";
import {
  getShopBranchId,
  isAdminRole,
  isShopRole,
  requireSession,
} from "@/lib/rbac";

type PageProps = { params: { id: string } };

export default async function ShopOrderDetailPage({ params }: PageProps) {
  const session = await requireSession();
  const shopOnly = isShopRole(session.user.role.name);
  const shopBranchId = getShopBranchId(session);

  const order = await prisma.shopStockOrder.findUnique({
    where: { id: params.id },
    include: {
      shopBranch: true,
      warehouseBranch: true,
      requestedBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
      lines: {
        include: {
          variant: { include: { product: true } },
        },
      },
    },
  });

  if (!order) notFound();

  if (shopOnly && shopBranchId !== order.shopBranchId) {
    redirect("/shops/orders");
  }

  const liveWarehouse = await prisma.finishedGoodsStock.findMany({
    where: {
      branchId: order.warehouseBranchId,
      variantId: { in: order.lines.map((l) => l.variantId) },
    },
  });
  const liveMap = new Map(liveWarehouse.map((s) => [s.variantId, s.quantity]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted">
            {order.shopBranch.name} ← {order.warehouseBranch.name} ·{" "}
            {order.status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/shops/orders">All orders</Link>
          </Button>
          {order.status === "PENDING" &&
            (shopOnly || isAdminRole(session.user.role.name)) && (
              <ConfirmActionButton
                label="Cancel"
                confirmMessage="Cancel this stock order?"
                action={() => cancelShopStockOrder(order.id)}
              />
            )}
        </div>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-page text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-3">Product</th>
              <th className="px-3 py-3">Requested</th>
              <th className="px-3 py-3">Approved</th>
              <th className="px-3 py-3">Shop had</th>
              <th className="px-3 py-3">WH now</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((l) => (
              <tr key={l.id} className="border-t border-border/60">
                <td className="px-3 py-3">
                  {l.variant.product.name}
                  <p className="text-xs text-muted">
                    {l.variant.size}/{l.variant.color} · {l.variant.sku}
                  </p>
                </td>
                <td className="px-3 py-3">{l.quantityRequested}</td>
                <td className="px-3 py-3">
                  {l.quantityApproved ?? l.quantityRequested}
                </td>
                <td className="px-3 py-3 text-muted">{l.shopQtySnap}</td>
                <td className="px-3 py-3 font-medium">
                  {liveMap.get(l.variantId) ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {order.note && (
        <Card>
          <p className="text-sm text-muted">Note</p>
          <p className="text-sm">{order.note}</p>
        </Card>
      )}

      {isAdminRole(session.user.role.name) && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold">
            Admin / Manager actions
          </h2>
          <ShopOrderReviewForm
            orderId={order.id}
            status={order.status}
            lines={order.lines.map((l) => ({
              id: l.id,
              label: `${l.variant.product.name} · ${l.variant.size}/${l.variant.color}`,
              quantityRequested: l.quantityRequested,
              quantityApproved: l.quantityApproved,
              warehouseAvailableSnap: l.warehouseAvailableSnap,
            }))}
          />
        </Card>
      )}
    </div>
  );
}
