import Link from "next/link";
import { redirect } from "next/navigation";

import { ShopOrderForm } from "@/components/shops/shop-order-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getWarehouseAvailability } from "@/lib/actions/shop-orders";
import { prisma } from "@/lib/prisma";
import { getShopBranchId, isShopRole, requireSession } from "@/lib/rbac";

export default async function NewShopOrderPage() {
  const session = await requireSession();
  if (!isShopRole(session.user.role.name)) {
    redirect("/shops/orders");
  }
  const shopBranchId = getShopBranchId(session);
  if (!shopBranchId) {
    redirect("/");
  }

  const warehouses = await prisma.branch.findMany({
    where: { isActive: true, isWarehouse: true },
    orderBy: { name: "asc" },
  });

  const catalogByWarehouse: Record<
    string,
    Awaited<ReturnType<typeof getWarehouseAvailability>>
  > = {};
  for (const w of warehouses) {
    catalogByWarehouse[w.id] = await getWarehouseAvailability(w.id);
  }

  const defaultWarehouseId = warehouses[0]?.id;
  const catalog = defaultWarehouseId
    ? catalogByWarehouse[defaultWarehouseId] ?? []
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Order from warehouse</h1>
          <p className="mt-1 text-sm text-muted">
            Available balances are live. You cannot request more than warehouse
            has right now.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/shops/orders">Back</Link>
        </Button>
      </div>

      <Card>
        {warehouses.length === 0 ? (
          <p className="text-sm text-danger">
            No warehouse branch configured. Ask Admin to mark a branch as
            warehouse.
          </p>
        ) : (
          <ShopOrderForm
            warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
            defaultWarehouseId={defaultWarehouseId}
            catalog={catalog}
            catalogByWarehouse={catalogByWarehouse}
          />
        )}
      </Card>
    </div>
  );
}
