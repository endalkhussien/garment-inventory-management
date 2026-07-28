import Link from "next/link";

import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function SetupGuidePage() {
  await requireAdmin();

  const [
    branches,
    materialCategories,
    productCategories,
    materials,
    products,
    withBom,
    openOrders,
    users,
  ] = await Promise.all([
    prisma.branch.count(),
    prisma.materialCategory.count(),
    prisma.productCategory.count(),
    prisma.rawMaterial.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.productVariant.count({
      where: { bomLines: { some: {} }, isActive: true },
    }),
    prisma.productionOrder.count({
      where: { status: { in: ["DRAFT", "IN_PROGRESS"] } },
    }),
    prisma.user.count({ where: { isActive: true } }),
  ]);

  const steps = [
    {
      done: branches > 0,
      title: "1. Branches",
      href: "/setup/branches",
      detail: "Warehouse (factory) + shop locations",
    },
    {
      done: materialCategories > 0 && productCategories > 0,
      title: "2. Categories",
      href: "/setup/categories",
      detail: "e.g. Yarn, Thread · Knitwear",
    },
    {
      done: users >= 2,
      title: "3. Users & roles",
      href: "/users",
      detail: "Admin for factory · Shop users linked to a shop branch",
    },
    {
      done: materials > 0,
      title: "4. Raw materials",
      href: "/inventory/raw-materials",
      detail: "Register yarn/thread and opening quantity",
    },
    {
      done: products > 0 && withBom > 0,
      title: "5. Product + BOM",
      href: "/products",
      detail: "What you sew, and materials per piece",
    },
    {
      done: openOrders > 0 || withBom > 0,
      title: "6. Produce",
      href: "/production/orders",
      detail: "Order → Start → Log output → Complete",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Getting started</h1>
        <p className="mt-1 text-sm text-muted">
          Simple path for your factory: set up once, then stock → produce →
          transfer → sell.
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
                {step.done ? "Done" : "Do this"}
              </span>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="space-y-2 text-sm">
        <p className="font-medium">How stock moves</p>
        <ol className="list-decimal space-y-1 pl-4 text-muted">
          <li>Draft order — nothing changes yet</li>
          <li>
            <strong className="text-foreground">Start</strong> — raw materials
            leave stock
          </li>
          <li>Log output (pick employee for payroll)</li>
          <li>
            <strong className="text-foreground">Complete</strong> — finished
            goods in warehouse
          </li>
          <li>
            <Link href="/shops/transfers" className="text-secondary hover:underline">
              Transfer
            </Link>{" "}
            to shop →{" "}
            <Link href="/sales" className="text-secondary hover:underline">
              sell at POS
            </Link>
          </li>
        </ol>
      </Card>
    </div>
  );
}
