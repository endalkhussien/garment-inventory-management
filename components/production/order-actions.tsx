"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  cancelProductionOrder,
  completeProductionOrder,
  startProductionOrder,
} from "@/lib/actions/production";
import { Button } from "@/components/ui/button";

export function OrderActions({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ success: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? "Action failed");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" && (
          <Button
            disabled={pending}
            onClick={() => run(() => startProductionOrder(orderId))}
          >
            Start & issue materials
          </Button>
        )}
        {status === "IN_PROGRESS" && (
          <Button
            disabled={pending}
            onClick={() => run(() => completeProductionOrder(orderId))}
          >
            Complete & add to finished stock
          </Button>
        )}
        {(status === "DRAFT" || status === "IN_PROGRESS") && (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => {
              if (
                !confirm(
                  "Cancel this order? Materials already issued stay deducted.",
                )
              ) {
                return;
              }
              run(() => cancelProductionOrder(orderId));
            }}
          >
            Cancel order
          </Button>
        )}
      </div>
      {error && (
        <p className="whitespace-pre-wrap text-sm text-danger">{error}</p>
      )}
    </div>
  );
}
