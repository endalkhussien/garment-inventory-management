import Link from "next/link";

import {
  CategoryFilterChips,
  hrefWithQuery,
} from "@/components/filters/category-filter-chips";
import { ImportSalesForm } from "@/components/shops/import-sales-form";
import { Card } from "@/components/ui/card";
import { formatEtb, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  getShopBranchId,
  isAdminRole,
  isShopRole,
  requireSession,
} from "@/lib/rbac";

export default async function ImportSalesPage({
  searchParams,
}: {
  searchParams?: { category?: string; branchId?: string };
}) {
  const session = await requireSession();
  const shopOnly = isShopRole(session.user.role.name);
  const lockedBranchId = getShopBranchId(session);

  if (!shopOnly && !isAdminRole(session.user.role.name)) {
    return <p className="text-sm text-danger">Not allowed.</p>;
  }

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

  const branches = await prisma.branch.findMany({
    where: shopOnly
      ? { id: lockedBranchId ?? "__none__" }
      : { isActive: true, isShop: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const branchFilter: string | undefined = shopOnly
    ? lockedBranchId ?? undefined
    : searchParams?.branchId &&
        branches.some((b) => b.id === searchParams.branchId)
      ? searchParams.branchId
      : undefined;

  const latestSales = await prisma.sale.findMany({
    where: {
      ...(branchFilter ? { branchId: branchFilter } : undefined),
      ...(categoryId
        ? {
            items: {
              some: { variant: { product: { categoryId } } },
            },
          }
        : {}),
    },
    include: {
      branch: true,
      items: {
        include: {
          variant: { include: { product: { include: { category: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const queryBase: Record<string, string | undefined> = {
    category: categoryId,
    branchId: shopOnly ? undefined : branchFilter,
  };

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bulk sales</h1>
          <p className="mt-1 text-sm text-muted">
            Import multi-line receipts from external POS. Lines sharing the same
            receipt are saved as one sale.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/sales"
            className="text-sm text-secondary hover:underline"
          >
            Direct sale
          </Link>
          <Link
            href="/shops/stock"
            className="text-sm text-secondary hover:underline"
          >
            Stock
          </Link>
        </div>
      </div>

      <Card className="space-y-3">
        {!shopOnly && branches.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Shop
            </span>
            <Link
              href={hrefWithQuery("/shops/sales", queryBase, {
                branchId: undefined,
              })}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                !branchFilter
                  ? "bg-primary text-on-primary"
                  : "bg-page text-muted"
              }`}
            >
              All
            </Link>
            {branches.map((b) => (
              <Link
                key={b.id}
                href={hrefWithQuery("/shops/sales", queryBase, {
                  branchId: b.id,
                })}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  branchFilter === b.id
                    ? "bg-primary/15 text-primary"
                    : "bg-page text-muted"
                }`}
              >
                {b.name}
              </Link>
            ))}
          </div>
        )}
        <CategoryFilterChips
          path="/shops/sales"
          categories={categories}
          activeId={categoryId}
          currentParams={queryBase}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <ImportSalesForm
            branches={branches}
            lockedBranchId={shopOnly ? lockedBranchId : null}
            defaultBranchId={branchFilter ?? branches[0]?.id}
          />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Recent sales</h2>
          <ul className="max-h-[28rem] space-y-2 overflow-y-auto text-sm">
            {latestSales.map((s) => {
              const itemCount = s.items.length;
              const totalQty = s.items.reduce((sum, i) => sum + i.quantity, 0);
              const first = s.items[0];
              return (
                <li
                  key={s.id}
                  className="flex justify-between gap-2 border-b border-border/40 pb-2"
                >
                  <span className="min-w-0">
                    <span className="font-medium">{s.receiptNumber}</span>
                    <span className="block truncate text-muted">
                      {itemCount > 1
                        ? `${itemCount} items · ${totalQty} units`
                        : first
                          ? `${first.variant.product.name} ×${first.quantity}`
                          : "—"}
                      {first?.variant.product.category?.name
                        ? ` · ${first.variant.product.category.name}`
                        : ""}
                      {!shopOnly ? ` · ${s.branch.name}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatEtb(toNumber(s.total))}
                  </span>
                </li>
              );
            })}
            {latestSales.length === 0 && (
              <li className="text-muted">No sales for this filter.</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
