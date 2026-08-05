import Link from "next/link";
import { Plus } from "lucide-react";

import { CategoryFilterChips } from "@/components/filters/category-filter-chips";
import { ProductsTable } from "@/components/products/products-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { isShopRole, requireAdminOrShop } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: { category?: string; q?: string; status?: string };
}) {
  const session = await requireAdminOrShop();
  const shopMode = isShopRole(session.user.role.name);
  const q = searchParams?.q?.trim();
  const status = searchParams?.status === "cancelled" ? "cancelled" : "active";
  const showActive = status === "active";

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
      isActive: showActive,
      ...(categoryId ? { categoryId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
              {
                variants: {
                  some: {
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
        where: showActive ? { isActive: true } : {},
        orderBy: [{ size: "asc" }, { color: "asc" }],
      },
    },
    orderBy: [{ productNo: "asc" }, { name: "asc" }],
  });

  const variantCount = products.reduce((sum, p) => sum + p.variants.length, 0);

  const baseParams = {
    category: categoryId,
    q: q || undefined,
    status: showActive ? undefined : "cancelled",
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Product Catalog</h1>
          {q && (
            <p className="page-subtitle">
              Results for “{q}” ·{" "}
              <Link href="/products" className="text-secondary hover:underline">
                Clear search
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

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-caps">Show</span>
          <Link
            href={buildStatusHref(
              { category: categoryId, q: q || undefined },
              "active",
            )}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              showActive
                ? "bg-[var(--primary-container)] text-white"
                : "bg-[var(--surface-container)] text-muted hover:text-[var(--text-primary)]",
            )}
          >
            Active
          </Link>
          <Link
            href={buildStatusHref(
              { category: categoryId, q: q || undefined },
              "cancelled",
            )}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              !showActive
                ? "bg-[var(--primary-container)] text-white"
                : "bg-[var(--surface-container)] text-muted hover:text-[var(--text-primary)]",
            )}
          >
            Cancelled
          </Link>
        </div>
        <CategoryFilterChips
          path="/products"
          categories={categories}
          activeId={categoryId}
          currentParams={baseParams}
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

function buildStatusHref(
  params: { category?: string; q?: string },
  status: "active" | "cancelled",
) {
  const p = new URLSearchParams();
  if (params.category) p.set("category", params.category);
  if (params.q) p.set("q", params.q);
  if (status === "cancelled") p.set("status", "cancelled");
  const qs = p.toString();
  return qs ? `/products?${qs}` : "/products";
}
