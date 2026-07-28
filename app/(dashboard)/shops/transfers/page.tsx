import { TransferForm } from "@/components/sales/transfer-form";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function TransfersPage() {
  const [variants, branches, transfers] = await Promise.all([
    prisma.productVariant.findMany({
      where: { isActive: true },
      include: { product: true },
      orderBy: { sku: "asc" },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.stockTransfer.findMany({
      include: {
        variant: { include: { product: true } },
        fromBranch: true,
        toBranch: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const hq = branches.find((b) => b.code === "HQ") ?? branches[0];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Stock transfer</h1>
        <p className="mt-1 text-sm text-muted">
          Move finished goods from warehouse to a shop in one step.
        </p>
      </div>
      <Card>
        <TransferForm
          defaultFromId={hq?.id}
          variants={variants.map((v) => ({
            id: v.id,
            label: `${v.product.name} · ${v.size}/${v.color}`,
          }))}
          branches={branches.map((b) => ({ id: b.id, label: b.name }))}
        />
      </Card>
      <Card>
        <h2 className="mb-3 text-sm font-semibold">Recent transfers</h2>
        <ul className="space-y-2 text-sm text-muted">
          {transfers.map((t) => (
            <li key={t.id}>
              {t.createdAt.toLocaleString("en-ET")} · {t.quantity} ×{" "}
              {t.variant.product.name} · {t.fromBranch.name} → {t.toBranch.name}
            </li>
          ))}
          {transfers.length === 0 && <li>No transfers yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
