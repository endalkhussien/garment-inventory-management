import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { ShopStaffForm } from "@/components/shops/shop-staff-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { setShopStaffActive } from "@/lib/actions/shop-staff";
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

  const salary = toNumber(staff.monthlyBaseSalary);
  const commission = toNumber(staff.pieceRatePerUnit);
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

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="label-caps">Monthly salary</p>
          <p className="mt-2 font-data text-xl font-semibold tabular-nums">
            {formatEtb(salary)}
          </p>
        </Card>
        <Card>
          <p className="label-caps">Commission</p>
          <p className="mt-2 font-data text-xl font-semibold tabular-nums">
            {commission.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
            %
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
            commissionPercent: commission,
          }}
        />
      </Card>
    </div>
  );
}
