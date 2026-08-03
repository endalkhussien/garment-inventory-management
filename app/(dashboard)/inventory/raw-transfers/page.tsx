import { RawMaterialTransferForm } from "@/components/inventory/raw-material-transfer-form";
import { Card } from "@/components/ui/card";
import { formatQuantity, toNumber } from "@/lib/format";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function RawMaterialTransfersPage() {
  await requireAdmin();

  const [materials, branches, transfers] = await Promise.all([
    prisma.rawMaterial.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unitOfMeasure: true, code: true },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.rawMaterialTransfer.findMany({
      include: {
        rawMaterial: true,
        fromBranch: true,
        toBranch: true,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const hq =
    branches.find((b) => b.isWarehouse) ??
    branches.find((b) => b.code === "HQ") ??
    branches[0];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Raw material transfers</h1>
        <p className="mt-1 text-sm text-muted">
          Move fabric and trims between warehouse, cutting, and other locations.
        </p>
      </div>

      <Card>
        <RawMaterialTransferForm
          defaultFromId={hq?.id}
          materials={materials.map((m) => ({
            id: m.id,
            label: `${m.name}${m.code ? ` (${m.code})` : ""} · ${m.unitOfMeasure}`,
          }))}
          branches={branches.map((b) => ({ id: b.id, label: b.name }))}
        />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Recent transfers</h2>
        <ul className="space-y-2 text-sm text-muted">
          {transfers.map((t) => (
            <li key={t.id}>
              {t.createdAt.toLocaleString("en-ET")} ·{" "}
              {formatQuantity(toNumber(t.quantity), t.rawMaterial.unitOfMeasure)}{" "}
              {t.rawMaterial.name} · {t.fromBranch.name} → {t.toBranch.name}
            </li>
          ))}
          {transfers.length === 0 && <li>No raw material transfers yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
