import Link from "next/link";

import { ImportSalesForm } from "@/components/shops/import-sales-form";
import { RestockForms } from "@/components/shops/restock-forms";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import {
  getShopBranchId,
  isAdminRole,
  isShopRole,
  requireSession,
} from "@/lib/rbac";

/**
 * Best-practice bulk import hub: restocks OR external sales, same entry point.
 */
export default async function BulkImportPage({
  searchParams,
}: {
  searchParams?: { type?: string };
}) {
  const session = await requireSession();
  const shopOnly = isShopRole(session.user.role.name);
  const lockedBranchId = getShopBranchId(session);

  if (!shopOnly && !isAdminRole(session.user.role.name)) {
    return <p className="text-sm text-danger">Not allowed.</p>;
  }

  const type = searchParams?.type === "sales" ? "sales" : "restock";

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Bulk import</h1>
        <p className="mt-1 text-sm text-muted">
          Import many lines at once. Use the same product <strong>code</strong>{" "}
          as the catalog.{" "}
          {shopOnly
            ? "Files apply only to your shop."
            : "Choose the shop before importing."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/shops/import?type=restock"
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            type === "restock"
              ? "bg-primary text-on-primary"
              : "border border-border text-secondary"
          }`}
        >
          Bulk restock
        </Link>
        <Link
          href="/shops/import?type=sales"
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            type === "sales"
              ? "bg-primary text-on-primary"
              : "border border-border text-secondary"
          }`}
        >
          Bulk sales
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          {type === "restock" ? (
            <>
              <h2 className="mb-1 text-sm font-semibold">Add stock in bulk</h2>
              <p className="mb-4 text-xs text-muted">
                Columns: code, quantity — CSV or Excel. Increases shop stock.
              </p>
              <RestockForms
                branches={branches}
                variants={options}
                lockedBranchId={shopOnly ? lockedBranchId : null}
                defaultBranchId={branches[0]?.id}
                shopMode={shopOnly}
              />
            </>
          ) : (
            <>
              <h2 className="mb-1 text-sm font-semibold">
                Import external POS sales
              </h2>
              <p className="mb-4 text-xs text-muted">
                Columns: code, quantity [, unit_price] [, date] [, receipt] [,
                payment]. Deducts stock and records revenue.
              </p>
              <ImportSalesForm
                branches={branches}
                lockedBranchId={shopOnly ? lockedBranchId : null}
                defaultBranchId={branches[0]?.id}
              />
            </>
          )}
        </Card>

        <Card className="lg:col-span-2 space-y-3 text-sm">
          <h2 className="text-sm font-semibold">Best practice</h2>
          <ol className="list-decimal space-y-2 pl-4 text-muted">
            <li>Register products at HQ with stable codes first.</li>
            <li>
              Restock before selling so stock never goes negative on import.
            </li>
            <li>
              One file per shop per day from your external POS keeps history
              clean.
            </li>
            <li>
              Use headers:{" "}
              <code className="text-secondary">code,quantity</code> for restock;{" "}
              <code className="text-secondary">code,quantity,unit_price</code>{" "}
              for sales.
            </li>
            <li>Review unknown codes (skipped lines) after each import.</li>
          </ol>
          <p className="text-xs text-muted">
            Prefer{" "}
            <Link href="/shops/restock" className="text-secondary underline">
              Add stock manually
            </Link>{" "}
            for single product adjustments.
          </p>
        </Card>
      </div>
    </div>
  );
}
