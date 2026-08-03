import Link from "next/link";

import { CsvDownloadButton } from "@/components/reports/csv-download-button";
import { Card } from "@/components/ui/card";
import { formatEtb, formatQuantity, toNumber } from "@/lib/format";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function FinishedGoodsValuationPage() {
  await requireAdmin();

  const stocks = await prisma.finishedGoodsStock.findMany({
    include: {
      branch: true,
      variant: {
        include: { product: true },
      },
    },
    orderBy: [{ branch: { name: "asc" } }, { variant: { sku: "asc" } }],
  });

  const rows = stocks.map((s) => {
    const qty = s.quantity;
    const cost = toNumber(s.variant.totalCostCached);
    const price = toNumber(s.variant.sellingPrice);
    return {
      branch: s.branch.name,
      product: s.variant.product.name,
      variant: `${s.variant.size}/${s.variant.color}`,
      sku: s.variant.sku,
      qty,
      cost,
      price,
      costValue: qty * cost,
      retailValue: qty * price,
      low: qty <= s.reorderAt ? "YES" : "NO",
    };
  });

  const totalCost = rows.reduce((s, r) => s + r.costValue, 0);
  const totalRetail = rows.reduce((s, r) => s + r.retailValue, 0);

  const csv = [
    "Branch,Product,Variant,SKU,Qty,UnitCost,SellingPrice,CostValue,RetailValue,LowStock",
    ...rows.map(
      (r) =>
        `"${r.branch}","${r.product}","${r.variant}",${r.sku},${r.qty},${r.cost},${r.price},${r.costValue},${r.retailValue},${r.low}`,
    ),
  ].join("\n");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Finished goods valuation</h1>
          <p className="text-sm text-muted">
            Cost value {formatEtb(totalCost)} · Retail value{" "}
            {formatEtb(totalRetail)}
          </p>
        </div>
        <div className="flex gap-2">
          <CsvDownloadButton filename="fg-valuation.csv" content={csv} />
          <Link href="/reports" className="text-sm text-secondary hover:underline">
            All reports
          </Link>
        </div>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Branch</th>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Cost value</th>
              <th className="px-3 py-2">Retail value</th>
              <th className="px-3 py-2">Low?</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.branch}-${r.sku}`} className="border-t border-border/60">
                <td className="px-3 py-2">{r.branch}</td>
                <td className="px-3 py-2">
                  {r.product}
                  <p className="text-xs text-muted">
                    {r.variant} · {r.sku}
                  </p>
                </td>
                <td className="px-3 py-2">{formatQuantity(r.qty)}</td>
                <td className="px-3 py-2">{formatEtb(r.costValue)}</td>
                <td className="px-3 py-2">{formatEtb(r.retailValue)}</td>
                <td className="px-3 py-2 text-muted">{r.low}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-muted">
                  No finished goods stock yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
