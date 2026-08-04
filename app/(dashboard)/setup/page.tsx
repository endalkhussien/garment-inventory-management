import Link from "next/link";

import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function SetupGuidePage() {
  await requireAdmin();

  const [productCategories, products, users, shopCount] = await Promise.all([
    prisma.productCategory.count({
      where: {
        name: { in: ["Male", "Ladies", "Kids"] },
        isActive: true,
      },
    }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.branch.count({ where: { isShop: true, isActive: true } }),
  ]);

  const steps = [
    {
      done: productCategories >= 3,
      title: "1. Categories",
      href: "/setup/categories",
      detail: "Male · Ladies · Kids (auto-created on this page)",
    },
    {
      done: products > 0,
      title: "2. Register products",
      href: "/products",
      detail: "Code, buying price, selling price",
    },
    {
      done: shopCount > 0,
      title: "3. Open shops",
      href: "/setup/shops",
      detail: "Create shops + shop logins",
    },
    {
      done: users >= 1,
      title: "4. Users",
      href: "/users",
      detail: "Admin for control · Shop users locked to their shop",
    },
    {
      done: true,
      title: "5. Restock shops",
      href: "/shops/restock",
      detail: "Manual or import product quantities",
    },
    {
      done: true,
      title: "6. Import external POS sales",
      href: "/shops/sales",
      detail: "Sales file → stock out · finance in",
    },
    {
      done: true,
      title: "7. Central inventory",
      href: "/central",
      detail: "Alerts, movements, product insights, finance",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Getting started</h1>
        <p className="mt-1 text-sm text-muted">
          Control multi-shop inventory: products → shops → restock → import
          sales → oversee from central.
        </p>
      </div>

      <div className="space-y-2">
        {steps.map((step) => (
          <Link key={step.title} href={step.href}>
            <Card className="mb-2 flex items-start justify-between gap-3 transition-colors hover:border-primary/40">
              <div>
                <p className="font-medium">{step.title}</p>
                <p className="text-sm text-muted">{step.detail}</p>
              </div>
              <span
                className={`shrink-0 rounded-lg px-2 py-1 text-xs ${
                  step.done
                    ? "bg-success/15 text-success"
                    : "bg-warning/15 text-warning"
                }`}
              >
                {step.done ? "Ready" : "Do this"}
              </span>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="space-y-2 text-sm">
        <p className="font-medium">Daily control loop</p>
        <ol className="list-decimal space-y-1 pl-4 text-muted">
          <li>Watch stock alerts on Control home / Central inventory</li>
          <li>Restock low products into shops</li>
          <li>Shops (or HQ) import sales from external POS files</li>
          <li>Review finance (sales − COGS − expenses) and product performance</li>
        </ol>
      </Card>
    </div>
  );
}
