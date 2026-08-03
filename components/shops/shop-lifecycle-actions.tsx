"use client";

import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { deleteShop, setShopActive } from "@/lib/actions/shops";

export function ShopLifecycleActions({
  shopId,
  shopName,
  isActive,
  hasData,
}: {
  shopId: string;
  shopName: string;
  isActive: boolean;
  hasData: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmActionButton
        label={isActive ? "Close shop" : "Reopen shop"}
        confirmMessage={
          isActive
            ? `Close ${shopName}? Staff logins stay, but the shop is marked closed.`
            : `Reopen ${shopName}?`
        }
        action={() => setShopActive(shopId, !isActive)}
        variant={isActive ? "danger" : "default"}
      />
      <ConfirmActionButton
        label="Delete shop"
        confirmMessage={
          hasData
            ? "This shop has data — it will be closed (history kept), not wiped. Continue?"
            : `Permanently delete ${shopName}?`
        }
        action={() => deleteShop(shopId)}
        variant="danger"
        redirectTo="/setup/shops"
      />
    </div>
  );
}
