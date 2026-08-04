import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatEtb, toNumber } from "@/lib/format";

type ProductRow = {
  id: string;
  productNo: number | null;
  name: string;
  code: string | null;
  category: { name: string } | null;
  garmentInfo: string | null;
  variants: Array<{
    id: string;
    size: string;
    color: string;
    sku: string;
    buyingPrice: { toString(): string } | number;
    sellingPrice: { toString(): string } | number;
  }>;
};

export function ProductsTable({ items }: { items: ProductRow[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
        No products registered yet. Add garments with buying &amp; selling
        prices so shops can sell and restock.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-3 font-medium">No</th>
            <th className="px-3 py-3 font-medium">Name of product</th>
            <th className="px-3 py-3 font-medium">Code</th>
            <th className="px-3 py-3 font-medium">Size / Color</th>
            <th className="px-3 py-3 font-medium">Buying price</th>
            <th className="px-3 py-3 font-medium">Selling price</th>
            <th className="px-3 py-3 font-medium">Margin</th>
          </tr>
        </thead>
        <tbody>
          {items.map((product) => {
            const v = product.variants[0];
            const buy = v ? toNumber(v.buyingPrice) : 0;
            const sell = v ? toNumber(v.sellingPrice) : 0;
            const margin =
              sell > 0 ? ((sell - buy) / sell) * 100 : buy > 0 ? 0 : 0;
            const more = product.variants.length - 1;

            return (
              <tr
                key={product.id}
                className="border-t border-border/60 hover:bg-surface/60"
              >
                <td className="px-3 py-3 text-muted">
                  {product.productNo ?? "—"}
                </td>
                <td className="px-3 py-3">
                  <Link
                    href={`/products/${product.id}`}
                    className="font-medium text-secondary hover:underline"
                  >
                    {product.name}
                  </Link>
                  <div className="text-xs text-muted">
                    {product.category?.name ?? "Uncategorized"}
                    {product.garmentInfo
                      ? ` · ${product.garmentInfo}`
                      : ""}
                  </div>
                </td>
                <td className="px-3 py-3 font-mono text-xs">
                  {product.code ?? v?.sku ?? "—"}
                </td>
                <td className="px-3 py-3 text-muted">
                  {v ? `${v.size} / ${v.color}` : "—"}
                  {more > 0 && (
                    <span className="ml-1 text-xs">+{more}</span>
                  )}
                </td>
                <td className="px-3 py-3">{formatEtb(buy)}</td>
                <td className="px-3 py-3">{formatEtb(sell)}</td>
                <td className="px-3 py-3">
                  <Badge variant={margin >= 20 ? "success" : "default"}>
                    {margin.toFixed(1)}%
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
