import { StockMovementsTable } from "@/components/inventory/stock-movements-table";
import { prisma } from "@/lib/prisma";

export default async function StockMovementsPage() {
  const movements = await prisma.stockMovement.findMany({
    include: {
      rawMaterial: {
        select: { id: true, name: true, unitOfMeasure: true },
      },
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Stock Movements
        </h1>
        <p className="mt-1 text-sm text-muted">
          History of stock-in and stock-out across all raw materials.
        </p>
      </div>
      <StockMovementsTable items={movements} />
    </div>
  );
}
