import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { StocktakeCountForm } from "@/components/inventory/stocktake-count-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cancelStocktake } from "@/lib/actions/stocktake";
import { toNumber } from "@/lib/format";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type PageProps = { params: { id: string } };

export default async function StocktakeDetailPage({ params }: PageProps) {
  await requireAdmin();

  const session = await prisma.stocktakeSession.findUnique({
    where: { id: params.id },
    include: {
      lines: {
        include: {
          rawMaterial: { select: { name: true, unitOfMeasure: true } },
        },
        orderBy: { rawMaterial: { name: "asc" } },
      },
    },
  });

  if (!session) notFound();

  const editable =
    session.status === "DRAFT" || session.status === "COUNTED";
  const canCancel =
    session.status !== "COMPLETED" && session.status !== "CANCELLED";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{session.title}</h1>
          <p className="mt-1 text-sm text-muted">
            Status: {session.status}
            {session.note ? ` · ${session.note}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/inventory/stocktake">All stocktakes</Link>
          </Button>
          {canCancel && (
            <ConfirmActionButton
              label="Cancel"
              confirmMessage="Cancel this stocktake?"
              action={cancelStocktake.bind(null, session.id)}
            />
          )}
        </div>
      </div>

      <Card>
        <StocktakeCountForm
          sessionId={session.id}
          readOnly={!editable}
          lines={session.lines.map((l) => ({
            id: l.id,
            materialName: l.rawMaterial.name,
            unit: l.rawMaterial.unitOfMeasure,
            systemQty: toNumber(l.systemQty),
            countedQty:
              l.countedQty === null ? null : toNumber(l.countedQty),
            note: l.note,
          }))}
        />
      </Card>
    </div>
  );
}
