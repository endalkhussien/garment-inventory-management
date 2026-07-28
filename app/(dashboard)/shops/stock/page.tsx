import Link from "next/link";

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
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const branchId = shopOnly
    ? lockedBranchId ?? undefined
    : searchParams?.branchId || branches[0]?.id;

  const stocks = await prisma.finishedGoodsStock.findMany({
    where: branchId ? { branchId } : undefined,
    include: {
      variant: { include: { product: true } },
      branch: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const low = stocks.filter((s) => s.quantity <= s.reorderAt);
  const visibleBranches = shopOnly
    ? branches.filter((b) => b.id === lockedBranchId)
    : branches;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Shop / finished stock</h1>
          <p className="mt-1 text-sm text-muted">
            {shopOnly
              ? "Your shop stock only."
              : "Live stock by location. Low-stock rows are highlighted."}
          </p>
        </div>
        {isAdminRole(session.user.role.name) && (
          <Button asChild>
            <Link href="/shops/transfers">Transfer stock</Link>
          </Button>
        )}
      </div>

      {!shopOnly && (
        <div className="flex flex-wrap gap-2">
          {visibleBranches.map((b) => (
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
          Low stock alerts here:{" "}
          <span className="font-semibold text-warning">{low.length}</span>
        </p>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-page/40 text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-3">Product</th>
              <th className="px-3 py-3">Location</th>
              <th className="px-3 py-3">Qty</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((s) => (
              <tr key={s.id} className="border-t border-border/60">
                <td className="px-3 py-3">
                  {s.variant.product.name} ({s.variant.size}/{s.variant.color})
                </td>
                <td className="px-3 py-3 text-muted">{s.branch.name}</td>
                <td className="px-3 py-3">{s.quantity}</td>
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
                <td colSpan={4} className="px-3 py-6 text-muted">
                  No finished goods here yet. Complete a production order or
                  transfer stock in.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
