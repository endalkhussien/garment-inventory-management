import Link from "next/link";

import { CsvDownloadButton } from "@/components/reports/csv-download-button";
import { Card } from "@/components/ui/card";
import { formatEtb, formatQuantity, toNumber } from "@/lib/format";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function LeftoverFabricReportPage() {
  await requireAdmin();

  const lots = await prisma.materialLot.findMany({
    where: {
      status: { in: ["LEFTOVER", "AVAILABLE"] },
      usableQty: { gt: 0 },
    },
    include: {
      rawMaterial: true,
      branch: true,
      productionOrder: { select: { orderNumber: true, id: true } },
    },
    orderBy: [{ status: "asc" }, { receivedAt: "desc" }],
  });

  const leftovers = lots.filter((l) => l.status === "LEFTOVER");
  const available = lots.filter((l) => l.status === "AVAILABLE");

  const leftoverValue = leftovers.reduce(
    (sum, l) =>
      sum + toNumber(l.usableQty) * toNumber(l.rawMaterial.costPerUnit),
    0,
  );

  const csv = [
    "Status,Material,Lot,Roll,Shade,Usable,Unit,Value,Location,Order",
    ...lots.map((l) => {
      const qty = toNumber(l.usableQty);
      const value = qty * toNumber(l.rawMaterial.costPerUnit);
      return `"${l.status}","${l.rawMaterial.name}","${l.lotCode}","${l.rollNumber ?? ""}","${l.shade ?? ""}",${qty},${l.rawMaterial.unitOfMeasure},${value},"${l.location ?? l.branch?.name ?? ""}","${l.productionOrder?.orderNumber ?? ""}"`;
    }),
  ].join("\n");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Leftover & usable fabric</h1>
          <p className="text-sm text-muted">
            {leftovers.length} leftover lots · value about{" "}
            {formatEtb(leftoverValue)} · {available.length} other usable lots
          </p>
        </div>
        <div className="flex gap-2">
          <CsvDownloadButton filename="leftover-fabric.csv" content={csv} />
          <Link
            href="/inventory/lots"
            className="text-sm text-secondary hover:underline"
          >
            Lots
          </Link>
        </div>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Material / lot</th>
              <th className="px-3 py-2">Usable</th>
              <th className="px-3 py-2">Value</th>
              <th className="px-3 py-2">Where</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((l) => {
              const qty = toNumber(l.usableQty);
              const value = qty * toNumber(l.rawMaterial.costPerUnit);
              return (
                <tr key={l.id} className="border-t border-border/60">
                  <td className="px-3 py-2">{l.status}</td>
                  <td className="px-3 py-2">
                    {l.rawMaterial.name}
                    <p className="text-xs text-muted">
                      {l.lotCode}
                      {l.rollNumber ? ` · ${l.rollNumber}` : ""}
                      {l.shade ? ` · shade ${l.shade}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    {formatQuantity(qty, l.rawMaterial.unitOfMeasure)}
                  </td>
                  <td className="px-3 py-2">{formatEtb(value)}</td>
                  <td className="px-3 py-2 text-muted">
                    {l.location ?? l.branch?.name ?? "—"}
                    {l.productionOrder && (
                      <p className="text-xs">
                        from {l.productionOrder.orderNumber}
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
            {lots.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-muted">
                  No usable leftover or lot stock recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
