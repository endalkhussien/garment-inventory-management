import Link from "next/link";
import { Plus } from "lucide-react";

import { ProductsTable } from "@/components/products/products-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireAdminOrShop } from "@/lib/rbac";

export default async function ProductsPage() {
  await requireAdminOrShop();
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

  const variantCount = products.reduce((sum, p) => sum + p.variants.length, 0);

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Products</h1>
        <Button asChild>
          <Link href="/products/new">
            <Plus className="h-4 w-4" />
            New product
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Products</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {products.length}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-muted">SKUs</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {variantCount}
          </p>
        </Card>
      </div>

      <ProductsTable items={products} />
    </div>
  );
}
