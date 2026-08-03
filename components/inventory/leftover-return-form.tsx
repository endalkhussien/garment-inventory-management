"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { returnLeftoverFabric } from "@/lib/actions/lots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type MaterialOption = { id: string; name: string; unitOfMeasure: string };

export function LeftoverReturnForm({
  productionOrderId,
  materials,
}: {
  productionOrderId: string;
  materials: MaterialOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (materials.length === 0) {
    return (
      <p className="text-sm text-muted">No BOM materials on this order.</p>
    );
  }

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const fd = new FormData(e.currentTarget);
        const result = await returnLeftoverFabric({
          productionOrderId,
          rawMaterialId: String(fd.get("rawMaterialId") ?? ""),
          quantity: Number(fd.get("quantity")),
          lotCode: String(fd.get("lotCode") ?? ""),
          rollNumber: String(fd.get("rollNumber") ?? ""),
          shade: String(fd.get("shade") ?? ""),
          location: String(fd.get("location") ?? ""),
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
        <Select name="rawMaterialId" required defaultValue={materials[0]?.id}>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.unitOfMeasure})
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Remaining usable qty</Label>
        <Input
          name="quantity"
          type="number"
          min={0.001}
          step="0.001"
          required
        />
      </div>
      <div className="space-y-1">
        <Label>Batch / dye lot</Label>
        <Input name="lotCode" required />
      </div>
      <div className="space-y-1">
        <Label>Roll #</Label>
        <Input name="rollNumber" />
      </div>
      <div className="space-y-1">
        <Label>Shade</Label>
        <Input name="shade" />
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label>Storage location</Label>
        <Input name="location" placeholder="Leftover rack" />
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label>Defects / limits</Label>
        <Textarea name="defects" rows={2} />
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label>Notes</Label>
        <Textarea name="notes" rows={2} />
      </div>
      {error && <p className="text-sm text-danger md:col-span-2">{error}</p>}
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Return leftover to stock"}
        </Button>
      </div>
    </form>
  );
}
