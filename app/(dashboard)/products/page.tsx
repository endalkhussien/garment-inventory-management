import Link from "next/link";

import { ProductsTable } from "@/components/products/products-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: true,
      variants: {
        where: { isActive: true },
        orderBy: [{ size: "asc" }, { color: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  });

  const staleCount = products.filter((p) =>
    p.variants.some((v) => v.costIsStale),
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Products & BOM
          </h1>
          <p className="mt-1 text-sm text-muted">
            Define what you sew and the materials each piece needs — required
            before production can issue stock.
          </p>
        </div>
        <Button asChild>
          <Link href="/products/new">Add product</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="text-xs text-muted">Products</p>
          <p className="mt-1 text-xl font-semibold">{products.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Stale cost alerts</p>
          <p className="mt-1 text-xl font-semibold text-warning">{staleCount}</p>
        </Card>
      </div>

      <ProductsTable items={products} />
    </div>
  );
}
