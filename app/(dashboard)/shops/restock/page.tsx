import Link from "next/link";

import { RestockForms } from "@/components/shops/restock-forms";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import {
  getShopBranchId,
  isAdminRole,
  isShopRole,
  requireSession,
} from "@/lib/rbac";

export default async function RestockPage() {
  const session = await requireSession();
  const shopOnly = isShopRole(session.user.role.name);
  const lockedBranchId = getShopBranchId(session);

  if (!shopOnly && !isAdminRole(session.user.role.name)) {
    return (
      <p className="text-sm text-danger">You cannot restock inventory.</p>
    );
  }

  const branches = await prisma.branch.findMany({
    where: shopOnly
      ? { id: lockedBranchId ?? "__none__" }
      : { isActive: true, isShop: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const variants = await prisma.productVariant.findMany({
    where: { isActive: true, product: { isActive: true } },
    include: { product: true },
    orderBy: [{ product: { name: "asc" } }, { size: "asc" }],
  });

  const options = variants.map((v) => ({
    id: v.id,
    code: v.product.code ?? v.sku,
    label: `${v.product.code ?? v.sku} · ${v.product.name} (${v.size}/${v.color})`,
  }));

  const recent = await prisma.finishedGoodsMovement.findMany({
    where: {
      ...(lockedBranchId ? { branchId: lockedBranchId } : {}),
      type: {
        in: [
          "RESTOCK_MANUAL",
          "RESTOCK_IMPORT",
          "ORDER_FULFILL",
          "TRANSFER_IN",
        ],
      },
    },
    include: {
      variant: { include: { product: true } },
      branch: true,
    },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">
          {shopOnly ? "Add stock" : "Restock shops"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {shopOnly
            ? "Add products to your shop stock manually, or import CSV / Excel (code + quantity)."
            : "Add stock to any shop manually, or import CSV / Excel."}
        </p>
        <p className="mt-2 text-sm">
          <Link href="/shops/stock" className="text-secondary hover:underline">
            ← My stock
          </Link>
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <RestockForms
            branches={branches}
            variants={options}
            lockedBranchId={shopOnly ? lockedBranchId : null}
            defaultBranchId={branches[0]?.id}
            shopMode={shopOnly}
          />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Recent stock you added</h2>
          <ul className="space-y-2 text-sm">
            {recent.map((m) => (
              <li
                key={m.id}
                className="flex justify-between gap-2 border-b border-border/40 pb-2"
              >
                <span>
                  <span className="font-medium">
                    {m.variant.product.name}
                  </span>
                  <span className="text-muted">
                    {" "}
                    · +{m.quantity} ·{" "}
                    {m.type.replace(/_/g, " ").toLowerCase()}
                    {!shopOnly ? ` · ${m.branch.name}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {m.createdAt.toLocaleString("en-ET")}
                </span>
              </li>
            ))}
            {recent.length === 0 && (
              <li className="text-muted">No stock-ins yet.</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
