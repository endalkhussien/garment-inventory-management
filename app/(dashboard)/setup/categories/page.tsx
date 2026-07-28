import Link from "next/link";

import { CategoryQuickForm } from "@/components/setup/category-quick-form";
import { EditableCategoryList } from "@/components/setup/editable-category-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function CategoriesSetupPage() {
  await requireAdmin();
  const [materials, products, assets] = await Promise.all([
    prisma.materialCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.productCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.assetType.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Categories & types</h1>
          <p className="mt-1 text-sm text-muted">
            Rename or hide mistakes — Admin can edit anytime.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/setup">Setup guide</Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-3">
          <CategoryQuickForm kind="material" title="Material categories" />
          <EditableCategoryList kind="material" items={materials} />
        </Card>
        <Card className="space-y-3">
          <CategoryQuickForm kind="product" title="Product categories" />
          <EditableCategoryList kind="product" items={products} />
        </Card>
        <Card className="space-y-3">
          <CategoryQuickForm kind="asset" title="Machine / asset types" />
          <EditableCategoryList kind="asset" items={assets} />
        </Card>
      </div>
    </div>
  );
}
