import { CsvDownloadButton } from "@/components/reports/csv-download-button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function ProductionReportPage() {
  const orders = await prisma.productionOrder.findMany({
    include: { variant: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const rows = orders.map((o) => ({
    order: o.orderNumber,
    product: o.variant.product.name,
    variant: `${o.variant.size}/${o.variant.color}`,
    target: o.quantityTarget,
    good: o.quantityGood,
    rejected: o.quantityRejected,
    status: o.status,
  }));

  const csv = [
    "Order,Product,Variant,Target,Good,Rejected,Status",
    ...rows.map(
      (r) =>
        `${r.order},${r.product},${r.variant},${r.target},${r.good},${r.rejected},${r.status}`,
    ),
  ].join("\n");

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Production report</h1>
          <p className="text-sm text-muted">{rows.length} orders</p>
        </div>
        <CsvDownloadButton filename="production-report.csv" content={csv} />
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Good/Target</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.order} className="border-t border-border/60">
                <td className="px-3 py-2">{r.order}</td>
                <td className="px-3 py-2">
                  {r.product} ({r.variant})
                </td>
                <td className="px-3 py-2">
                  {r.good}/{r.target}
                </td>
                <td className="px-3 py-2 text-muted">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
