"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

type ActionResult = { success: boolean; error?: string };

/**
 * Admin-only destructive / toggle action with confirm dialog.
 */
export function ConfirmActionButton({
  label,
  confirmMessage,
  action,
  variant = "secondary",
  redirectTo,
  size = "sm",
}: {
  label: string;
  confirmMessage: string;
  action: () => Promise<ActionResult>;
  variant?: "secondary" | "danger" | "default";
  redirectTo?: string;
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="inline-flex flex-col gap-1">
      <Button
        type="button"
        size={size}
        variant={variant}
        disabled={pending}
        onClick={() => {
          if (!confirm(confirmMessage)) return;
          setError(null);
          startTransition(async () => {
            const result = await action();
            if (!result.success) {
              setError(result.error ?? "Action failed");
              return;
            }
            if (redirectTo) router.push(redirectTo);
            router.refresh();
          });
        }}
      >
        {pending ? "Working..." : label}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
