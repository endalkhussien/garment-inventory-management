"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { updateShopReorderAt } from "@/lib/actions/shop-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ShopReorderEditor({
  stockId,
  reorderAt,
}: {
  stockId: string;
  reorderAt: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(reorderAt);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex items-center gap-1"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const result = await updateShopReorderAt({
          stockId,
          reorderAt: value,
        });
        setPending(false);
        if (!result.success) {
          setError(result.error ?? "Failed");
          return;
        }
        router.refresh();
      }}
    >
      <Input
        type="number"
        min={0}
        className="h-9 w-20"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        Save
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </form>
  );
}
