import Link from "next/link";

import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteShop, setShopActive } from "@/lib/actions/shops";

export type ShopListRow = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  isActive: boolean;
  userCount: number;
  stockUnits: number;
  pendingOrders: number;
};

export function ShopsAdminTable({ shops }: { shops: ShopListRow[] }) {
  if (shops.length === 0) {
    return (
      <p className="p-6 text-sm text-muted">
        No shops yet.{" "}
        <Link href="/setup/shops/new" className="text-secondary hover:underline">
          Initiate your first shop
        </Link>
        .
      </p>
    );
  }

  return (
    <table className="min-w-full text-left text-sm">
      <thead className="bg-page text-xs uppercase text-muted">
        <tr>
          <th className="px-3 py-3">Shop</th>
          <th className="px-3 py-3">Code</th>
          <th className="px-3 py-3">Staff</th>
          <th className="px-3 py-3">Stock</th>
          <th className="px-3 py-3">Orders</th>
          <th className="px-3 py-3">Status</th>
          <th className="px-3 py-3">Actions</th>
        </tr>
      </thead>
      <tbody>
        {shops.map((s) => (
          <tr key={s.id} className="border-t border-border/60">
            <td className="px-3 py-3">
              <Link
                href={`/setup/shops/${s.id}`}
                className="font-medium text-secondary hover:underline"
              >
                {s.name}
              </Link>
              {s.address && (
                <p className="text-xs text-muted">{s.address}</p>
              )}
            </td>
            <td className="px-3 py-3 text-muted">{s.code}</td>
            <td className="px-3 py-3">{s.userCount}</td>
            <td className="px-3 py-3">{s.stockUnits}</td>
            <td className="px-3 py-3">
              {s.pendingOrders > 0 ? (
                <Badge variant="warning">{s.pendingOrders} pending</Badge>
              ) : (
                <span className="text-muted">—</span>
              )}
            </td>
            <td className="px-3 py-3">
              <Badge variant={s.isActive ? "success" : "danger"}>
                {s.isActive ? "Open" : "Closed"}
              </Badge>
            </td>
            <td className="px-3 py-3">
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/setup/shops/${s.id}`}>Manage</Link>
                </Button>
                <ConfirmActionButton
                  label={s.isActive ? "Close" : "Reopen"}
                  confirmMessage={
                    s.isActive
                      ? `Close ${s.name}? Staff cannot sell until reopened.`
                      : `Reopen ${s.name}?`
                  }
                  action={() => setShopActive(s.id, !s.isActive)}
                  variant={s.isActive ? "danger" : "default"}
                />
                <ConfirmActionButton
                  label="Delete"
                  confirmMessage={
                    s.stockUnits > 0 || s.userCount > 0
                      ? `${s.name} has history or stock — it will be closed (not wiped). Continue?`
                      : `Permanently delete ${s.name}? This cannot be undone.`
                  }
                  action={() => deleteShop(s.id)}
                  variant="danger"
                  redirectTo="/setup/shops"
                />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
