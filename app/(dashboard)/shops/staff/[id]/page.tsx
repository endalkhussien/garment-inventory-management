import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { ShopStaffForm } from "@/components/shops/shop-staff-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { setShopStaffActive } from "@/lib/actions/shop-staff";
import {
  computeShopCommission,
  formatCommissionRate,
} from "@/lib/commission";
import { formatEtb, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  getShopBranchId,
  isAdminRole,
  isShopRole,
  requireSession,
} from "@/lib/rbac";

type PageProps = {
  params: { id: string };
  searchParams?: { branchId?: string };
};

export default async function ShopStaffDetailPage({
  params,
  searchParams,
}: PageProps) {
  const session = await requireSession();
  const shopOnly = isShopRole(session.user.role.name);
  const locked = getShopBranchId(session);

  if (!shopOnly && !isAdminRole(session.user.role.name)) {
    return <p className="text-sm text-danger">Not allowed.</p>;
  }

  const staff = await prisma.employee.findUnique({
    where: { id: params.id },
    include: { branch: { select: { id: true, name: true, isShop: true } } },
  });

  if (!staff?.branchId || !staff.branch?.isShop) {
    notFound();
  }

  if (shopOnly && locked !== staff.branchId) {
    return <p className="text-sm text-danger">Not allowed for this shop.</p>;
  }

  const backHref =
    !shopOnly && (searchParams?.branchId || staff.branchId)
      ? `/shops/staff?branchId=${searchParams?.branchId ?? staff.branchId}`
      : "/shops/staff";

  // Month-to-date branch sales for commission estimate (branch-level; not per cashier)
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthSales = await prisma.sale.findMany({
    where: {
      branchId: staff.branchId,
      isReturn: false,
      createdAt: { gte: monthStart },
    },
    select: {
      total: true,
      items: { select: { quantity: true } },
    },
  });

  const shopSales = monthSales.reduce(
    (acc, s) => {
      acc.revenue += toNumber(s.total);
      acc.unitsSold += s.items.reduce((n, i) => n + i.quantity, 0);
      return acc;
    },
    { unitsSold: 0, revenue: 0 },
  );
  const periodCommission = computeShopCommission(staff, shopSales);

  const salary = toNumber(staff.monthlyBaseSalary);
  const commissionLabel = formatCommissionRate(staff);
  const hireLabel = staff.hireDate
    ? staff.hireDate.toLocaleDateString("en-ET", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="page-header">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="label-caps">Staff</p>
            <Badge variant={staff.isActive ? "success" : "danger"}>
              {staff.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <h1 className="page-title">{staff.name}</h1>
          <p className="page-subtitle">
            {staff.branch.name}
            {staff.jobTitle ? ` · ${staff.jobTitle}` : ""}
            {staff.code ? ` · ${staff.code}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              Roster
            </Link>
          </Button>
          <ConfirmActionButton
            label={staff.isActive ? "Deactivate" : "Activate"}
            confirmMessage={
              staff.isActive
                ? `Deactivate ${staff.name}?`
                : `Activate ${staff.name}?`
            }
            action={setShopStaffActive.bind(null, staff.id, !staff.isActive)}
            variant={staff.isActive ? "danger" : "default"}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="label-caps">Monthly salary</p>
          <p className="mt-2 font-data text-xl font-semibold tabular-nums">
            {formatEtb(salary)}
          </p>
        </Card>
        <Card>
          <p className="label-caps">Commission rate</p>
          <p className="mt-2 font-data text-xl font-semibold tabular-nums">
            {commissionLabel}
          </p>
          <p className="mt-1 text-xs text-muted">
            {staff.commissionMode === "PER_PIECE"
              ? "ETB × shop units sold"
              : "% of shop revenue"}
          </p>
        </Card>
        <Card>
          <p className="label-caps">This month commission</p>
          <p className="mt-2 font-data text-xl font-semibold tabular-nums">
            {formatEtb(periodCommission)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {shopSales.unitsSold.toLocaleString()} pcs · {formatEtb(shopSales.revenue)}{" "}
            shop sales (MTD)
          </p>
        </Card>
        <Card>
          <p className="label-caps">Hire date</p>
          <p className="mt-2 text-xl font-semibold">{hireLabel}</p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold">Edit profile</h2>
        <ShopStaffForm
          mode="edit"
          staffId={staff.id}
          branchId={staff.branchId}
          redirectTo={backHref}
          defaultValues={{
            name: staff.name,
            phone: staff.phone ?? "",
            jobTitle: staff.jobTitle ?? "",
            code: staff.code ?? "",
            monthlyBaseSalary: salary,
            commissionMode: staff.commissionMode,
            pieceRatePerUnit: toNumber(staff.pieceRatePerUnit),
            commissionPercent: toNumber(staff.commissionPercent),
          }}
        />
      </Card>
    </div>
  );
}
