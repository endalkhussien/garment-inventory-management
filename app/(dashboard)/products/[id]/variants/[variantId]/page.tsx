import Link from "next/link";
import { notFound } from "next/navigation";

import { VariantForm } from "@/components/products/variant-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatEtb, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { isShopRole, requireAdminOrShop } from "@/lib/rbac";

type PageProps = {
  params: { id: string; variantId: string };
};

export default async function VariantDetailPage({ params }: PageProps) {
  const session = await requireAdminOrShop();
  const shopMode = isShopRole(session.user.role.name);

  const variant = await prisma.productVariant.findUnique({
    where: { id: params.variantId },
    include: {
      product: true,
    },
  });

  if (!variant || variant.productId !== params.id) {
    notFound();
  }

  const buying =
    toNumber(variant.buyingPrice) || toNumber(variant.totalCostCached);
  const selling = toNumber(variant.sellingPrice);
  const margin = selling > 0 ? ((selling - buying) / selling) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {variant.product.name} · {variant.size}/{variant.color}
          </h1>
          <p className="mt-1 text-sm text-muted">SKU {variant.sku}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href={`/products/${variant.productId}`}>Back</Link>
          </Button>
          {!shopMode && (
            <Button asChild>
              <Link
                href={`/products/${variant.productId}/variants/${variant.id}/pricing`}
              >
                Pricing
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div
        className={`grid gap-3 ${shopMode ? "sm:grid-cols-1 max-w-xs" : "sm:grid-cols-3"}`}
      >
        {!shopMode && (
          <Card>
            <p className="text-xs text-muted">Buy</p>
            <p className="mt-1 font-semibold tabular-nums">{formatEtb(buying)}</p>
          </Card>
        )}
        <Card>
          <p className="text-xs text-muted">Sell</p>
          <p className="mt-1 font-semibold tabular-nums">{formatEtb(selling)}</p>
        </Card>
        {!shopMode && (
          <Card>
            <p className="text-xs text-muted">Margin</p>
            <p className="mt-1 font-semibold tabular-nums text-primary">
              {margin.toFixed(1)}%
            </p>
          </Card>
        )}
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Variant</h2>
        <VariantForm
          productId={variant.productId}
          mode="edit"
          variantId={variant.id}
          shopMode={shopMode}
          defaultValues={{
            size: variant.size,
            color: variant.color,
            sku: variant.sku,
            buyingPrice: toNumber(variant.buyingPrice),
            sellingPrice: toNumber(variant.sellingPrice),
          }}
        />
      </Card>
    </div>
  );
}
