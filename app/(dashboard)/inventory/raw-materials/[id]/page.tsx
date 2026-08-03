import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { LowStockBadge } from "@/components/inventory/low-stock-badge";
import { RawMaterialForm } from "@/components/inventory/raw-material-form";
import { StockMovementForm } from "@/components/inventory/stock-movement-form";
import { StockMovementsTable } from "@/components/inventory/stock-movements-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { setRawMaterialActive } from "@/lib/actions/inventory";
import { formatEtb, formatQuantity, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: { id: string };
};

export default async function RawMaterialDetailPage({ params }: PageProps) {
  const { id } = params;

  const [material, categories, suppliers, branches, movements, branchStocks] =
    await Promise.all([
    prisma.rawMaterial.findUnique({
      where: { id },
      include: { supplier: true, branch: true, category: true },
    }),
    prisma.materialCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.stockMovement.findMany({
      where: { rawMaterialId: id },
      include: {
        rawMaterial: {
          select: { id: true, name: true, unitOfMeasure: true },
        },
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.rawMaterialStock.findMany({
      where: { rawMaterialId: id },
      include: { branch: { select: { name: true, code: true } } },
      orderBy: { branch: { name: "asc" } },
    }),
  ]);

  if (!material) {
    notFound();
  }

  const qty = toNumber(material.quantity);
  const threshold = toNumber(material.reorderThreshold);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              {material.name}
            </h1>
            <LowStockBadge quantity={qty} reorderThreshold={threshold} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {material.category?.name ?? "Uncategorized"} ·{" "}
            {formatQuantity(qty, material.unitOfMeasure)} on hand ·{" "}
            {formatEtb(toNumber(material.costPerUnit))} /{" "}
            {material.unitOfMeasure}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ConfirmActionButton
            label={material.isActive ? "Deactivate" : "Reactivate"}
            confirmMessage={
              material.isActive
                ? `Deactivate ${material.name}? It stays in history but leaves active lists.`
                : `Reactivate ${material.name}?`
            }
            action={() => setRawMaterialActive(material.id, !material.isActive)}
            variant={material.isActive ? "danger" : "default"}
            size="default"
          />
          <Button asChild variant="secondary">
            <Link href={`/inventory/lots?material=${material.id}`}>
              Lots / rolls
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/inventory/raw-materials">Back to list</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
            Stock in / out
          </h2>
          <StockMovementForm
            rawMaterialId={material.id}
            unitOfMeasure={material.unitOfMeasure}
            currentQuantity={qty}
            branches={branches}
            defaultBranchId={material.branchId}
          />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
            By location
          </h2>
          {branchStocks.length === 0 ? (
            <p className="text-sm text-muted">
              No branch balances yet — first movement or transfer will create
              them.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {branchStocks.map((s) => (
                <li
                  key={s.id}
                  className="flex justify-between gap-2 border-b border-border/40 pb-2"
                >
                  <span>
                    {s.branch.name}
                    <span className="text-muted"> ({s.branch.code})</span>
                  </span>
                  <span className="font-medium">
                    {formatQuantity(toNumber(s.quantity), material.unitOfMeasure)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
            Material details
          </h2>
          <RawMaterialForm
            mode="edit"
            materialId={material.id}
            categories={categories}
            suppliers={suppliers}
            branches={branches}
            defaultValues={{
              name: material.name,
              code: material.code ?? "",
              categoryId: material.categoryId ?? undefined,
              unitOfMeasure: material.unitOfMeasure,
              supplierId: material.supplierId ?? "__none__",
              costPerUnit: toNumber(material.costPerUnit),
              reorderThreshold: threshold,
              location: material.location ?? "",
              branchId: material.branchId ?? "__none__",
            }}
          />
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Movement history
        </h2>
        <StockMovementsTable items={movements} showMaterial={false} />
      </div>
    </div>
  );
}
