import Link from "next/link";

import { CapitalAssetsTable } from "@/components/inventory/capital-assets-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatEtb, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function CapitalAssetsPage() {
  const assets = await prisma.capitalAsset.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const totalValue = assets.reduce(
    (sum, asset) => sum + toNumber(asset.purchaseCost),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Capital Assets
          </h1>
          <p className="mt-1 text-sm text-muted">
            Machines and equipment used in garment production.
          </p>
        </div>
        <Button asChild>
          <Link href="/inventory/capital-assets/new">Add asset</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="text-xs text-muted">Registered assets</p>
          <p className="mt-1 text-xl font-semibold">{assets.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Purchase value</p>
          <p className="mt-1 text-xl font-semibold">{formatEtb(totalValue)}</p>
        </Card>
      </div>

      <CapitalAssetsTable items={assets} />
    </div>
  );
}
