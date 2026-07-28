import { RawMaterialForm } from "@/components/inventory/raw-material-form";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function NewRawMaterialPage() {
  await requireAdmin();
  const [categories, suppliers, branches] = await Promise.all([
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
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Add raw material
        </h1>
        <p className="mt-1 text-sm text-muted">
          Register a new input with cost, reorder level, and opening stock.
        </p>
      </div>
      <Card>
        <RawMaterialForm
          mode="create"
          categories={categories}
          suppliers={suppliers}
          branches={branches}
        />
      </Card>
    </div>
  );
}
