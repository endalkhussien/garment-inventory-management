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
  const [createLogin, setCreateLogin] = useState(true);

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
          createLogin,
          staffName: String(fd.get("staffName") ?? ""),
          username: String(fd.get("username") ?? ""),
          password: String(fd.get("password") ?? ""),
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

      <div className="space-y-3 rounded-lg border border-border p-4">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1 rounded"
            checked={createLogin}
            onChange={(e) => setCreateLogin(e.target.checked)}
          />
          <span>
            <span className="font-medium">Create shop login now</span>
            <span className="block text-xs text-muted">
              Unique username + password. Staff can change the password after
              signing in under My account.
            </span>
          </span>
        </label>

        {createLogin && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label>Staff display name</Label>
              <Input
                name="staffName"
                required={createLogin}
                placeholder="Sara — Bole counter"
              />
            </div>
            <div className="space-y-1">
              <Label>Username</Label>
              <Input
                name="username"
                required={createLogin}
                autoComplete="off"
                placeholder="bole_shop"
              />
              <p className="text-xs text-muted">
                Letters, numbers, . _ - · no spaces
              </p>
            </div>
            <div className="space-y-1">
              <Label>Temporary password</Label>
              <Input
                name="password"
                type="password"
                required={createLogin}
                minLength={6}
                autoComplete="new-password"
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
