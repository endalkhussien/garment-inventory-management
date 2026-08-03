"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { receiveMaterialLot } from "@/lib/actions/lots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Option = { id: string; name: string; unit?: string };

export function ReceiveLotForm({
  materials,
  branches,
  defaultMaterialId,
}: {
  materials: Option[];
  branches: Option[];
  defaultMaterialId?: string;
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
        const result = await receiveMaterialLot({
          rawMaterialId: String(fd.get("rawMaterialId") ?? ""),
          lotCode: String(fd.get("lotCode") ?? ""),
          rollNumber: String(fd.get("rollNumber") ?? ""),
          shade: String(fd.get("shade") ?? ""),
          quantity: Number(fd.get("quantity")),
          location: String(fd.get("location") ?? ""),
          branchId: String(fd.get("branchId") ?? ""),
          defects: String(fd.get("defects") ?? ""),
          notes: String(fd.get("notes") ?? ""),
        });
        setPending(false);
        if (!result.success) {
          setError(result.error ?? "Failed");
          return;
        }
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }}
    >
      <div className="space-y-1 md:col-span-2">
        <Label>Material</Label>
        <Select
          name="rawMaterialId"
          required
          defaultValue={defaultMaterialId ?? materials[0]?.id}
        >
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.unit ? ` (${m.unit})` : ""}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Batch / dye lot</Label>
        <Input name="lotCode" required placeholder="LOT-2026-041" />
      </div>
      <div className="space-y-1">
        <Label>Roll number</Label>
        <Input name="rollNumber" placeholder="R-12" />
      </div>
      <div className="space-y-1">
        <Label>Shade</Label>
        <Input name="shade" placeholder="Navy A" />
      </div>
      <div className="space-y-1">
        <Label>Usable quantity</Label>
        <Input
          name="quantity"
          type="number"
          min={0.001}
          step="0.001"
          required
        />
      </div>
      <div className="space-y-1">
        <Label>Location</Label>
        <Input name="location" placeholder="Aisle B / Rack 3" />
      </div>
      <div className="space-y-1">
        <Label>Branch</Label>
        <Select name="branchId" defaultValue="__none__">
          <option value="__none__">—</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label>Defects / usable notes</Label>
        <Textarea name="defects" rows={2} placeholder="Hole at 12m, avoid" />
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label>Notes</Label>
        <Textarea name="notes" rows={2} />
      </div>
      {error && <p className="text-sm text-danger md:col-span-2">{error}</p>}
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Receive lot / roll"}
        </Button>
      </div>
    </form>
  );
}
