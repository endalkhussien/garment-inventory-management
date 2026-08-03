import Link from "next/link";

import { ReceiveLotForm } from "@/components/inventory/receive-lot-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatQuantity, toNumber } from "@/lib/format";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const statusTone: Record<string, string> = {
  AVAILABLE: "bg-success/15 text-success",
  LEFTOVER: "bg-secondary/15 text-secondary",
  ISSUED: "bg-warning/15 text-warning",
  DEPLETED: "bg-muted text-muted",
};

export default async function MaterialLotsPage() {
  await requireAdmin();

  const [lots, materials, branches] = await Promise.all([
    prisma.materialLot.findMany({
      include: {
        rawMaterial: { select: { name: true, unitOfMeasure: true, code: true } },
        branch: { select: { name: true } },
        productionOrder: { select: { orderNumber: true, id: true } },
      },
      orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.rawMaterial.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unitOfMeasure: true },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Fabric & material lots</h1>
        <p className="mt-1 text-sm text-muted">
          Track batch, roll, shade, usable length, and leftovers — not only book
          quantity.
        </p>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Receive lot / roll</h2>
        <ReceiveLotForm
          materials={materials.map((m) => ({
            id: m.id,
            name: m.name,
            unit: m.unitOfMeasure,
          }))}
          branches={branches}
        />
      </Card>

      <Card className="overflow-x-auto p-0">
        {lots.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            No lots yet. Receive fabric/trims with batch and usable quantity.
          </p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-page text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-3">Material</th>
                <th className="px-3 py-3">Lot / roll</th>
                <th className="px-3 py-3">Usable</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Location</th>
                <th className="px-3 py-3">Order</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => (
                <tr key={lot.id} className="border-t border-border/60">
                  <td className="px-3 py-3">
                    <Link
                      href={`/inventory/raw-materials/${lot.rawMaterialId}`}
                      className="font-medium text-secondary hover:underline"
                    >
                      {lot.rawMaterial.name}
                    </Link>
                    {lot.rawMaterial.code && (
                      <p className="text-xs text-muted">{lot.rawMaterial.code}</p>
                    )}
                    {lot.shade && (
                      <p className="text-xs text-muted">Shade {lot.shade}</p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {lot.lotCode}
                    {lot.rollNumber ? ` · ${lot.rollNumber}` : ""}
                  </td>
                  <td className="px-3 py-3">
                    {formatQuantity(
                      toNumber(lot.usableQty),
                      lot.rawMaterial.unitOfMeasure,
                    )}
                    <p className="text-xs text-muted">
                      of{" "}
                      {formatQuantity(
                        toNumber(lot.originalQty),
                        lot.rawMaterial.unitOfMeasure,
                      )}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-lg px-2 py-1 text-xs ${statusTone[lot.status] ?? ""}`}
                    >
                      {lot.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {lot.location ?? lot.branch?.name ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    {lot.productionOrder ? (
                      <Link
                        href={`/production/orders/${lot.productionOrder.id}`}
                        className="text-secondary hover:underline"
                      >
                        {lot.productionOrder.orderNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="flex gap-2">
        <Button asChild variant="secondary">
          <Link href="/inventory/raw-materials">Raw materials</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/inventory/stocktake">Stocktake</Link>
        </Button>
      </div>
    </div>
  );
}
