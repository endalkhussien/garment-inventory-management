import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

const statusVariant: Record<string, "default" | "success" | "warning" | "secondary"> = {
  DRAFT: "secondary",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "default",
};

export default async function ProductionOrdersPage() {
  const orders = await prisma.productionOrder.findMany({
    include: {
      variant: { include: { product: true } },
      supervisor: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Production Orders</h1>
          <p className="mt-1 text-sm text-muted">
            Create a draft, start to issue materials, log output, then complete.
          </p>
        </div>
        <Button asChild>
          <Link href="/production/orders/new">New order</Link>
        </Button>
      </div>

      <Card className="overflow-x-auto p-0">
        {orders.length === 0 ? (
          <p className="p-6 text-sm text-muted">No orders yet.</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-page/40 text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-3">Order</th>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">Progress</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-border/60">
                  <td className="px-3 py-3">
                    <Link
                      href={`/production/orders/${o.id}`}
                      className="text-secondary hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    {o.variant.product.name} ({o.variant.size}/{o.variant.color})
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {o.quantityGood}/{o.quantityTarget} good
                    {o.quantityRejected > 0
                      ? ` · ${o.quantityRejected} rejected`
                      : ""}
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={statusVariant[o.status] ?? "default"}>
                      {o.status.replace("_", " ")}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
