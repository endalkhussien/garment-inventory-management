import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatQuantity, toNumber } from "@/lib/format";
import {
  reasonCodeLabels,
  STOCK_REASON_CODES,
} from "@/lib/validations/inventory";

type MovementRow = {
  id: string;
  type: "IN" | "OUT";
  quantity: { toString(): string } | number;
  reasonCode: string;
  note: string | null;
  balanceAfter: { toString(): string } | number;
  createdAt: Date;
  rawMaterial: {
    id: string;
    name: string;
    unitOfMeasure: string;
  };
  createdBy: { name: string | null; email: string } | null;
};

export function StockMovementsTable({
  items,
  showMaterial = true,
}: {
  items: MovementRow[];
  showMaterial?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
        No stock movements recorded yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-3 font-medium">Date</th>
            {showMaterial && (
              <th className="px-3 py-3 font-medium">Material</th>
            )}
            <th className="px-3 py-3 font-medium">Type</th>
            <th className="px-3 py-3 font-medium">Quantity</th>
            <th className="px-3 py-3 font-medium">Reason</th>
            <th className="px-3 py-3 font-medium">Balance after</th>
            <th className="px-3 py-3 font-medium">By</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const reason =
              reasonCodeLabels[
                item.reasonCode as (typeof STOCK_REASON_CODES)[number]
              ] ?? item.reasonCode;

            return (
              <tr
                key={item.id}
                className="border-t border-border/60 hover:bg-surface/60"
              >
                <td className="px-3 py-3 text-muted">
                  {item.createdAt.toLocaleString("en-ET")}
                </td>
                {showMaterial && (
                  <td className="px-3 py-3">
                    <Link
                      href={`/inventory/raw-materials/${item.rawMaterial.id}`}
                      className="text-secondary hover:underline"
                    >
                      {item.rawMaterial.name}
                    </Link>
                  </td>
                )}
                <td className="px-3 py-3">
                  <Badge variant={item.type === "IN" ? "success" : "danger"}>
                    {item.type === "IN" ? "In" : "Out"}
                  </Badge>
                </td>
                <td className="px-3 py-3">
                  {formatQuantity(
                    toNumber(item.quantity),
                    item.rawMaterial.unitOfMeasure,
                  )}
                </td>
                <td className="px-3 py-3">
                  <div>{reason}</div>
                  {item.note && (
                    <div className="text-xs text-muted">{item.note}</div>
                  )}
                </td>
                <td className="px-3 py-3">
                  {formatQuantity(
                    toNumber(item.balanceAfter),
                    item.rawMaterial.unitOfMeasure,
                  )}
                </td>
                <td className="px-3 py-3 text-muted">
                  {item.createdBy?.name ?? item.createdBy?.email ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
