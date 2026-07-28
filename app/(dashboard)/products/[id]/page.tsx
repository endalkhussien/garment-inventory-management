import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { ProductForm } from "@/components/products/product-form";
import { VariantForm } from "@/components/products/variant-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { setProductActive, setVariantActive } from "@/lib/actions/products";
import { formatEtb, toNumber } from "@/lib/format";
import { marginFromPrice } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: { id: string };
};

export default async function ProductDetailPage({ params }: PageProps) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      variants: {
        orderBy: [{ size: "asc" }, { color: "asc" }],
      },
    },
  });

  if (!product) {
    notFound();
  }

  const categories = await prisma.productCategory.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            {product.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {product.category?.name ?? "Uncategorized"}
            {product.description ? ` · ${product.description}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ConfirmActionButton
            label={product.isActive ? "Deactivate product" : "Reactivate"}
            confirmMessage={
              product.isActive
                ? `Deactivate ${product.name} and its variants?`
                : `Reactivate ${product.name}?`
            }
            action={() => setProductActive(product.id, !product.isActive)}
            variant={product.isActive ? "danger" : "default"}
            size="default"
          />
          <Button asChild variant="secondary">
            <Link href="/products">Back to products</Link>
          </Button>
        </div>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Product details</h2>
        <ProductForm
          mode="edit"
          productId={product.id}
          categories={categories}
          defaultValues={{
            name: product.name,
            categoryId: product.categoryId ?? "",
            description: product.description ?? "",
          }}
        />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Variants</h2>
        {product.variants.length === 0 ? (
          <p className="mb-4 text-sm text-muted">No variants yet.</p>
        ) : (
          <div className="mb-4 overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-page/40 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-3 font-medium">Variant</th>
                  <th className="px-3 py-3 font-medium">SKU</th>
                  <th className="px-3 py-3 font-medium">Cost</th>
                  <th className="px-3 py-3 font-medium">Price</th>
                  <th className="px-3 py-3 font-medium">Margin</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((variant) => {
                  const cost = toNumber(variant.totalCostCached);
                  const price = toNumber(variant.sellingPrice);
                  const margin = marginFromPrice(cost, price);
                  return (
                    <tr
                      key={variant.id}
                      className="border-t border-border/60 hover:bg-page/30"
                    >
                      <td className="px-3 py-3">
                        <Link
                          href={`/products/${product.id}/variants/${variant.id}`}
                          className="font-medium text-secondary hover:underline"
                        >
                          {variant.size} / {variant.color}
                        </Link>
                        {!variant.isActive && (
                          <span className="ml-2 text-xs text-muted">(off)</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-muted">{variant.sku}</td>
                      <td className="px-3 py-3">{formatEtb(cost)}</td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/products/${product.id}/variants/${variant.id}/pricing`}
                          className="text-secondary hover:underline"
                        >
                          {formatEtb(price)}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-muted">
                        {margin.marginPercent.toFixed(1)}%
                      </td>
                      <td className="px-3 py-3">
                        {variant.costIsStale ? (
                          <Badge variant="warning">Stale</Badge>
                        ) : (
                          <Badge variant="success">OK</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <ConfirmActionButton
                          label={variant.isActive ? "Hide" : "Show"}
                          confirmMessage={
                            variant.isActive
                              ? `Hide variant ${variant.sku}?`
                              : `Show variant ${variant.sku} again?`
                          }
                          action={() =>
                            setVariantActive(variant.id, !variant.isActive)
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="mb-3 text-sm font-semibold">Add variant</h3>
        <VariantForm productId={product.id} mode="create" />
      </Card>
    </div>
  );
}
