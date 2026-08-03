"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { reviewShopStockOrder } from "@/lib/actions/shop-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Line = {
  id: string;
  label: string;
  quantityRequested: number;
  quantityApproved: number | null;
  warehouseAvailableSnap: number;
};

export function ShopOrderReviewForm({
  orderId,
  status,
  lines,
}: {
  orderId: string;
  status: string;
  lines: Line[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [approved, setApproved] = useState(
    Object.fromEntries(
      lines.map((l) => [l.id, l.quantityApproved ?? l.quantityRequested]),
    ),
  );

  if (status === "FULFILLED" || status === "REJECTED" || status === "CANCELLED") {
    return null;
  }

  async function run(decision: "APPROVED" | "REJECTED" | "FULFILL") {
    setPending(true);
    setError(null);
    const fd = document.getElementById(
      "shop-order-review-note",
    ) as HTMLTextAreaElement | null;
    const result = await reviewShopStockOrder({
      orderId,
      decision,
      reviewNote: fd?.value ?? "",
      lines: lines.map((l) => ({
        lineId: l.id,
        quantityApproved: Number(approved[l.id] ?? 0),
      })),
    });
    setPending(false);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {lines.map((l) => (
          <div
            key={l.id}
            className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-3"
          >
            <div className="md:col-span-2">
              <p className="font-medium">{l.label}</p>
              <p className="text-xs text-muted">
                Requested {l.quantityRequested} · warehouse had{" "}
                {l.warehouseAvailableSnap} when ordered
              </p>
            </div>
            <div className="space-y-1">
              <Label>Approve qty</Label>
              <Input
                type="number"
                min={0}
                value={approved[l.id] ?? 0}
                onChange={(e) =>
                  setApproved((prev) => ({
                    ...prev,
                    [l.id]: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <Label>Review note</Label>
        <Textarea id="shop-order-review-note" rows={2} />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {status === "PENDING" && (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => run("APPROVED")}
          >
            Approve
          </Button>
        )}
        <Button type="button" disabled={pending} onClick={() => run("FULFILL")}>
          {pending ? "Working..." : "Fulfill (transfer now)"}
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={() => run("REJECTED")}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
