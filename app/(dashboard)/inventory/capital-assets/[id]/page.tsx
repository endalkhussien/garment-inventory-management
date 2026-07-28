import Link from "next/link";
import { notFound } from "next/navigation";

import { CapitalAssetForm } from "@/components/inventory/capital-asset-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatEtb, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { conditionLabels } from "@/lib/validations/inventory";

type PageProps = {
  params: { id: string };
};

export default async function CapitalAssetDetailPage({ params }: PageProps) {
  const { id } = params;

  const [asset, branches, assetTypes] = await Promise.all([
    prisma.capitalAsset.findUnique({ where: { id } }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.assetType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!asset) {
    notFound();
  }

  const purchaseDate = asset.purchaseDate
    ? asset.purchaseDate.toISOString().slice(0, 10)
    : "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            {asset.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {asset.typeName} · {conditionLabels[asset.condition]} ·{" "}
            {formatEtb(toNumber(asset.purchaseCost))}
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/inventory/capital-assets">Back to list</Link>
        </Button>
      </div>

      <Card>
        <CapitalAssetForm
          mode="edit"
          assetId={asset.id}
          assetTypes={assetTypes}
          branches={branches}
          defaultValues={{
            name: asset.name,
            typeId: asset.typeId ?? "__none__",
            typeName: asset.typeName,
            serialNumber: asset.serialNumber ?? "",
            purchaseDate,
            purchaseCost: toNumber(asset.purchaseCost),
            condition: asset.condition,
            location: asset.location ?? "",
            branchId: asset.branchId ?? "__none__",
          }}
        />
      </Card>
    </div>
  );
}
