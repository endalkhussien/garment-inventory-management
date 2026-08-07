import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ShopStaffForm } from "@/components/shops/shop-staff-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import {
  getShopBranchId,
  isAdminRole,
  isShopRole,
  requireSession,
} from "@/lib/rbac";
import { cn } from "@/lib/utils";

export default async function NewShopStaffPage({
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

  if (shopOnly && !locked) {
    return (
      <p className="text-sm text-danger">Your account has no shop assigned.</p>
    );
  }

  const shops = await prisma.branch.findMany({
    where: shopOnly
      ? { id: locked ?? "__none__", isShop: true }
      : { isShop: true, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const activeBranchId = shopOnly
    ? locked
    : searchParams?.branchId &&
        shops.some((s) => s.id === searchParams.branchId)
      ? searchParams.branchId
      : shops[0]?.id;

  if (!activeBranchId) {
    return (
      <p className="text-sm text-danger">
        Create a shop first, then add staff.
      </p>
    );
  }

  const shopName = shops.find((s) => s.id === activeBranchId)?.name;
  const backHref = shopOnly
    ? "/shops/staff"
    : `/shops/staff?branchId=${activeBranchId}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="page-header">
        <div>
          <p className="label-caps mb-1">Staff</p>
          <h1 className="page-title">Add staff member</h1>
          <p className="page-subtitle">
            {shopName
              ? `Assign to ${shopName} with salary and commission`
              : "Name, pay, and commission for this shop"}
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      {!shopOnly && shops.length > 1 && (
        <Card className="flex flex-wrap items-center gap-2">
          <span className="label-caps">Shop</span>
          {shops.map((s) => (
            <Link
              key={s.id}
              href={`/shops/staff/new?branchId=${s.id}`}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                s.id === activeBranchId
                  ? "bg-[var(--primary-container)] text-white"
                  : "bg-[var(--surface-container)] text-muted hover:text-[var(--text-primary)]",
              )}
            >
              {s.name}
            </Link>
          ))}
        </Card>
      )}

      <Card>
        <ShopStaffForm
          mode="create"
          branchId={activeBranchId}
          redirectTo={backHref}
        />
      </Card>
    </div>
  );
}
