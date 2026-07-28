import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatEtb, toNumber } from "@/lib/format";
import { marginFromPrice } from "@/lib/pricing";

type ProductRow = {
  id: string;
  name: string;
  category: { name: string } | null;
  variants: Array<{
    id: string;
    size: string;
    color: string;
    sku: string;
    sellingPrice: { toString(): string } | number;
    totalCostCached: { toString(): string } | number;
    costIsStale: boolean;
  }>;
};

export function ProductsTable({ items }: { items: ProductRow[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
        No products yet. Create a sweater or other garment and attach a BOM to
        price it.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-3 font-medium">Product</th>
            <th className="px-3 py-3 font-medium">Variants</th>
            <th className="px-3 py-3 font-medium">From cost</th>
            <th className="px-3 py-3 font-medium">From price</th>
            <th className="px-3 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((product) => {
            const stale = product.variants.some((v) => v.costIsStale);
            const costs = product.variants.map((v) =>
              toNumber(v.totalCostCached),
            );
            const prices = product.variants.map((v) =>
              toNumber(v.sellingPrice),
            );
            const minCost = costs.length ? Math.min(...costs) : 0;
            const minPrice = prices.length ? Math.min(...prices) : 0;
            const margin = marginFromPrice(minCost, minPrice);

            return (
              <tr
                key={product.id}
                className="border-t border-border/60 hover:bg-surface/60"
              >
                <td className="px-3 py-3">
                  <Link
                    href={`/products/${product.id}`}
                    className="font-medium text-secondary hover:underline"
                  >
                    {product.name}
                  </Link>
                  <div className="text-xs text-muted">
                    {product.category?.name ?? "Uncategorized"}
                  </div>
                </td>
                <td className="px-3 py-3 text-muted">
                  {product.variants.length}
                </td>
                <td className="px-3 py-3">{formatEtb(minCost)}</td>
                <td className="px-3 py-3">
                  <div>{formatEtb(minPrice)}</div>
                  <div className="text-xs text-muted">
                    Margin {margin.marginPercent.toFixed(1)}%
                  </div>
                </td>
                <td className="px-3 py-3">
                  {stale ? (
                    <Badge variant="warning">Cost stale</Badge>
                  ) : (
                    <Badge variant="success">Up to date</Badge>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
