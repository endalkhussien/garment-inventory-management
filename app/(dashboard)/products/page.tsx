import Link from "next/link";
import { Plus } from "lucide-react";

import { CategoryFilterChips } from "@/components/filters/category-filter-chips";
import { ProductsTable } from "@/components/products/products-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { isShopRole, requireAdminOrShop } from "@/lib/rbac";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const session = await requireAdminOrShop();
  const shopMode = isShopRole(session.user.role.name);

  const categories = await prisma.productCategory.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const categoryId =
    searchParams?.category &&
    categories.some((c) => c.id === searchParams.category)
      ? searchParams.category
      : undefined;

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
    },
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

      <Card>
        <CategoryFilterChips
          path="/products"
          categories={categories}
          activeId={categoryId}
          currentParams={{ category: categoryId }}
        />
      </Card>

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

      <ProductsTable items={products} showCost={!shopMode} />
    </div>
  );
}
