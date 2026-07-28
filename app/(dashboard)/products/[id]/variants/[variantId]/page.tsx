import Link from "next/link";
import { notFound } from "next/navigation";

import { BomEditor } from "@/components/products/bom-editor";
import { VariantForm } from "@/components/products/variant-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatEtb, toNumber } from "@/lib/format";
import { calculateCostBreakdown } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: { id: string; variantId: string };
};

export default async function VariantDetailPage({ params }: PageProps) {
  const [variant, materials] = await Promise.all([
    prisma.productVariant.findUnique({
      where: { id: params.variantId },
      include: {
        product: true,
        bomLines: {
          include: { rawMaterial: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.rawMaterial.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        unitOfMeasure: true,
        costPerUnit: true,
      },
    }),
  ]);

  if (!variant || variant.productId !== params.id) {
    notFound();
  }

  const breakdown = calculateCostBreakdown({
    materialCost: toNumber(variant.materialCostCached),
    laborCost: toNumber(variant.laborCostPerUnit),
    overheadPercent: toNumber(variant.overheadPercent),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              {variant.product.name} · {variant.size}/{variant.color}
            </h1>
            {variant.costIsStale && <Badge variant="warning">Cost stale</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted">
            SKU {variant.sku} · Total cost {formatEtb(breakdown.totalCost)}
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

      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <p className="text-xs text-muted">Material</p>
          <p className="mt-1 font-semibold">
            {formatEtb(breakdown.materialCost)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Labor</p>
          <p className="mt-1 font-semibold">{formatEtb(breakdown.laborCost)}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Overhead</p>
          <p className="mt-1 font-semibold">
            {formatEtb(breakdown.overheadAmount)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Total / unit</p>
          <p className="mt-1 font-semibold text-primary">
            {formatEtb(breakdown.totalCost)}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Bill of materials</h2>
        <BomEditor
          variantId={variant.id}
          materials={materials.map((m) => ({
            id: m.id,
            name: m.name,
            unitOfMeasure: m.unitOfMeasure,
            costPerUnit: toNumber(m.costPerUnit),
          }))}
          lines={variant.bomLines.map((line) => ({
            id: line.id,
            quantityPerUnit: toNumber(line.quantityPerUnit),
            rawMaterial: {
              id: line.rawMaterial.id,
              name: line.rawMaterial.name,
              unitOfMeasure: line.rawMaterial.unitOfMeasure,
              costPerUnit: toNumber(line.rawMaterial.costPerUnit),
            },
          }))}
        />
      </Card>

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
            laborCostPerUnit: toNumber(variant.laborCostPerUnit),
            overheadPercent: toNumber(variant.overheadPercent),
          }}
        />
      </Card>
    </div>
  );
}
