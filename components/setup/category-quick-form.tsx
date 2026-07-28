"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  createAssetType,
  createMaterialCategory,
  createProductCategory,
} from "@/lib/actions/setup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Kind = "material" | "product" | "asset";

export function CategoryQuickForm({ kind, title }: { kind: Kind; title: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const fd = new FormData(e.currentTarget);
        const payload = {
          name: String(fd.get("name") ?? ""),
          description: String(fd.get("description") ?? ""),
        };
        const result =
          kind === "material"
            ? await createMaterialCategory(payload)
            : kind === "product"
              ? await createProductCategory(payload)
              : await createAssetType(payload);
        setPending(false);
        if (!result.success) {
          setError(result.error ?? "Failed");
          return;
        }
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }}
    >
      <p className="text-sm font-semibold">{title}</p>
      <div className="space-y-1">
        <Label>Name</Label>
        <Input name="name" required placeholder="e.g. Yarn" />
      </div>
      <div className="space-y-1">
        <Label>Description (optional)</Label>
        <Input name="description" />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving..." : "Add"}
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </form>
  );
}
