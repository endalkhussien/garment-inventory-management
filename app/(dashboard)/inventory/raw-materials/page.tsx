import Link from "next/link";

import { RawMaterialsTable } from "@/components/inventory/raw-materials-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function RawMaterialsPage() {
  const materials = await prisma.rawMaterial.findMany({
    where: { isActive: true },
    include: { supplier: true, category: true },
    orderBy: { name: "asc" },
  });

  const lowStockCount = materials.filter(
    (m) => toNumber(m.quantity) <= toNumber(m.reorderThreshold),
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Raw Materials
          </h1>
          <p className="mt-1 text-sm text-muted">
            Track yarn, thread, buttons, and other production inputs.
          </p>
        </div>
        <Button asChild>
          <Link href="/inventory/raw-materials/new">Add material</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-muted">Materials</p>
          <p className="mt-1 text-xl font-semibold">{materials.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Low stock alerts</p>
          <p className="mt-1 text-xl font-semibold text-warning">
            {lowStockCount}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Quick link</p>
          <Link
            href="/inventory/stock-movements"
            className="mt-1 inline-block text-sm text-secondary hover:underline"
          >
            View all stock movements
          </Link>
        </Card>
      </div>

      <RawMaterialsTable items={materials} />
    </div>
  );
}
