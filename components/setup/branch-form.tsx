"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { upsertBranch } from "@/lib/actions/setup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BranchDefaults = {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  isWarehouse: boolean;
  isShop: boolean;
};

export function BranchForm({
  branch,
  onDone,
}: {
  branch?: BranchDefaults;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isEdit = !!branch;

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const fd = new FormData(e.currentTarget);
        const result = await upsertBranch({
          id: branch?.id,
          name: String(fd.get("name") ?? ""),
          code: String(fd.get("code") ?? ""),
          address: String(fd.get("address") ?? ""),
          isWarehouse: fd.get("isWarehouse") === "on",
          isShop: fd.get("isShop") === "on",
        });
        setPending(false);
        if (!result.success) {
          setError(result.error ?? "Failed");
          return;
        }
        if (!isEdit) (e.target as HTMLFormElement).reset();
        onDone?.();
        router.refresh();
      }}
    >
      <div className="space-y-1">
        <Label>Name</Label>
        <Input
          name="name"
          required
          defaultValue={branch?.name}
          placeholder="Bole Retail Shop"
        />
      </div>
      <div className="space-y-1">
        <Label>Code</Label>
        <Input
          name="code"
          required
          defaultValue={branch?.code}
          placeholder="SHOP2"
        />
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label>Address (optional)</Label>
        <Input
          name="address"
          defaultValue={branch?.address ?? ""}
          placeholder="Addis Ababa"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isWarehouse"
          className="rounded"
          defaultChecked={branch?.isWarehouse}
        />
        Warehouse / factory stock location
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isShop"
          className="rounded"
          defaultChecked={branch?.isShop ?? true}
        />
        Retail shop (can sell)
      </label>
      <div className="md:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : isEdit ? "Save changes" : "Add branch"}
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </form>
  );
}
