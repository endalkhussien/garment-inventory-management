import Link from "next/link";

import {
  CategoryFilterChips,
  StatusFilterChips,
  hrefWithQuery,
} from "@/components/filters/category-filter-chips";
import { ShopReorderEditor } from "@/components/shops/shop-reorder-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import {
  getShopBranchId,
  isAdminRole,
  isShopRole,
  requireSession,
} from "@/lib/rbac";

export default async function ShopStockPage({
  searchParams,
}: {
  searchParams?: { branchId?: string; category?: string; status?: string };
}) {
  const session = await requireSession();
  const shopOnly = isShopRole(session.user.role.name);
  const lockedBranchId = getShopBranchId(session);

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
  const status =
    searchParams?.status === "low" || searchParams?.status === "ok"
      ? searchParams.status
      : undefined;

  const branches = await prisma.branch.findMany({
    where: shopOnly
      ? { id: lockedBranchId ?? "__none__" }
      : { isActive: true, isShop: true },
    orderBy: { name: "asc" },
  });

  const branchId = shopOnly
    ? lockedBranchId ?? undefined
    : searchParams?.branchId || branches[0]?.id;

  const stocksRaw = await prisma.finishedGoodsStock.findMany({
    where: {
      ...(branchId ? { branchId } : { branch: { isShop: true } }),
      ...(categoryId
        ? { variant: { product: { categoryId } } }
        : {}),
    },
    include: {
      variant: {
        include: { product: { include: { category: true } } },
      },
      branch: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const stocks =
    status === "low"
      ? stocksRaw.filter((s) => s.quantity <= s.reorderAt)
      : status === "ok"
        ? stocksRaw.filter((s) => s.quantity > s.reorderAt)
        : stocksRaw;

  const low = stocksRaw.filter((s) => s.quantity <= s.reorderAt);

  const queryBase = {
    branchId: shopOnly ? undefined : branchId,
    category: categoryId,
    status,
  };

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="page-title">{shopOnly ? "Stock" : "Shop stock"}</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/shops/restock">
              {shopOnly ? "Restock" : "Restock"}
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/shops/sales">Sales</Link>
          </Button>
        </div>
      </div>

      {!shopOnly && (
        <div className="flex flex-wrap gap-2">
          {branches.map((b) => (
            <Link
              key={b.id}
              href={hrefWithQuery("/shops/stock", queryBase, {
                branchId: b.id,
              })}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                b.id === branchId
                  ? "bg-primary text-on-primary"
                  : "bg-page text-muted"
              }`}
            >
              {b.name}
            </Link>
          ))}
        </div>
      )}

      <Card className="space-y-3">
        <CategoryFilterChips
          path="/shops/stock"
          categories={categories}
          activeId={categoryId}
          currentParams={queryBase}
        />
        <StatusFilterChips
          path="/shops/stock"
          active={status}
          currentParams={queryBase}
        />
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase text-muted">Lines</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {stocks.length}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-muted">Units</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {stocks.reduce((sum, s) => sum + s.quantity, 0)}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-muted">Low stock</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-warning">
            {low.length}
          </p>
        </Card>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--bg-elevated)] text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-3">Product</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Code</th>
              {!shopOnly && <th className="px-3 py-3">Shop</th>}
              <th className="px-3 py-3">Qty</th>
              <th className="px-3 py-3">Alert</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((s) => (
              <tr
                key={s.id}
                className="border-t border-border/60 hover:bg-page/50"
              >
                <td className="px-3 py-3">
                  {s.variant.product.name} ({s.variant.size}/{s.variant.color})
                </td>
                <td className="px-3 py-3 text-muted">
                  {s.variant.product.category?.name ?? "—"}
                </td>
                <td className="px-3 py-3 font-mono text-xs text-muted">
                  {s.variant.product.code ?? s.variant.sku}
                </td>
                {!shopOnly && (
                  <td className="px-3 py-3 text-muted">{s.branch.name}</td>
                )}
                <td className="px-3 py-3 tabular-nums">{s.quantity}</td>
                <td className="px-3 py-3">
                  {shopOnly || isAdminRole(session.user.role.name) ? (
                    <ShopReorderEditor
                      stockId={s.id}
                      reorderAt={s.reorderAt}
                    />
                  ) : (
                    s.reorderAt
                  )}
                </td>
                <td className="px-3 py-3">
                  {s.quantity <= s.reorderAt ? (
                    <Badge variant="warning">Low</Badge>
                  ) : (
                    <Badge variant="success">OK</Badge>
                  )}
                </td>
              </tr>
            ))}
            {stocks.length === 0 && (
              <tr>
                <td
                  colSpan={shopOnly ? 6 : 7}
                  className="px-3 py-6 text-muted"
                >
                  No stock for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
