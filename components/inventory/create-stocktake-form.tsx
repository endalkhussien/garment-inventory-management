"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createStocktakeSession } from "@/lib/actions/stocktake";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type MaterialOption = { id: string; name: string };

export function CreateStocktakeForm({
  materials,
}: {
  materials: MaterialOption[];
}) {
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
        const ids = fd.getAll("rawMaterialIds").map(String);
        const result = await createStocktakeSession({
          title: String(fd.get("title") ?? ""),
          note: String(fd.get("note") ?? ""),
          rawMaterialIds: ids,
        });
        setPending(false);
        if (!result.success || !result.id) {
          setError(result.error ?? "Failed");
          return;
        }
        router.push(`/inventory/stocktake/${result.id}`);
        router.refresh();
      }}
    >
      <div className="space-y-1">
        <Label>Title</Label>
        <Input
          name="title"
          required
          placeholder="April fabric cycle count"
          defaultValue={`Stocktake ${new Date().toLocaleDateString("en-ET")}`}
        />
      </div>
      <div className="space-y-1">
        <Label>Note</Label>
        <Textarea name="note" rows={2} />
      </div>
      <div className="space-y-2">
        <Label>Materials to count</Label>
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-3">
          {materials.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="rawMaterialIds"
                value={m.id}
                defaultChecked
                className="h-4 w-4"
              />
              {m.name}
            </label>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Start stocktake"}
      </Button>
    </form>
  );
}
