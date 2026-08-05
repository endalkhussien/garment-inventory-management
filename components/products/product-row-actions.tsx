"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, RotateCcw, Trash2, XCircle } from "lucide-react";

import {
  deleteProduct,
  setProductActive,
} from "@/lib/actions/products";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProductRowActions({
  productId,
  productName,
  isActive,
  compact = false,
}: {
  productId: string;
  productName: string;
  isActive: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(
    confirmMsg: string,
    action: () => Promise<{ success: boolean; error?: string }>,
    opts?: { redirectTo?: string },
  ) {
    if (!confirm(confirmMsg)) return;
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? "Action failed");
        return;
      }
      if (opts?.redirectTo) router.push(opts.redirectTo);
      router.refresh();
    });
  }

  return (
    <div className={cn("flex flex-col gap-1", compact && "items-end")}>
      <div className="flex flex-wrap items-center justify-end gap-1">
        <Button asChild size="sm" variant="secondary" disabled={pending}>
          <Link href={`/products/${productId}`}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
        </Button>

        {isActive ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              run(
                `Cancel “${productName}”?\n\nIt will be hidden from the catalog and shops. You can restore it later.`,
                () => setProductActive(productId, false),
              )
            }
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancel
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              run(`Restore “${productName}” to the catalog?`, () =>
                setProductActive(productId, true),
              )
            }
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restore
          </Button>
        )}

        <Button
          type="button"
          size="sm"
          variant="danger"
          disabled={pending}
          onClick={() =>
            run(
              `Permanently delete “${productName}”?\n\nOnly works if it has no sales or stock history. Prefer Cancel if unsure.`,
              () => deleteProduct(productId),
              { redirectTo: "/products" },
            )
          }
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
      {error && (
        <p className="max-w-xs text-right text-xs text-danger">{error}</p>
      )}
    </div>
  );
}
