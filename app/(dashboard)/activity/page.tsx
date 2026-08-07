import Link from "next/link";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Filter,
} from "lucide-react";

import {
  ACTIVITY_ACTION_LABELS,
  ACTIVITY_ENTITY_LABELS,
} from "@/lib/activity-log";
import { hrefWithQuery } from "@/components/filters/category-filter-chips";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import {
  getShopBranchId,
  isAdminRole,
  isShopRole,
  requireSession,
} from "@/lib/rbac";

const PAGE_SIZE = 50;

const STATUS_OPTIONS = [
  { id: "all", label: "All" },
  { id: "SUCCESS", label: "Success" },
  { id: "FAILURE", label: "Failed" },
] as const;

const ENTITY_OPTIONS = [
  "all",
  "Product",
  "Sale",
  "Stock",
  "Staff",
  "Shop",
  "User",
  "Expense",
  "Transfer",
  "Data",
  "Category",
  "Settings",
  "Payroll",
  "Account",
  "System",
] as const;

export default async function ActivityPage({
  searchParams,
}: {
  searchParams?: {
    status?: string;
    entity?: string;
    action?: string;
    page?: string;
  };
}) {
  const session = await requireSession();
  const shopOnly = isShopRole(session.user.role.name);
  const admin = isAdminRole(session.user.role.name);
  const lockedBranchId = getShopBranchId(session);

  if (!shopOnly && !admin) {
    return <p className="text-sm text-danger">Not allowed.</p>;
  }

  const status =
    searchParams?.status === "SUCCESS" || searchParams?.status === "FAILURE"
      ? searchParams.status
      : undefined;
  const entity =
    searchParams?.entity &&
    ENTITY_OPTIONS.includes(searchParams.entity as (typeof ENTITY_OPTIONS)[number]) &&
    searchParams.entity !== "all"
      ? searchParams.entity
      : undefined;
  const action = searchParams?.action?.trim() || undefined;
  const page = Math.max(1, Number(searchParams?.page) || 1);

  const where = {
    ...(shopOnly && lockedBranchId
      ? {
          OR: [
            { branchId: lockedBranchId },
            { userId: session.user.id },
          ],
        }
      : {}),
    ...(status ? { status: status as "SUCCESS" | "FAILURE" } : {}),
    ...(entity ? { entityType: entity } : {}),
    ...(action ? { action } : {}),
  };

  const [total, successCount, failureCount, activities] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.count({
      where: { ...where, status: "SUCCESS" },
    }),
    prisma.activityLog.count({
      where: { ...where, status: "FAILURE" },
    }),
    prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { name: true, username: true, email: true } },
        branch: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const queryBase = {
    status: status ?? "all",
    entity: entity ?? "all",
    action,
  };

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Activity log
          </h1>
          <p className="mt-1 text-sm text-muted">
            Every successful and failed action — products, sales, stock, staff,
            exports, and more.
            {shopOnly ? " Showing your shop and your own actions." : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase text-muted">Shown</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{total}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-muted">Success</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums text-success">
            <CheckCircle2 className="h-5 w-5" />
            {successCount}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-muted">Failed</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums text-danger">
            <AlertCircle className="h-5 w-5" />
            {failureCount}
          </p>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4 text-muted" />
          Filters
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="self-center text-xs uppercase text-muted">
            Status
          </span>
          {STATUS_OPTIONS.map((opt) => {
            const active =
              (opt.id === "all" && !status) || status === opt.id;
            return (
              <Link
                key={opt.id}
                href={hrefWithQuery("/activity", queryBase, {
                  status: opt.id === "all" ? undefined : opt.id,
                  page: undefined,
                })}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  active
                    ? "bg-primary text-on-primary"
                    : "bg-page text-muted hover:bg-page/80"
                }`}
              >
                {opt.label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="self-center text-xs uppercase text-muted">
            Type
          </span>
          {ENTITY_OPTIONS.map((opt) => {
            const active =
              (opt === "all" && !entity) || entity === opt;
            return (
              <Link
                key={opt}
                href={hrefWithQuery("/activity", queryBase, {
                  entity: opt === "all" ? undefined : opt,
                  page: undefined,
                })}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "bg-page text-muted hover:bg-page/80"
                }`}
              >
                {opt === "all"
                  ? "All types"
                  : ACTIVITY_ENTITY_LABELS[opt] ?? opt}
              </Link>
            );
          })}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border bg-[var(--bg-page)] px-4 py-3 text-sm font-semibold">
          Timeline
        </div>
        <ul className="divide-y divide-border">
          {activities.map((a) => {
            const who =
              a.user?.name ||
              a.user?.username ||
              a.user?.email ||
              "System";
            const when = a.createdAt.toLocaleString("en-ET", {
              dateStyle: "medium",
              timeStyle: "short",
            });
            const actionLabel =
              ACTIVITY_ACTION_LABELS[a.action] ?? a.action;
            const entityLabel =
              ACTIVITY_ENTITY_LABELS[a.entityType] ?? a.entityType;

            const content = (
              <>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        a.status === "SUCCESS" ? "success" : "danger"
                      }
                    >
                      {a.status === "SUCCESS" ? "Success" : "Failed"}
                    </Badge>
                    <Badge variant="secondary">{entityLabel}</Badge>
                    <Badge variant="default">{actionLabel}</Badge>
                  </div>
                  <p className="font-medium text-[var(--text-primary)]">
                    {a.title}
                  </p>
                  <p
                    className={
                      a.status === "FAILURE"
                        ? "text-danger"
                        : "text-muted"
                    }
                  >
                    {a.message}
                  </p>
                  <p className="text-xs text-muted">
                    {when}
                    {" · "}
                    {who}
                    {a.branch ? ` · ${a.branch.name}` : ""}
                  </p>
                </div>
                {a.href && (
                  <span className="shrink-0 text-xs font-medium text-secondary sm:pt-1">
                    Open →
                  </span>
                )}
              </>
            );

            return (
              <li key={a.id}>
                {a.href ? (
                  <Link
                    href={a.href}
                    className="flex flex-col gap-2 px-4 py-3 text-sm hover:bg-page/40 focus:outline-none focus-visible:bg-page/60 sm:flex-row sm:items-start sm:justify-between"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-start sm:justify-between">
                    {content}
                  </div>
                )}
              </li>
            );
          })}
          {activities.length === 0 && (
            <li className="px-4 py-10 text-center text-muted">
              No activity yet for this filter. Actions appear here after you
              create products, record sales, restock, and more.
            </li>
          )}
        </ul>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
            <span className="text-muted">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={hrefWithQuery("/activity", queryBase, {
                    page: String(page - 1),
                  })}
                  className="rounded-lg bg-page px-3 py-1.5 text-secondary hover:bg-page/80"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={hrefWithQuery("/activity", queryBase, {
                    page: String(page + 1),
                  })}
                  className="rounded-lg bg-page px-3 py-1.5 text-secondary hover:bg-page/80"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
