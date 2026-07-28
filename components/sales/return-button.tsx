"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createReturn } from "@/lib/actions/sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ReturnButton({ saleId }: { saleId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <p className="text-sm font-medium">Return / exchange</p>
      <Input
        placeholder="Reason (required)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <Button
        variant="danger"
        disabled={pending || !reason.trim()}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await createReturn({ saleId, reason });
            if (!result.success) {
              setError(result.error ?? "Return failed");
              return;
            }
            router.push(`/sales/${result.id}`);
            router.refresh();
          });
        }}
      >
        {pending ? "Processing..." : "Restore stock & record return"}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
