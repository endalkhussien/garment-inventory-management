import Link from "next/link";

import { Card } from "@/components/ui/card";

const reports = [
  {
    href: "/reports/production",
    title: "Production",
    description: "Orders, output, and completion in the period",
  },
  {
    href: "/reports/inventory",
    title: "Inventory",
    description: "Raw materials, values, and low stock",
  },
  {
    href: "/reports/sales",
    title: "Sales",
    description: "Receipts, revenue, and top products",
  },
  {
    href: "/reports/pricing",
    title: "Cost & Pricing",
    description: "Variant costs, prices, and margins",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="mt-1 text-sm text-muted">
          Simple summaries with CSV export — no complex report builder.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {reports.map((r) => (
          <Link key={r.href} href={r.href}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <h2 className="font-semibold text-secondary">{r.title}</h2>
              <p className="mt-1 text-sm text-muted">{r.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
