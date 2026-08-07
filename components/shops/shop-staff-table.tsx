import Link from "next/link";

import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setShopStaffActive } from "@/lib/actions/shop-staff";
import { formatCommissionRate } from "@/lib/commission";
import { formatEtb } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ShopStaffRow = {
  id: string;
  name: string;
  code: string | null;
  phone: string | null;
  jobTitle: string | null;
  monthlyBaseSalary: number;
  commissionMode: "PER_PIECE" | "PERCENT_OF_REVENUE";
  pieceRatePerUnit: number;
  commissionPercent: number;
  isActive: boolean;
  hireDate: Date | null;
  branchName?: string | null;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function ShopStaffTable({
  staff,
  showBranch = false,
  branchQuery,
}: {
  staff: ShopStaffRow[];
  showBranch?: boolean;
  /** Preserve shop filter when linking to detail */
  branchQuery?: string | null;
}) {
  if (staff.length === 0) {
    return (
      <p className="p-6 text-sm text-muted">
        No staff match this view.{" "}
        <Link
          href={
            branchQuery
              ? `/shops/staff/new?branchId=${branchQuery}`
              : "/shops/staff/new"
          }
          className="text-secondary hover:underline"
        >
          Add staff member
        </Link>
      </p>
    );
  }

  return (
    <table className="min-w-full text-left text-sm">
      <thead>
        <tr>
          <th>Member</th>
          {showBranch && <th>Shop</th>}
          <th>Role</th>
          <th>Phone</th>
          <th className="text-right">Salary / mo</th>
          <th className="text-right">Commission</th>
          <th>Status</th>
          <th className="text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {staff.map((s) => {
          const detailHref = branchQuery
            ? `/shops/staff/${s.id}?branchId=${branchQuery}`
            : `/shops/staff/${s.id}`;

          return (
            <tr key={s.id}>
              <td>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      s.isActive
                        ? "bg-[var(--secondary-container)] text-[var(--on-secondary-container)]"
                        : "bg-[var(--surface-container-high)] text-muted",
                    )}
                    aria-hidden
                  >
                    {initials(s.name)}
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={detailHref}
                      className="font-medium text-secondary hover:underline"
                    >
                      {s.name}
                    </Link>
                    {s.code && (
                      <p className="font-data text-xs text-muted">{s.code}</p>
                    )}
                  </div>
                </div>
              </td>
              {showBranch && (
                <td className="text-muted">{s.branchName ?? "—"}</td>
              )}
              <td className="text-muted">{s.jobTitle || "Staff"}</td>
              <td className="text-muted">{s.phone || "—"}</td>
              <td className="text-right font-data tabular-nums">
                {formatEtb(s.monthlyBaseSalary)}
              </td>
              <td className="text-right font-data tabular-nums">
                {formatCommissionRate(s)}
              </td>
              <td>
                <Badge variant={s.isActive ? "success" : "danger"}>
                  {s.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <Button asChild size="sm" variant="secondary">
                    <Link href={detailHref}>Edit</Link>
                  </Button>
                  <ConfirmActionButton
                    label={s.isActive ? "Deactivate" : "Activate"}
                    confirmMessage={
                      s.isActive
                        ? `Deactivate ${s.name}? They stay in the roster as inactive.`
                        : `Activate ${s.name}?`
                    }
                    action={setShopStaffActive.bind(null, s.id, !s.isActive)}
                    variant={s.isActive ? "danger" : "default"}
                  />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
