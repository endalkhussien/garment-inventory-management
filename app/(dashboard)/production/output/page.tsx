import { OutputEntryForm } from "@/components/production/output-entry-form";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function OutputEntryPage() {
  const [orders, employees] = await Promise.all([
    prisma.productionOrder.findMany({
      where: { status: "IN_PROGRESS" },
      include: { variant: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Output Entry</h1>
        <p className="mt-1 text-sm text-muted">
          Log good and rejected pieces for open orders — employee is optional.
        </p>
      </div>
      <Card>
        <OutputEntryForm
          orders={orders.map((o) => ({
            id: o.id,
            label: `${o.orderNumber} · ${o.variant.product.name} (${o.quantityGood}/${o.quantityTarget})`,
          }))}
          employees={employees.map((e) => ({ id: e.id, label: e.name }))}
        />
      </Card>
    </div>
  );
}
