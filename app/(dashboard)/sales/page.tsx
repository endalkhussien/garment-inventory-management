import Link from "next/link";

import { PosSaleForm } from "@/components/sales/pos-sale-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatEtb, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  getShopBranchId,
  isAdminRole,
  isShopRole,
  requireSession,
} from "@/lib/rbac";

export default async function SalesPage() {
  const session = await requireSession();
  const shopOnly = isShopRole(session.user.role.name);
  const lockedBranchId = getShopBranchId(session);

  const [allBranches, variants, stocks, sales] = await Promise.all([
    prisma.branch.findMany({
      where: { isActive: true, ...(shopOnly ? { isShop: true } : {}) },
      orderBy: { name: "asc" },
    }),
    prisma.productVariant.findMany({
      where: { isActive: true },
      include: { product: true },
      orderBy: { sku: "asc" },
    }),
    prisma.finishedGoodsStock.findMany(
      shopOnly && lockedBranchId
        ? { where: { branchId: lockedBranchId } }
        : undefined,
    ),
    prisma.sale.findMany({
      where: shopOnly && lockedBranchId ? { branchId: lockedBranchId } : undefined,
      include: { branch: true, items: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const branches =
    shopOnly && lockedBranchId
      ? allBranches.filter((b) => b.id === lockedBranchId)
      : allBranches.filter((b) => b.isShop || isAdminRole(session.user.role.name));

  const stockMap: Record<string, Record<string, number>> = {};
  for (const s of stocks) {
    stockMap[s.variantId] ??= {};
    stockMap[s.variantId][s.branchId] = s.quantity;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySales = sales.filter((s) => s.createdAt >= today && !s.isReturn);
  const todayTotal = todaySales.reduce((sum, s) => sum + toNumber(s.total), 0);

  const shop =
    branches.find((b) => b.id === lockedBranchId) ??
    branches.find((b) => b.code === "SHOP1") ??
    branches[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Direct sale</h1>
          <p className="mt-1 text-sm text-muted">
            {shopOnly
              ? "Register a sale from your shop — product, quantity, and payment."
              : "Pick shop + product — price filled from pricing."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/shops/sales">Bulk sales</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/shops/stock">Stock</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="text-xs text-muted">Today&apos;s sales</p>
          <p className="mt-1 text-xl font-semibold">{formatEtb(todayTotal)}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Transactions today</p>
          <p className="mt-1 text-xl font-semibold">{todaySales.length}</p>
        </Card>
      </div>

      <Card>
        <PosSaleForm
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
          defaultBranchId={shop?.id}
          variants={variants.map((v) => ({
            id: v.id,
            label: `${v.product.name} · ${v.size}/${v.color}`,
            sellingPrice: toNumber(v.sellingPrice),
            stockByBranch: stockMap[v.id] ?? {},
          }))}
        />
      </Card>

      <Card className="overflow-x-auto p-0">
        <div className="border-b border-border px-3 py-2 text-sm font-semibold">
          Recent receipts
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Receipt</th>
              <th className="px-3 py-2">Shop</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">When</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id} className="border-t border-border/60">
                <td className="px-3 py-2">
                  <Link
                    href={`/sales/${s.id}`}
                    className="text-secondary hover:underline"
                  >
                    {s.receiptNumber}
                    {s.isReturn ? " (return)" : ""}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted">{s.branch.name}</td>
                <td className="px-3 py-2">{formatEtb(toNumber(s.total))}</td>
                <td className="px-3 py-2 text-muted">
                  {s.createdAt.toLocaleString("en-ET")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
