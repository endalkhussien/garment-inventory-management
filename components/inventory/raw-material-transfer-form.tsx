"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { transferRawMaterial } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Option = { id: string; label: string };

export function RawMaterialTransferForm({
  materials,
  branches,
  defaultFromId,
}: {
  materials: Option[];
  branches: Option[];
  defaultFromId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const defaultTo =
    branches.find((b) => b.id !== defaultFromId)?.id ?? branches[0]?.id;

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const fd = new FormData(e.currentTarget);
        const result = await transferRawMaterial({
          rawMaterialId: String(fd.get("rawMaterialId") ?? ""),
          fromBranchId: String(fd.get("fromBranchId") ?? ""),
          toBranchId: String(fd.get("toBranchId") ?? ""),
          quantity: Number(fd.get("quantity")),
          note: String(fd.get("note") ?? ""),
        });
        setPending(false);
        if (!result.success) {
          setError(result.error ?? "Transfer failed");
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
              {m.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label>From branch</Label>
        <Select name="fromBranchId" required defaultValue={defaultFromId}>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label>To branch</Label>
        <Select name="toBranchId" required defaultValue={defaultTo}>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Quantity</Label>
        <Input
          name="quantity"
          type="number"
          min={0.001}
          step="0.001"
          required
        />
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label>Note</Label>
        <Textarea name="note" rows={2} placeholder="Move to cutting room" />
      </div>
      {error && <p className="text-sm text-danger md:col-span-2">{error}</p>}
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Transferring..." : "Transfer raw material"}
        </Button>
      </div>
    </form>
  );
}
