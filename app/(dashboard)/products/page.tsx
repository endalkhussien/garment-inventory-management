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
  searchParams?: { category?: string; q?: string };
}) {
  const session = await requireAdminOrShop();
  const shopMode = isShopRole(session.user.role.name);
  const q = searchParams?.q?.trim();

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
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
              {
                variants: {
                  some: {
                    isActive: true,
                    sku: { contains: q, mode: "insensitive" },
                  },
                },
              },
            ],
          }
        : {}),
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
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Product Catalog</h1>
          {q && (
            <p className="page-subtitle">
              Results for “{q}” ·{" "}
              <Link href="/products" className="text-secondary hover:underline">
                Clear
              </Link>
            </p>
          )}
        </div>
        <Button asChild>
          <Link href="/products/new">
            <Plus className="h-4 w-4" />
            Add product
          </Link>
        </Button>
      </div>

      <Card>
        <CategoryFilterChips
          path="/products"
          categories={categories}
          activeId={categoryId}
          currentParams={{
            category: categoryId,
            q: q || undefined,
          }}
        />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="label-caps">Products</p>
          <p className="mt-2 font-data text-2xl font-bold tabular-nums">
            {products.length}
          </p>
        </Card>
        <Card>
          <p className="label-caps">SKUs</p>
          <p className="mt-2 font-data text-2xl font-bold tabular-nums">
            {variantCount}
          </p>
        </Card>
      </div>

      <ProductsTable items={products} showCost={!shopMode} />
    </div>
  );
}
