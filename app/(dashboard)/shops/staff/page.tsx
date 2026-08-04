import { ShopStaffForm } from "@/components/shops/shop-staff-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatEtb, toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  getShopBranchId,
  isAdminRole,
  isShopRole,
  requireSession,
} from "@/lib/rbac";
import { setShopStaffActive } from "@/lib/actions/shop-staff";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";

export default async function ShopStaffPage({
  searchParams,
}: {
  searchParams?: { branchId?: string };
}) {
  const session = await requireSession();
  const shopOnly = isShopRole(session.user.role.name);
  const locked = getShopBranchId(session);

  if (!shopOnly && !isAdminRole(session.user.role.name)) {
    return <p className="text-sm text-danger">Not allowed.</p>;
  }

  const branchId = shopOnly
    ? locked
    : searchParams?.branchId ?? locked;

  if (shopOnly && !branchId) {
    return (
      <p className="text-sm text-danger">
        Your account has no shop assigned.
      </p>
    );
  }

  const shops = await prisma.branch.findMany({
    where: { isShop: true, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const activeBranchId = branchId ?? shops[0]?.id;

  const staff = activeBranchId
    ? await prisma.employee.findMany({
        where: { branchId: activeBranchId },
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
      })
    : [];

  const shopName =
    shops.find((s) => s.id === activeBranchId)?.name ??
    session.user.branch?.name ??
    "Shop";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Shop staff</h1>
        <p className="mt-1 text-sm text-muted">
          {shopOnly
            ? "Register people who work at your shop — salary and commission %."
            : `Staff roster for ${shopName}. Shops manage their own team.`}
        </p>
      </div>

      {!shopOnly && (
        <div className="flex flex-wrap gap-2">
          {shops.map((s) => (
            <a
              key={s.id}
              href={`/shops/staff?branchId=${s.id}`}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                s.id === activeBranchId
                  ? "bg-primary/15 text-primary"
                  : "bg-surface text-muted"
              }`}
            >
              {s.name}
            </a>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Add staff member</h2>
          <ShopStaffForm mode="create" branchId={activeBranchId} />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold">
            Team ({staff.filter((s) => s.isActive).length} active)
          </h2>
          <ul className="space-y-3 text-sm">
            {staff.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-border/50 px-3 py-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {s.name}{" "}
                      {!s.isActive && (
                        <Badge variant="danger">Inactive</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted">
                      {s.jobTitle || "Staff"}
                      {s.phone ? ` · ${s.phone}` : ""}
                      {s.code ? ` · ${s.code}` : ""}
                    </p>
                    <p className="mt-1 text-xs">
                      Salary {formatEtb(toNumber(s.monthlyBaseSalary))} / mo ·
                      Commission {toNumber(s.pieceRatePerUnit)}%
                    </p>
                  </div>
                  <ConfirmActionButton
                    label={s.isActive ? "Deactivate" : "Activate"}
                    confirmMessage={
                      s.isActive
                        ? `Deactivate ${s.name}?`
                        : `Activate ${s.name}?`
                    }
                    action={setShopStaffActive.bind(null, s.id, !s.isActive)}
                    variant={s.isActive ? "danger" : "default"}
                  />
                </div>
              </li>
            ))}
            {staff.length === 0 && (
              <li className="text-muted">No staff yet for this shop.</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
