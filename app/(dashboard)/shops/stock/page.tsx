import Link from "next/link";

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
  searchParams?: { branchId?: string };
}) {
  const session = await requireSession();
  const shopOnly = isShopRole(session.user.role.name);
  const lockedBranchId = getShopBranchId(session);

  const branches = await prisma.branch.findMany({
    where: shopOnly
      ? { id: lockedBranchId ?? "__none__" }
      : { isActive: true, isShop: true },
    orderBy: { name: "asc" },
  });

  const branchId = shopOnly
    ? lockedBranchId ?? undefined
    : searchParams?.branchId || branches[0]?.id;

  const stocks = await prisma.finishedGoodsStock.findMany({
    where: branchId ? { branchId } : { branch: { isShop: true } },
    include: {
      variant: { include: { product: true } },
      branch: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const low = stocks.filter((s) => s.quantity <= s.reorderAt);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {shopOnly ? "My stock" : "Shop stock"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {shopOnly
              ? "Your shop only. Low stock is highlighted — restock when needed."
              : "Part of central control — every shop’s levels and stock alerts."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/shops/restock">
              {shopOnly ? "Add stock" : "Restock"}
            </Link>
          </Button>
          {!shopOnly && (
            <Button asChild variant="secondary">
              <Link href="/central">Central inventory</Link>
            </Button>
          )}
          <Button asChild variant="secondary">
            <Link href="/shops/sales">Import sales</Link>
          </Button>
        </div>
      </div>

      {!shopOnly && (
        <div className="flex flex-wrap gap-2">
          {branches.map((b) => (
            <Link
              key={b.id}
              href={`/shops/stock?branchId=${b.id}`}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                b.id === branchId
                  ? "bg-primary/15 text-primary"
                  : "bg-surface text-muted hover:text-[var(--text-primary)]"
              }`}
            >
              {b.name}
            </Link>
          ))}
        </div>
      )}

      <Card>
        <p className="text-sm text-muted">
          Stock alerts:{" "}
          <span className="font-semibold text-warning">{low.length}</span>
        </p>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-page/40 text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-3">Product</th>
              <th className="px-3 py-3">Code</th>
              <th className="px-3 py-3">Shop</th>
              <th className="px-3 py-3">Qty</th>
              <th className="px-3 py-3">Alert at</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((s) => (
              <tr key={s.id} className="border-t border-border/60">
                <td className="px-3 py-3">
                  {s.variant.product.name} ({s.variant.size}/{s.variant.color})
                </td>
                <td className="px-3 py-3 font-mono text-xs text-muted">
                  {s.variant.product.code ?? s.variant.sku}
                </td>
                <td className="px-3 py-3 text-muted">{s.branch.name}</td>
                <td className="px-3 py-3">{s.quantity}</td>
                <td className="px-3 py-3">
                  {shopOnly || isAdminRole(session.user.role.name) ? (
                    <ShopReorderEditor stockId={s.id} reorderAt={s.reorderAt} />
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
                <td colSpan={6} className="px-3 py-6 text-muted">
                  No stock yet. Use Add stock — manual or CSV / Excel import.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
