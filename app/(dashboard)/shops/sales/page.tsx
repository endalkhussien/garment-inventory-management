import Link from "next/link";

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

export default async function ImportSalesPage() {
  const session = await requireSession();
  const shopOnly = isShopRole(session.user.role.name);
  const lockedBranchId = getShopBranchId(session);

  if (!shopOnly && !isAdminRole(session.user.role.name)) {
    return (
      <p className="text-sm text-danger">You cannot import sales.</p>
    );
  }

  const branches = await prisma.branch.findMany({
    where: shopOnly
      ? { id: lockedBranchId ?? "__none__" }
      : { isActive: true, isShop: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const latestSales = await prisma.sale.findMany({
    where: shopOnly && lockedBranchId ? { branchId: lockedBranchId } : undefined,
    include: {
      branch: true,
      items: {
        include: { variant: { include: { product: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Import sales</h1>
        <p className="mt-1 text-sm text-muted">
          {shopOnly
            ? "Bring in sales from your external POS — stock and finance update for this shop only."
            : "Import external POS sales into any shop. Stock is deducted and finance / product insights update."}
        </p>
        <p className="mt-2 text-sm">
          <Link href="/central" className="text-secondary hover:underline">
            ← Central inventory
          </Link>
          {" · "}
          <Link
            href="/shops/finance"
            className="text-secondary hover:underline"
          >
            Finance
          </Link>
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <ImportSalesForm
            branches={branches}
            lockedBranchId={shopOnly ? lockedBranchId : null}
            defaultBranchId={branches[0]?.id}
          />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Recent sales</h2>
          <ul className="space-y-2 text-sm">
            {latestSales.map((s) => {
              const item = s.items[0];
              return (
                <li
                  key={s.id}
                  className="flex justify-between gap-2 border-b border-border/40 pb-2"
                >
                  <span>
                    <span className="font-medium">{s.receiptNumber}</span>
                    <span className="text-muted">
                      {" "}
                      ·{" "}
                      {item
                        ? `${item.variant.product.name} ×${item.quantity}`
                        : "—"}
                      {!shopOnly ? ` · ${s.branch.name}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0">
                    {formatEtb(toNumber(s.total))}
                  </span>
                </li>
              );
            })}
            {latestSales.length === 0 && (
              <li className="text-muted">No sales imported yet.</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
