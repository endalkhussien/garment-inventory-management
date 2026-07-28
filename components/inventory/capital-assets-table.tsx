import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatEtb, toNumber } from "@/lib/format";
import {
  ASSET_CONDITIONS,
  conditionLabels,
} from "@/lib/validations/inventory";

type CapitalAssetRow = {
  id: string;
  name: string;
  typeName: string;
  serialNumber: string | null;
  purchaseDate: Date | null;
  purchaseCost: { toString(): string } | number;
  condition: (typeof ASSET_CONDITIONS)[number];
  location: string | null;
};

const conditionVariant: Record<
  (typeof ASSET_CONDITIONS)[number],
  "success" | "default" | "warning" | "danger" | "secondary"
> = {
  NEW: "success",
  GOOD: "default",
  FAIR: "warning",
  POOR: "danger",
  RETIRED: "secondary",
};

export function CapitalAssetsTable({ items }: { items: CapitalAssetRow[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
        No capital assets yet. Register sewing machines and other equipment
        here.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-3 font-medium">Asset</th>
            <th className="px-3 py-3 font-medium">Type</th>
            <th className="px-3 py-3 font-medium">Serial</th>
            <th className="px-3 py-3 font-medium">Purchase</th>
            <th className="px-3 py-3 font-medium">Cost</th>
            <th className="px-3 py-3 font-medium">Condition</th>
            <th className="px-3 py-3 font-medium">Location</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-t border-border/60 hover:bg-surface/60"
            >
              <td className="px-3 py-3">
                <Link
                  href={`/inventory/capital-assets/${item.id}`}
                  className="font-medium text-secondary hover:underline"
                >
                  {item.name}
                </Link>
              </td>
              <td className="px-3 py-3 text-muted">{item.typeName}</td>
              <td className="px-3 py-3 text-muted">
                {item.serialNumber ?? "—"}
              </td>
              <td className="px-3 py-3 text-muted">
                {item.purchaseDate
                  ? item.purchaseDate.toLocaleDateString("en-ET")
                  : "—"}
              </td>
              <td className="px-3 py-3">
                {formatEtb(toNumber(item.purchaseCost))}
              </td>
              <td className="px-3 py-3">
                <Badge variant={conditionVariant[item.condition]}>
                  {conditionLabels[item.condition]}
                </Badge>
              </td>
              <td className="px-3 py-3 text-muted">{item.location ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
