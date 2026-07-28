import Link from "next/link";

import { PayrollRunForm } from "@/components/payroll/payroll-run-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatEtb, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function PayrollListPage() {
  const runs = await prisma.payrollRun.findMany({
    include: { _count: { select: { lines: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Payroll</h1>
          <p className="mt-1 text-sm text-muted">
            Simple monthly payroll: base salary + piece-rate pay from logged
            output.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/production/employees">Employee pay rates</Link>
        </Button>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Generate new payroll</h2>
        <PayrollRunForm />
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-page/40 text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-3">Title</th>
              <th className="px-3 py-3">Period</th>
              <th className="px-3 py-3">Employees</th>
              <th className="px-3 py-3">Total net</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-muted">
                  No payroll runs yet. Generate one above.
                </td>
              </tr>
            ) : (
              runs.map((run) => (
                <tr key={run.id} className="border-t border-border/60">
                  <td className="px-3 py-3">
                    <Link
                      href={`/payroll/${run.id}`}
                      className="text-secondary hover:underline"
                    >
                      {run.title}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {run.periodStart.toLocaleDateString("en-ET")} –{" "}
                    {run.periodEnd.toLocaleDateString("en-ET")}
                  </td>
                  <td className="px-3 py-3">{run._count.lines}</td>
                  <td className="px-3 py-3">{formatEtb(toNumber(run.totalNet))}</td>
                  <td className="px-3 py-3">
                    <Badge variant={run.status === "PAID" ? "success" : "warning"}>
                      {run.status}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
