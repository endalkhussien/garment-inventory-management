import Link from "next/link";

import { EmployeeForm } from "@/components/production/employee-form";
import { Card } from "@/components/ui/card";
import { formatEtb, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function EmployeesPage() {
  const [employees, branches, outputs] = await Promise.all([
    prisma.employee.findMany({
      where: { isActive: true },
      include: { branch: true },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.productionOutput.groupBy({
      by: ["employeeId"],
      _sum: { quantityGood: true, quantityRejected: true },
      where: { employeeId: { not: null } },
    }),
  ]);

  const stats = new Map(
    outputs.map((o) => [
      o.employeeId!,
      {
        good: o._sum.quantityGood ?? 0,
        rejected: o._sum.quantityRejected ?? 0,
      },
    ]),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Employees</h1>
          <p className="mt-1 text-sm text-muted">
            Register workers, set pay rates, and track output from production
            logs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/production/employees/performance"
            className="rounded-lg border border-border px-4 py-2 text-sm text-secondary hover:border-secondary/40"
          >
            Performance
          </Link>
          <Link
            href="/payroll"
            className="rounded-lg border border-border px-4 py-2 text-sm text-secondary hover:border-secondary/40"
          >
            Payroll
          </Link>
        </div>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Add employee</h2>
        <EmployeeForm
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        />
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-page/40 text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Base salary</th>
              <th className="px-3 py-3">Piece rate</th>
              <th className="px-3 py-3">Good units</th>
              <th className="px-3 py-3">Defect rate</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => {
              const s = stats.get(e.id) ?? { good: 0, rejected: 0 };
              const total = s.good + s.rejected;
              const defect =
                total === 0 ? 0 : Math.round((s.rejected / total) * 1000) / 10;
              return (
                <tr key={e.id} className="border-t border-border/60">
                  <td className="px-3 py-3">
                    <Link
                      href={`/production/employees/${e.id}`}
                      className="text-secondary hover:underline"
                    >
                      {e.name}
                    </Link>
                    {e.code && (
                      <span className="ml-1 text-xs text-muted">({e.code})</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {formatEtb(toNumber(e.monthlyBaseSalary))}
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {formatEtb(toNumber(e.pieceRatePerUnit))}/unit
                  </td>
                  <td className="px-3 py-3">{s.good}</td>
                  <td className="px-3 py-3 text-muted">{defect}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
