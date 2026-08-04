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
import { isShopRole, requireAdminOrShop } from "@/lib/rbac";

type PageProps = {
  params: { id: string };
};

export default async function ProductDetailPage({ params }: PageProps) {
  const session = await requireAdminOrShop();
  const shopMode = isShopRole(session.user.role.name);

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
    where: {
      isActive: true,
      name: { in: ["Male", "Ladies", "Kids"] },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">{product.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {product.code ?? ""}
            {product.category?.name ? ` · ${product.category.name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ConfirmActionButton
            label={product.isActive ? "Deactivate" : "Reactivate"}
            confirmMessage={
              product.isActive
                ? `Deactivate ${product.name}?`
                : `Reactivate ${product.name}?`
            }
            action={setProductActive.bind(
              null,
              product.id,
              !product.isActive,
            )}
            variant={product.isActive ? "danger" : "default"}
            size="default"
          />
          <Button asChild variant="secondary">
            <Link href="/products">Back</Link>
          </Button>
        </div>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Details</h2>
        <ProductForm
          mode="edit"
          productId={product.id}
          categories={categories}
          defaultValues={{
            name: product.name,
            code: product.code ?? "",
            categoryId: product.categoryId ?? "",
            description: product.description ?? "",
            garmentInfo: product.garmentInfo ?? "",
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
              <thead className="bg-[var(--bg-elevated)] text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-3 font-medium">Variant</th>
                  <th className="px-3 py-3 font-medium">SKU</th>
                  {!shopMode && (
                    <th className="px-3 py-3 font-medium">Buy</th>
                  )}
                  <th className="px-3 py-3 font-medium">Sell</th>
                  {!shopMode && (
                    <th className="px-3 py-3 font-medium">Margin</th>
                  )}
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((variant) => {
                  const cost =
                    toNumber(variant.buyingPrice) ||
                    toNumber(variant.totalCostCached);
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
                      </td>
                      <td className="px-3 py-3 text-muted">{variant.sku}</td>
                      {!shopMode && (
                        <td className="px-3 py-3 tabular-nums">
                          {formatEtb(cost)}
                        </td>
                      )}
                      <td className="px-3 py-3 tabular-nums">
                        {shopMode ? (
                          formatEtb(price)
                        ) : (
                          <Link
                            href={`/products/${product.id}/variants/${variant.id}/pricing`}
                            className="text-secondary hover:underline"
                          >
                            {formatEtb(price)}
                          </Link>
                        )}
                      </td>
                      {!shopMode && (
                        <td className="px-3 py-3 text-muted">
                          {margin.marginPercent.toFixed(1)}%
                        </td>
                      )}
                      <td className="px-3 py-3">
                        {variant.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="danger">Off</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <ConfirmActionButton
                          label={variant.isActive ? "Hide" : "Show"}
                          confirmMessage={
                            variant.isActive
                              ? `Hide ${variant.sku}?`
                              : `Show ${variant.sku}?`
                          }
                          action={setVariantActive.bind(
                            null,
                            variant.id,
                            !variant.isActive,
                          )}
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
        <VariantForm
          productId={product.id}
          mode="create"
          shopMode={shopMode}
        />
      </Card>
    </div>
  );
}
