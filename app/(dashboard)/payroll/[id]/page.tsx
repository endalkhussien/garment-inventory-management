import Link from "next/link";
import { notFound } from "next/navigation";

import { PayrollLineAdjustForm } from "@/components/payroll/payroll-line-adjust-form";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteDraftPayroll, markPayrollPaid } from "@/lib/actions/payroll";
import { formatEtb, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type PageProps = { params: { id: string } };

export default async function PayrollDetailPage({ params }: PageProps) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: params.id },
    include: {
      lines: {
        include: { employee: true },
        orderBy: { employee: { name: "asc" } },
      },
    },
  });

  if (!run) notFound();

  const isDraft = run.status === "DRAFT";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{run.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {run.periodStart.toLocaleDateString("en-ET")} –{" "}
            {run.periodEnd.toLocaleDateString("en-ET")} · Total{" "}
            {formatEtb(toNumber(run.totalNet))}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={run.status === "PAID" ? "success" : "warning"}>
            {run.status}
          </Badge>
          <Button asChild variant="secondary">
            <Link href="/payroll">Back</Link>
          </Button>
          {isDraft && (
            <>
              <form
                action={async () => {
                  "use server";
                  await markPayrollPaid(run.id);
                }}
              >
                <Button type="submit">Mark as paid</Button>
              </form>
              <ConfirmActionButton
                label="Delete draft"
                confirmMessage="Delete this draft payroll run? You can generate a new one."
                action={() => deleteDraftPayroll(run.id)}
                variant="danger"
                size="default"
                redirectTo="/payroll"
              />
            </>
          )}
        </div>
      </div>

      {run.note && (
        <Card>
          <p className="text-sm text-muted">{run.note}</p>
        </Card>
      )}

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-page/40 text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-3">Employee</th>
              <th className="px-3 py-3">Base</th>
              <th className="px-3 py-3">Good units</th>
              <th className="px-3 py-3">Piece pay</th>
              <th className="px-3 py-3">Bonus</th>
              <th className="px-3 py-3">Deductions</th>
              <th className="px-3 py-3">Net pay</th>
              {isDraft && <th className="px-3 py-3">Adjust</th>}
            </tr>
          </thead>
          <tbody>
            {run.lines.map((line) => (
              <tr key={line.id} className="border-t border-border/60">
                <td className="px-3 py-3">
                  <Link
                    href={`/production/employees/${line.employeeId}`}
                    className="text-secondary hover:underline"
                  >
                    {line.employee.name}
                  </Link>
                </td>
                <td className="px-3 py-3">{formatEtb(toNumber(line.baseSalary))}</td>
                <td className="px-3 py-3">{line.goodUnits}</td>
                <td className="px-3 py-3">{formatEtb(toNumber(line.piecePay))}</td>
                <td className="px-3 py-3">{formatEtb(toNumber(line.bonus))}</td>
                <td className="px-3 py-3">{formatEtb(toNumber(line.deductions))}</td>
                <td className="px-3 py-3 font-medium">
                  {formatEtb(toNumber(line.netPay))}
                </td>
                {isDraft && (
                  <td className="px-3 py-3">
                    <PayrollLineAdjustForm
                      lineId={line.id}
                      bonus={toNumber(line.bonus)}
                      deductions={toNumber(line.deductions)}
                      note={line.note}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
