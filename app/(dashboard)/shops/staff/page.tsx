import Link from "next/link";
import {
  BadgePercent,
  Plus,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";

import { hrefWithQuery } from "@/components/filters/category-filter-chips";
import { ShopStaffTable } from "@/components/shops/shop-staff-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatEtb, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  getShopBranchId,
  isAdminRole,
  isShopRole,
  requireSession,
} from "@/lib/rbac";
import { cn } from "@/lib/utils";

export default async function ShopStaffPage({
  searchParams,
}: {
  searchParams?: { branchId?: string; status?: string };
}) {
  const session = await requireSession();
  const shopOnly = isShopRole(session.user.role.name);
  const locked = getShopBranchId(session);

  if (!shopOnly && !isAdminRole(session.user.role.name)) {
    return <p className="text-sm text-danger">Not allowed.</p>;
  }

  const shops = await prisma.branch.findMany({
    where: shopOnly
      ? { id: locked ?? "__none__", isShop: true }
      : { isShop: true, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  if (shopOnly && !locked) {
    return (
      <p className="text-sm text-danger">Your account has no shop assigned.</p>
    );
  }

  const branchId = shopOnly
    ? locked ?? undefined
    : searchParams?.branchId && shops.some((s) => s.id === searchParams.branchId)
      ? searchParams.branchId
      : undefined;

  const statusFilter =
    searchParams?.status === "inactive"
      ? "inactive"
      : searchParams?.status === "all"
        ? "all"
        : "active";

  const staff = await prisma.employee.findMany({
    where: {
      ...(branchId
        ? { branchId }
        : shopOnly
          ? { branchId: locked ?? "__none__" }
          : { branch: { isShop: true } }),
      ...(statusFilter === "active"
        ? { isActive: true }
        : statusFilter === "inactive"
          ? { isActive: false }
          : {}),
    },
    include: { branch: { select: { id: true, name: true } } },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  // KPIs always reflect full branch roster (not status filter)
  const rosterForKpis = await prisma.employee.findMany({
    where: branchId
      ? { branchId }
      : shopOnly
        ? { branchId: locked ?? "__none__" }
        : { branch: { isShop: true } },
    select: {
      isActive: true,
      monthlyBaseSalary: true,
      commissionMode: true,
      pieceRatePerUnit: true,
      commissionPercent: true,
    },
  });

  const activeCount = rosterForKpis.filter((s) => s.isActive).length;
  const inactiveCount = rosterForKpis.length - activeCount;
  const payrollMonthly = rosterForKpis
    .filter((s) => s.isActive)
    .reduce((sum, s) => sum + toNumber(s.monthlyBaseSalary), 0);
  const activeRoster = rosterForKpis.filter((s) => s.isActive);
  const percentStaff = activeRoster.filter(
    (s) => s.commissionMode === "PERCENT_OF_REVENUE",
  );
  const avgCommissionPct =
    percentStaff.length > 0
      ? percentStaff.reduce((sum, s) => sum + toNumber(s.commissionPercent), 0) /
        percentStaff.length
      : 0;
  const perPieceCount = activeRoster.filter(
    (s) => s.commissionMode === "PER_PIECE",
  ).length;

  const queryBase: Record<string, string | undefined> = {
    branchId: shopOnly ? undefined : branchId,
    status: statusFilter === "active" ? undefined : statusFilter,
  };

  const shopLabel = branchId
    ? shops.find((s) => s.id === branchId)?.name
    : shopOnly
      ? shops[0]?.name
      : "All shops";

  const rows = staff.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    phone: s.phone,
    jobTitle: s.jobTitle,
    monthlyBaseSalary: toNumber(s.monthlyBaseSalary),
    commissionMode: s.commissionMode,
    pieceRatePerUnit: toNumber(s.pieceRatePerUnit),
    commissionPercent: toNumber(s.commissionPercent),
    isActive: s.isActive,
    hireDate: s.hireDate,
    branchName: s.branch?.name ?? null,
  }));

  const newHref = branchId
    ? `/shops/staff/new?branchId=${branchId}`
    : "/shops/staff/new";

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">
            Shop roster, salaries, and commission rates
            {shopLabel ? ` · ${shopLabel}` : ""}
          </p>
        </div>
        <Button asChild variant="action">
          <Link href={newHref}>
            <Plus className="h-4 w-4" />
            Add staff
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Active"
          value={String(activeCount)}
          hint={`${inactiveCount} inactive`}
          icon={UserCheck}
          accent="green"
        />
        <KpiCard
          label="Team size"
          value={String(rosterForKpis.length)}
          hint={branchId || shopOnly ? "This shop" : "All shops"}
          icon={Users}
          accent="blue"
        />
        <KpiCard
          label="Monthly payroll"
          value={formatEtb(payrollMonthly)}
          hint="Active base salaries"
          icon={Wallet}
          accent="violet"
        />
        <KpiCard
          label="Avg commission %"
          value={
            percentStaff.length > 0
              ? `${avgCommissionPct.toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })}%`
              : "—"
          }
          hint={
            perPieceCount > 0
              ? `${perPieceCount} on ETB/piece`
              : "Revenue-share staff"
          }
          icon={BadgePercent}
          accent="amber"
        />
      </div>

      <Card className="space-y-4">
        {!shopOnly && shops.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-caps">Shop</span>
            <Link
              href={hrefWithQuery("/shops/staff", queryBase, {
                branchId: undefined,
              })}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                !branchId
                  ? "bg-[var(--primary-container)] text-white"
                  : "bg-[var(--surface-container)] text-muted hover:text-[var(--text-primary)]",
              )}
            >
              All
            </Link>
            {shops.map((s) => (
              <Link
                key={s.id}
                href={hrefWithQuery("/shops/staff", queryBase, {
                  branchId: s.id,
                })}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  branchId === s.id
                    ? "bg-[var(--primary-container)] text-white"
                    : "bg-[var(--surface-container)] text-muted hover:text-[var(--text-primary)]",
                )}
              >
                {s.name}
              </Link>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="label-caps">Status</span>
          {(
            [
              { key: "active", label: "Active" },
              { key: "inactive", label: "Inactive" },
              { key: "all", label: "All" },
            ] as const
          ).map((opt) => (
            <Link
              key={opt.key}
              href={hrefWithQuery("/shops/staff", queryBase, {
                status: opt.key === "active" ? undefined : opt.key,
              })}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                statusFilter === opt.key
                  ? "bg-[var(--primary-container)] text-white"
                  : "bg-[var(--surface-container)] text-muted hover:text-[var(--text-primary)]",
              )}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </Card>

      <div className="stitch-table-wrap">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Team roster</p>
            <p className="text-xs text-muted">
              {rows.length} shown
              {statusFilter !== "all" ? ` · ${statusFilter}` : ""}
            </p>
          </div>
          {!shopOnly && (
            <Link
              href="/shops/finance"
              className="text-sm text-secondary hover:underline"
            >
              View in Finance
            </Link>
          )}
        </div>
        <div className="overflow-x-auto">
          <ShopStaffTable
            staff={rows}
            showBranch={!shopOnly && !branchId}
            branchQuery={branchId ?? null}
          />
        </div>
      </div>
    </div>
  );
}
