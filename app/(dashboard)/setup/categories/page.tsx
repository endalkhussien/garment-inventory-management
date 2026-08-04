import Link from "next/link";

import { EditableCategoryList } from "@/components/setup/editable-category-list";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const REQUIRED = ["Male", "Ladies", "Kids"] as const;

export default async function CategoriesSetupPage() {
  await requireAdmin();

  // Ensure garment categories exist
  for (const name of REQUIRED) {
    await prisma.productCategory.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  // Deactivate categories outside Male / Ladies / Kids (keep history)
  await prisma.productCategory.updateMany({
    where: { name: { notIn: [...REQUIRED] } },
    data: { isActive: false },
  });

  const products = await prisma.productCategory.findMany({
    where: { name: { in: [...REQUIRED] } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Product categories</h1>
        <p className="mt-1 text-sm text-muted">
          Garments are grouped as <strong>Male</strong>,{" "}
          <strong>Ladies</strong>, and <strong>Kids</strong> only.
        </p>
        <p className="mt-2 text-sm">
          <Link href="/products" className="text-secondary hover:underline">
            ← Products
          </Link>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {REQUIRED.map((name) => {
          const row = products.find((p) => p.name === name);
          return (
            <Card key={name}>
              <p className="text-xs uppercase tracking-wide text-muted">
                Category
              </p>
              <p className="mt-1 text-xl font-semibold">{name}</p>
              <p className="mt-1 text-xs text-muted">
                {row?.isActive ? "Active for product registration" : "Inactive"}
              </p>
            </Card>
          );
        })}
      </div>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold">Category list</h2>
        <p className="text-xs text-muted">
          These three are fixed for garment control. Contact admin to rename if
          needed via the list below.
        </p>
        <EditableCategoryList kind="product" items={products} />
      </Card>
    </div>
  );
}
