import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ReturnButton } from "@/components/sales/return-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatEtb, toNumber } from "@/lib/format";
import { paymentMethodLabels } from "@/lib/validations/sales";
import { prisma } from "@/lib/prisma";
import {
  getShopBranchId,
  isShopRole,
  requireSession,
} from "@/lib/rbac";

type PageProps = { params: { id: string } };

export default async function SaleDetailPage({ params }: PageProps) {
  const session = await requireSession();
  const sale = await prisma.sale.findUnique({
    where: { id: params.id },
    include: {
      branch: true,
      customer: true,
      items: { include: { variant: { include: { product: true } } } },
      payments: true,
      returns: true,
    },
  });

  if (!sale) notFound();

  if (isShopRole(session.user.role.name)) {
    const shopBranchId = getShopBranchId(session);
    if (shopBranchId !== sale.branchId) {
      redirect("/sales");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{sale.receiptNumber}</h1>
          <p className="text-sm text-muted">
            {sale.branch.name} ·{" "}
            {sale.customer?.name ?? "Walk-in"} ·{" "}
            {sale.createdAt.toLocaleString("en-ET")}
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/sales">Back to POS</Link>
        </Button>
      </div>

      <Card className="space-y-3">
        {sale.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>
              {item.variant.product.name} ({item.variant.size}/
              {item.variant.color}) × {item.quantity}
            </span>
            <span>{formatEtb(toNumber(item.lineTotal))}</span>
          </div>
        ))}
        <div className="border-t border-border pt-3 flex justify-between font-semibold">
          <span>Total</span>
          <span className="text-primary">{formatEtb(toNumber(sale.total))}</span>
        </div>
        <p className="text-sm text-muted">
          Paid via{" "}
          {sale.payments
            .map((p) => paymentMethodLabels[p.method])
            .join(", ")}
        </p>
        {sale.returnReason && (
          <p className="text-sm text-warning">Return reason: {sale.returnReason}</p>
        )}
        {!sale.isReturn && sale.returns.length === 0 && (
          <ReturnButton saleId={sale.id} />
        )}
      </Card>
    </div>
  );
}
