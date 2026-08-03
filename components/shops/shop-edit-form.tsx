"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { updateShop } from "@/lib/actions/shops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ShopEditForm({
  shop,
}: {
  shop: {
    id: string;
    name: string;
    code: string;
    address: string | null;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const fd = new FormData(e.currentTarget);
        const result = await updateShop(shop.id, {
          name: String(fd.get("name") ?? ""),
          code: String(fd.get("code") ?? ""),
          address: String(fd.get("address") ?? ""),
        });
        setPending(false);
        if (!result.success) {
          setError(result.error ?? "Failed");
          return;
        }
        router.refresh();
      }}
    >
      <div className="space-y-1">
        <Label>Shop name</Label>
        <Input name="name" required defaultValue={shop.name} />
      </div>
      <div className="space-y-1">
        <Label>Code</Label>
        <Input name="code" required defaultValue={shop.code} />
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label>Address</Label>
        <Input name="address" defaultValue={shop.address ?? ""} />
      </div>
      <div className="md:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save changes"}
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </form>
  );
}
