"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { restockManually } from "@/lib/actions/restock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ShopAddQtyEditor({
  variantId,
  branchId,
}: {
  variantId: string;
  branchId: string;
}) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  return (
    <form
      className="flex flex-wrap items-center gap-1"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        setOk(false);
        const result = await restockManually({
          branchId,
          variantId,
          quantity: qty,
          note: "Added from stock page",
        });
        setPending(false);
        if (!result.success) {
          setError(result.error ?? "Failed");
          return;
        }
        setOk(true);
        setQty(1);
        router.refresh();
      }}
    >
      <Input
        type="number"
        min={1}
        className="h-9 w-20"
        value={qty}
        onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
        aria-label="Quantity to add"
      />
      <Button type="submit" size="sm" disabled={pending || qty < 1}>
        {pending ? "…" : "Add"}
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
      {ok && !error && <span className="text-xs text-success">Saved</span>}
    </form>
  );
}
