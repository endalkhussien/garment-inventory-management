import Link from "next/link";

import { BranchForm } from "@/components/setup/branch-form";
import { BranchesAdminTable } from "@/components/setup/branches-admin-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function BranchesSetupPage() {
  await requireAdmin();
  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Branches</h1>
          <p className="mt-1 text-sm text-muted">
            Warehouse and general locations. For retail shops, use{" "}
            <Link href="/setup/shops" className="text-secondary hover:underline">
              Shops
            </Link>{" "}
            to initiate properly.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/setup/shops">Manage shops</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/setup">Setup guide</Link>
          </Button>
        </div>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Add branch</h2>
        <BranchForm />
      </Card>

      <Card className="overflow-x-auto p-0">
        <BranchesAdminTable branches={branches} />
      </Card>
    </div>
  );
}
