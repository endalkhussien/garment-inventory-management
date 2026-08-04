import Link from "next/link";

import { ProductsTable } from "@/components/products/products-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";

export default async function ProductsPage() {
  await requireAdmin();
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: true,
      variants: {
        where: { isActive: true },
        orderBy: [{ size: "asc" }, { color: "asc" }],
      },
    },
    orderBy: [{ productNo: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Products
          </h1>
          <p className="mt-1 text-sm text-muted">
            Register garments with code, buying price, and selling price. Used
            for stock, sales, and profit calculations.
          </p>
        </div>
        <Button asChild>
          <Link href="/products/new">Register product</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="text-xs text-muted">Active products</p>
          <p className="mt-1 text-xl font-semibold">{products.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Total variants / SKUs</p>
          <p className="mt-1 text-xl font-semibold">
            {products.reduce((sum, p) => sum + p.variants.length, 0)}
          </p>
        </Card>
      </div>

      <ProductsTable items={products} />
    </div>
  );
}
