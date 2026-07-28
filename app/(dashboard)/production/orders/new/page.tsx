import { ProductionOrderForm } from "@/components/production/production-order-form";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function NewProductionOrderPage() {
  const [variants, employees, branches] = await Promise.all([
    prisma.productVariant.findMany({
      where: { isActive: true },
      include: { product: true },
      orderBy: { sku: "asc" },
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const hq = branches.find((b) => b.code === "HQ") ?? branches[0];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">New production order</h1>
        <p className="mt-1 text-sm text-muted">
          Only the essentials — you can start and issue materials on the next
          screen.
        </p>
      </div>
      <Card>
        <ProductionOrderForm
          variants={variants.map((v) => ({
            id: v.id,
            label: `${v.product.name} · ${v.size}/${v.color} (${v.sku})`,
          }))}
          employees={employees.map((e) => ({ id: e.id, label: e.name }))}
          branches={branches.map((b) => ({ id: b.id, label: b.name }))}
          defaultBranchId={hq?.id}
        />
      </Card>
    </div>
  );
}
