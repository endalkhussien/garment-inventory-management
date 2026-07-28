import { CsvDownloadButton } from "@/components/reports/csv-download-button";
import { Card } from "@/components/ui/card";
import { formatEtb, toNumber } from "@/lib/format";
import { marginFromPrice } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

export default async function PricingReportPage() {
  const variants = await prisma.productVariant.findMany({
    where: { isActive: true },
    include: { product: true },
    orderBy: { sku: "asc" },
  });

  const rows = variants.map((v) => {
    const cost = toNumber(v.totalCostCached);
    const price = toNumber(v.sellingPrice);
    const margin = marginFromPrice(cost, price);
    return {
      product: v.product.name,
      variant: `${v.size}/${v.color}`,
      sku: v.sku,
      cost,
      price,
      marginEtb: margin.marginEtb,
      marginPct: margin.marginPercent,
      stale: v.costIsStale ? "YES" : "NO",
    };
  });

  const csv = [
    "Product,Variant,SKU,Cost,Price,MarginETB,MarginPct,Stale",
    ...rows.map(
      (r) =>
        `"${r.product}",${r.variant},${r.sku},${r.cost},${r.price},${r.marginEtb},${r.marginPct},${r.stale}`,
    ),
  ].join("\n");

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Cost & pricing report</h1>
          <p className="text-sm text-muted">{rows.length} variants</p>
        </div>
        <CsvDownloadButton filename="pricing-report.csv" content={csv} />
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Cost</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Margin</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sku} className="border-t border-border/60">
                <td className="px-3 py-2">
                  {r.product} ({r.variant})
                </td>
                <td className="px-3 py-2">{formatEtb(r.cost)}</td>
                <td className="px-3 py-2">{formatEtb(r.price)}</td>
                <td className="px-3 py-2 text-muted">
                  {formatEtb(r.marginEtb)} ({r.marginPct.toFixed(1)}%)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
