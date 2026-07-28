import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { OrderActions } from "@/components/production/order-actions";
import { OutputEntryForm } from "@/components/production/output-entry-form";
import { ProductionOrderForm } from "@/components/production/production-order-form";
import { WastageForm } from "@/components/production/wastage-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteOutputEntry } from "@/lib/actions/production";
import { prisma } from "@/lib/prisma";

type PageProps = { params: { id: string } };

export default async function ProductionOrderDetailPage({ params }: PageProps) {
  const [order, employees, variants, branches] = await Promise.all([
    prisma.productionOrder.findUnique({
      where: { id: params.id },
      include: {
        variant: {
          include: {
            product: true,
            bomLines: { include: { rawMaterial: true } },
          },
        },
        supervisor: true,
        warehouseBranch: true,
        outputs: {
          include: { employee: true },
          orderBy: { outputDate: "desc" },
        },
        wastage: { include: { rawMaterial: true } },
      },
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.productVariant.findMany({
      where: { isActive: true },
      include: { product: true },
      orderBy: { sku: "asc" },
    }),
    prisma.branch.findMany({
      where: { isActive: true, isWarehouse: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!order) notFound();

  const canEdit =
    order.status === "DRAFT" || order.status === "IN_PROGRESS";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{order.orderNumber}</h1>
            <Badge>{order.status.replace("_", " ")}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {order.variant.product.name} · {order.variant.size}/
            {order.variant.color} · target {order.quantityTarget} · stock to{" "}
            {order.warehouseBranch.name}
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/production/orders">Back</Link>
        </Button>
      </div>

      <Card className="space-y-3">
        <p className="text-sm">
          Progress:{" "}
          <strong>
            {order.quantityGood}/{order.quantityTarget}
          </strong>{" "}
          good
          {order.quantityRejected > 0
            ? ` · ${order.quantityRejected} rejected`
            : ""}
        </p>
        <OrderActions orderId={order.id} status={order.status} />
      </Card>

      {order.status === "DRAFT" && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Edit draft (fix mistakes)</h2>
          <ProductionOrderForm
            orderId={order.id}
            variants={variants.map((v) => ({
              id: v.id,
              label: `${v.product.name} · ${v.size}/${v.color} (${v.sku})`,
            }))}
            employees={employees.map((e) => ({ id: e.id, label: e.name }))}
            branches={branches.map((b) => ({ id: b.id, label: b.name }))}
            defaults={{
              variantId: order.variantId,
              quantityTarget: order.quantityTarget,
              targetDate: order.targetDate
                ? order.targetDate.toISOString().slice(0, 10)
                : "",
              supervisorId: order.supervisorId ?? "__none__",
              warehouseBranchId: order.warehouseBranchId,
              note: order.note ?? "",
            }}
          />
        </Card>
      )}

      {order.status === "IN_PROGRESS" && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Log output</h2>
          <p className="mb-3 text-xs text-muted">
            Pick an employee so payroll can count their piece pay. Wrong entry?
            Delete it below.
          </p>
          <OutputEntryForm
            defaultOrderId={order.id}
            orders={[
              {
                id: order.id,
                label: `${order.orderNumber} · ${order.variant.product.name}`,
              },
            ]}
            employees={employees.map((e) => ({ id: e.id, label: e.name }))}
          />
        </Card>
      )}

      {canEdit && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Material wastage</h2>
          <WastageForm
            productionOrderId={order.id}
            materials={order.variant.bomLines.map((line) => ({
              id: line.rawMaterialId,
              label: `${line.rawMaterial.name} (${line.rawMaterial.unitOfMeasure})`,
            }))}
          />
          {order.wastage.length > 0 && (
            <ul className="mt-4 space-y-1 border-t border-border/50 pt-3 text-sm text-muted">
              {order.wastage.map((w) => (
                <li key={w.id}>
                  {w.rawMaterial.name}: {Number(w.quantity)}{" "}
                  {w.rawMaterial.unitOfMeasure}
                  {w.note ? ` — ${w.note}` : ""}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-sm font-semibold">
          Materials needed (BOM × target)
        </h2>
        <ul className="space-y-1 text-sm text-muted">
          {order.variant.bomLines.map((line) => (
            <li key={line.id}>
              {line.rawMaterial.name}:{" "}
              {(Number(line.quantityPerUnit) * order.quantityTarget).toFixed(3)}{" "}
              {line.rawMaterial.unitOfMeasure}
            </li>
          ))}
          {order.variant.bomLines.length === 0 && (
            <li>No BOM on this variant yet.</li>
          )}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Output log</h2>
        {order.outputs.length === 0 ? (
          <p className="text-sm text-muted">No output yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {order.outputs.map((out) => (
              <li
                key={out.id}
                className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2"
              >
                <span>
                  {out.outputDate.toLocaleDateString("en-ET")} ·{" "}
                  {out.quantityGood} good / {out.quantityRejected} rejected
                  {out.employee
                    ? ` · ${out.employee.name}`
                    : " · (no employee)"}
                </span>
                {order.status === "IN_PROGRESS" && (
                  <ConfirmActionButton
                    label="Delete"
                    confirmMessage="Delete this output entry and subtract it from the order totals?"
                    action={() => deleteOutputEntry(out.id)}
                    variant="danger"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
