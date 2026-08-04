import Link from "next/link";
import { notFound } from "next/navigation";

import { PricingForm } from "@/components/products/pricing-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatEtb, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { getAppSettings } from "@/lib/settings";

type PageProps = {
  params: { id: string; variantId: string };
};

export default async function VariantPricingPage({ params }: PageProps) {
  await requireAdmin();
  const [variant, settings] = await Promise.all([
    prisma.productVariant.findUnique({
      where: { id: params.variantId },
      include: {
        product: true,
        priceHistory: {
          include: {
            changedBy: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    }),
    getAppSettings(),
  ]);

  if (!variant || variant.productId !== params.id) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Pricing · {variant.product.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {variant.size}/{variant.color} · {variant.sku}
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link
            href={`/products/${variant.productId}/variants/${variant.id}`}
          >
            Back to BOM
          </Link>
        </Button>
      </div>

      <Card>
        <PricingForm
          variantId={variant.id}
          materialCost={toNumber(variant.materialCostCached)}
          laborCost={toNumber(variant.laborCostPerUnit)}
          overheadPercent={toNumber(variant.overheadPercent)}
          sellingPrice={toNumber(variant.sellingPrice)}
          costIsStale={variant.costIsStale}
          defaultMarginPercent={settings.defaultMarginPercent}
        />
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Price history
        </h2>
        {variant.priceHistory.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
            No price changes recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Old price</th>
                  <th className="px-3 py-3 font-medium">New price</th>
                  <th className="px-3 py-3 font-medium">Changed by</th>
                </tr>
              </thead>
              <tbody>
                {variant.priceHistory.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-border/60 hover:bg-surface/60"
                  >
                    <td className="px-3 py-3 text-muted">
                      {row.createdAt.toLocaleString("en-ET")}
                    </td>
                    <td className="px-3 py-3">
                      {formatEtb(toNumber(row.oldPrice))}
                    </td>
                    <td className="px-3 py-3">
                      {formatEtb(toNumber(row.newPrice))}
                    </td>
                    <td className="px-3 py-3 text-muted">
                      {row.changedBy?.name ??
                        row.changedBy?.email ??
                        "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
