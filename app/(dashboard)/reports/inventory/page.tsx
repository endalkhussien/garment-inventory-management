import { CsvDownloadButton } from "@/components/reports/csv-download-button";
import { Card } from "@/components/ui/card";
import { formatEtb, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function InventoryReportPage() {
  const materials = await prisma.rawMaterial.findMany({
    where: { isActive: true },
    include: { supplier: true, category: true },
    orderBy: { name: "asc" },
  });

  const rows = materials.map((m) => ({
    name: m.name,
    category: m.category?.name ?? "Uncategorized",
    qty: toNumber(m.quantity),
    unit: m.unitOfMeasure,
    cost: toNumber(m.costPerUnit),
    value: toNumber(m.quantity) * toNumber(m.costPerUnit),
    low: toNumber(m.quantity) <= toNumber(m.reorderThreshold) ? "YES" : "NO",
  }));

  const csv = [
    "Name,Category,Qty,Unit,Cost,Value,LowStock",
    ...rows.map(
      (r) =>
        `"${r.name}",${r.category},${r.qty},${r.unit},${r.cost},${r.value},${r.low}`,
    ),
  ].join("\n");

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inventory report</h1>
          <p className="text-sm text-muted">{rows.length} materials</p>
        </div>
        <CsvDownloadButton filename="inventory-report.csv" content={csv} />
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Material</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Value</th>
              <th className="px-3 py-2">Low?</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-border/60">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">
                  {r.qty} {r.unit}
                </td>
                <td className="px-3 py-2">{formatEtb(r.value)}</td>
                <td className="px-3 py-2 text-muted">{r.low}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
