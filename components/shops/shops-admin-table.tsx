"use client";

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
};

export function ShopsAdminTable({ shops }: { shops: ShopListRow[] }) {
  if (shops.length === 0) {
    return (
      <p className="p-6 text-sm text-muted">
        No shops.{" "}
        <Link href="/setup/shops/new" className="text-secondary hover:underline">
          Create shop
        </Link>
      </p>
    );
  }

  return (
    <table className="min-w-full text-left text-sm">
      <thead className="bg-[var(--bg-elevated)] text-xs uppercase text-muted">
        <tr>
          <th className="px-4 py-3 font-medium">Shop</th>
          <th className="px-4 py-3 font-medium">Code</th>
          <th className="px-4 py-3 font-medium">Users</th>
          <th className="px-4 py-3 font-medium">Stock</th>
          <th className="px-4 py-3 font-medium">Status</th>
          <th className="px-4 py-3 font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {shops.map((s) => (
          <tr key={s.id} className="border-t border-border/60 hover:bg-page/50">
            <td className="px-4 py-3">
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
            <td className="px-4 py-3 text-muted">{s.code}</td>
            <td className="px-4 py-3 tabular-nums">{s.userCount}</td>
            <td className="px-4 py-3 tabular-nums">{s.stockUnits}</td>
            <td className="px-4 py-3">
              <Badge variant={s.isActive ? "success" : "danger"}>
                {s.isActive ? "Open" : "Closed"}
              </Badge>
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1.5">
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/setup/shops/${s.id}`}>Edit</Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/shops/stock?branchId=${s.id}`}>Stock</Link>
                </Button>
                <ConfirmActionButton
                  label={s.isActive ? "Close" : "Open"}
                  confirmMessage={
                    s.isActive ? `Close ${s.name}?` : `Open ${s.name}?`
                  }
                  action={setShopActive.bind(null, s.id, !s.isActive)}
                  variant={s.isActive ? "danger" : "default"}
                />
                <ConfirmActionButton
                  label="Delete"
                  confirmMessage={
                    s.stockUnits > 0 || s.userCount > 0
                      ? `${s.name} has data — close instead of delete?`
                      : `Delete ${s.name}?`
                  }
                  action={deleteShop.bind(null, s.id)}
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
