import Link from "next/link";

import { LowStockBadge } from "@/components/inventory/low-stock-badge";
import { Badge } from "@/components/ui/badge";
import { formatEtb, formatQuantity, toNumber } from "@/lib/format";

type RawMaterialRow = {
  id: string;
  name: string;
  category: { name: string } | null;
  unitOfMeasure: string;
  quantity: { toString(): string } | number;
  reorderThreshold: { toString(): string } | number;
  costPerUnit: { toString(): string } | number;
  location: string | null;
  supplier: { name: string } | null;
};

export function RawMaterialsTable({ items }: { items: RawMaterialRow[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
        No raw materials yet. Register yarn, thread, buttons, and other inputs
        to start tracking stock.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-3 font-medium">Material</th>
            <th className="px-3 py-3 font-medium">Category</th>
            <th className="px-3 py-3 font-medium">Stock</th>
            <th className="px-3 py-3 font-medium">Cost / unit</th>
            <th className="px-3 py-3 font-medium">Supplier</th>
            <th className="px-3 py-3 font-medium">Location</th>
            <th className="px-3 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const qty = toNumber(item.quantity);
            const threshold = toNumber(item.reorderThreshold);
            const isLow = qty <= threshold;

            return (
              <tr
                key={item.id}
                className="border-t border-border/60 hover:bg-surface/60"
              >
                <td className="px-3 py-3">
                  <Link
                    href={`/inventory/raw-materials/${item.id}`}
                    className="font-medium text-secondary hover:underline"
                  >
                    {item.name}
                  </Link>
                </td>
                <td className="px-3 py-3 text-muted">
                  {item.category?.name ?? "Uncategorized"}
                </td>
                <td className="px-3 py-3">
                  {formatQuantity(qty, item.unitOfMeasure)}
                </td>
                <td className="px-3 py-3">
                  {formatEtb(toNumber(item.costPerUnit))}
                </td>
                <td className="px-3 py-3 text-muted">
                  {item.supplier?.name ?? "—"}
                </td>
                <td className="px-3 py-3 text-muted">{item.location ?? "—"}</td>
                <td className="px-3 py-3">
                  {isLow ? (
                    <LowStockBadge
                      quantity={qty}
                      reorderThreshold={threshold}
                    />
                  ) : (
                    <Badge variant="success">OK</Badge>
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
