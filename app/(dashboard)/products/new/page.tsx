import { ProductForm } from "@/components/products/product-form";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function NewProductPage() {
  await requireAdmin();
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
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Register product
        </h1>
        <p className="mt-1 text-sm text-muted">
          Name · code · buying price · selling price — for shop inventory and
          finance.
        </p>
      </div>
      <Card>
        <ProductForm mode="create" categories={categories} />
      </Card>
    </div>
  );
}
