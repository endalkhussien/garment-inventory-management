"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { initiateShop } from "@/lib/actions/shops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InitiateShopForm({ suggestedCode }: { suggestedCode: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [createManager, setCreateManager] = useState(true);

  return (
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const fd = new FormData(e.currentTarget);
        const result = await initiateShop({
          name: String(fd.get("name") ?? ""),
          code: String(fd.get("code") ?? ""),
          address: String(fd.get("address") ?? ""),
          createManager,
          managerName: String(fd.get("managerName") ?? ""),
          managerEmail: String(fd.get("managerEmail") ?? ""),
          managerPassword: String(fd.get("managerPassword") ?? ""),
        });
        setPending(false);
        if (!result.success || !result.id) {
          setError(result.error ?? "Failed");
          return;
        }
        router.push(`/setup/shops/${result.id}`);
        router.refresh();
      }}
    >
      <div>
        <h2 className="text-sm font-semibold">Shop details</h2>
        <p className="mt-1 text-xs text-muted">
          Opens a retail location linked to HQ warehouse for stock orders.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Shop name</Label>
          <Input
            name="name"
            required
            placeholder="Bole Retail Shop"
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <Label>Code</Label>
          <Input
            name="code"
            required
            defaultValue={suggestedCode}
            placeholder="SHOP2"
          />
          <p className="text-xs text-muted">Short unique ID (e.g. SHOP2).</p>
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label>Address (optional)</Label>
          <Input name="address" placeholder="Bole Road, Addis Ababa" />
        </div>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1 rounded"
            checked={createManager}
            onChange={(e) => setCreateManager(e.target.checked)}
          />
          <span>
            <span className="font-medium">Create first shop login</span>
            <span className="block text-xs text-muted">
              Shop role, assigned to this location — can sell and order stock.
            </span>
          </span>
        </label>

        {createManager && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Staff name</Label>
              <Input name="managerName" required={createManager} placeholder="Sara" />
            </div>
            <div className="space-y-1">
              <Label>Login email</Label>
              <Input
                name="managerEmail"
                type="email"
                required={createManager}
                placeholder="shop2@yourcompany.com"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Temporary password</Label>
              <Input
                name="managerPassword"
                type="password"
                required={createManager}
                minLength={6}
                placeholder="At least 6 characters"
              />
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Opening shop..." : "Initiate shop"}
      </Button>
    </form>
  );
}
