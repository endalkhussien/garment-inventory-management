import { CapitalAssetForm } from "@/components/inventory/capital-asset-form";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function NewCapitalAssetPage() {
  await requireAdmin();
  const [branches, assetTypes] = await Promise.all([
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Register capital asset
        </h1>
        <p className="mt-1 text-sm text-muted">
          Add a sewing machine or other equipment with purchase and location
          details.
        </p>
      </div>
      <Card>
        <CapitalAssetForm
          mode="create"
          assetTypes={assetTypes}
          branches={branches}
        />
      </Card>
    </div>
  );
}
