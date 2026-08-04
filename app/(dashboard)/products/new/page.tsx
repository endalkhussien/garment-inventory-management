import { ProductForm } from "@/components/products/product-form";
import { Card } from "@/components/ui/card";
import { requireAdminOrShop } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function NewProductPage() {
  await requireAdminOrShop();
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
      <h1 className="page-title">New product</h1>
      <Card>
        <ProductForm mode="create" categories={categories} />
      </Card>
    </div>
  );
}
