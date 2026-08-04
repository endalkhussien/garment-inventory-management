import Link from "next/link";
import { notFound } from "next/navigation";

import { VariantForm } from "@/components/products/variant-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatEtb, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: { id: string; variantId: string };
};

export default async function VariantDetailPage({ params }: PageProps) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: params.variantId },
    include: {
      product: true,
    },
  });

  if (!variant || variant.productId !== params.id) {
    notFound();
  }

  const buying = toNumber(variant.buyingPrice) || toNumber(variant.totalCostCached);
  const selling = toNumber(variant.sellingPrice);
  const margin = selling > 0 ? ((selling - buying) / selling) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              {variant.product.name} · {variant.size}/{variant.color}
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            SKU {variant.sku}
            {variant.product.code ? ` · Code ${variant.product.code}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href={`/products/${variant.productId}`}>Back</Link>
          </Button>
          <Button asChild>
            <Link
              href={`/products/${variant.productId}/variants/${variant.id}/pricing`}
            >
              Pricing
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-muted">Buying price</p>
          <p className="mt-1 font-semibold">{formatEtb(buying)}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Selling price</p>
          <p className="mt-1 font-semibold">{formatEtb(selling)}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Margin</p>
          <p className="mt-1 font-semibold text-primary">
            {margin.toFixed(1)}%
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Variant settings</h2>
        <VariantForm
          productId={variant.productId}
          mode="edit"
          variantId={variant.id}
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
