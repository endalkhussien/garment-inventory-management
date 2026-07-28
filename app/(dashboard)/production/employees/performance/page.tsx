import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getEmployeePerformance } from "@/lib/dashboard-metrics";
import { formatEtb } from "@/lib/format";

type PageProps = {
  searchParams: { period?: string };
};

export default async function EmployeePerformancePage({ searchParams }: PageProps) {
  const periodDays = Number(searchParams.period ?? "30");
  const safePeriod = [7, 30, 90].includes(periodDays) ? periodDays : 30;
  const { rows } = await getEmployeePerformance(safePeriod);

  const totalGood = rows.reduce((sum, r) => sum + r.good, 0);
  const avgDefect =
    rows.length === 0
      ? 0
      : Math.round(
          (rows.reduce((sum, r) => sum + r.defect, 0) / rows.length) * 10,
        ) / 10;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Employee performance</h1>
          <p className="mt-1 text-sm text-muted">
            Follow-up on output, defect rate, and estimated piece pay for the
            selected period.
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((days) => (
            <Link
              key={days}
              href={`/production/employees/performance?period=${days}`}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                safePeriod === days
                  ? "bg-primary text-on-primary shadow-sm"
                  : "border border-border text-muted hover:text-foreground"
              }`}
            >
              {days}d
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-muted">Total good units</p>
          <p className="mt-1 text-xl font-semibold">
            {totalGood.toLocaleString("en-ET")}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Average defect rate</p>
          <p className="mt-1 text-xl font-semibold">{avgDefect}%</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Active employees</p>
          <p className="mt-1 text-xl font-semibold">{rows.length}</p>
        </Card>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-page/40 text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-3">Employee</th>
              <th className="px-3 py-3">Branch</th>
              <th className="px-3 py-3">Good units</th>
              <th className="px-3 py-3">Rejected</th>
              <th className="px-3 py-3">Defect %</th>
              <th className="px-3 py-3">Entries</th>
              <th className="px-3 py-3">Est. piece pay</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-muted">
                  No employees yet.{" "}
                  <Link
                    href="/production/employees"
                    className="text-secondary hover:underline"
                  >
                    Add employees
                  </Link>{" "}
                  and log output with their names.
                </td>
              </tr>
            ) : (
              rows.map((r, index) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {index < 3 && r.good > 0 && (
                        <Badge variant="success">Top {index + 1}</Badge>
                      )}
                      <Link
                        href={`/production/employees/${r.id}`}
                        className="text-secondary hover:underline"
                      >
                        {r.name}
                      </Link>
                      {r.code && (
                        <span className="text-xs text-muted">({r.code})</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted">{r.branch}</td>
                  <td className="px-3 py-3 font-medium">{r.good}</td>
                  <td className="px-3 py-3 text-muted">{r.rejected}</td>
                  <td className="px-3 py-3">
                    <Badge
                      variant={
                        r.defect <= 3
                          ? "success"
                          : r.defect <= 8
                            ? "warning"
                            : "danger"
                      }
                    >
                      {r.defect}%
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-muted">{r.entries}</td>
                  <td className="px-3 py-3">{formatEtb(r.estimatedPiecePay)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
