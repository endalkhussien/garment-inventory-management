import Link from "next/link";
import { notFound } from "next/navigation";

import { DeactivateEmployeeButton } from "@/components/production/deactivate-employee-button";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { EmployeeForm } from "@/components/production/employee-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { reactivateEmployee } from "@/lib/actions/production";
import { formatEtb, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type PageProps = { params: { id: string } };

export default async function EmployeeDetailPage({ params }: PageProps) {
  const [employee, branches] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        branch: true,
        outputs: {
          include: {
            productionOrder: {
              include: { variant: { include: { product: true } } },
            },
          },
          orderBy: { outputDate: "desc" },
          take: 50,
        },
      },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!employee) notFound();

  const allOutputs = await prisma.productionOutput.aggregate({
    where: { employeeId: employee.id },
    _sum: { quantityGood: true, quantityRejected: true },
  });

  const good = allOutputs._sum.quantityGood ?? 0;
  const rejected = allOutputs._sum.quantityRejected ?? 0;
  const total = good + rejected;
  const defect = total === 0 ? 0 : Math.round((rejected / total) * 1000) / 10;
  const estimatedPiecePay = toNumber(employee.pieceRatePerUnit) * good;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{employee.name}</h1>
          <p className="text-sm text-muted">
            {good} good · {rejected} rejected · defect {defect}%
            {!employee.isActive ? " · inactive" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/production/employees">Back</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/production/employees/performance">Performance</Link>
          </Button>
          {employee.isActive ? (
            <DeactivateEmployeeButton
              employeeId={employee.id}
              name={employee.name}
            />
          ) : (
            <ConfirmActionButton
              label="Reactivate"
              confirmMessage={`Reactivate ${employee.name}?`}
              action={reactivateEmployee.bind(null, employee.id)}
              size="default"
            />
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-muted">Monthly base salary</p>
          <p className="mt-1 text-lg font-semibold">
            {formatEtb(toNumber(employee.monthlyBaseSalary))}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Piece rate</p>
          <p className="mt-1 text-lg font-semibold">
            {formatEtb(toNumber(employee.pieceRatePerUnit))}/unit
          </p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Est. piece pay (all time)</p>
          <p className="mt-1 text-lg font-semibold">
            {formatEtb(estimatedPiecePay)}
          </p>
        </Card>
      </div>

      {employee.isActive && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold">
            Edit employee & pay rates
          </h2>
          <EmployeeForm
            branches={branches.map((b) => ({ id: b.id, name: b.name }))}
            employee={{
              id: employee.id,
              name: employee.name,
              code: employee.code,
              phone: employee.phone,
              branchId: employee.branchId,
              hireDate: employee.hireDate,
              monthlyBaseSalary: toNumber(employee.monthlyBaseSalary),
              pieceRatePerUnit: toNumber(employee.pieceRatePerUnit),
            }}
          />
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Recent output</h2>
        {employee.outputs.length === 0 ? (
          <p className="text-sm text-muted">No output linked yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {employee.outputs.map((o) => (
              <li key={o.id}>
                {o.outputDate.toLocaleDateString("en-ET")} ·{" "}
                {o.productionOrder.variant.product.name} · {o.quantityGood} good
                / {o.quantityRejected} rejected
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
