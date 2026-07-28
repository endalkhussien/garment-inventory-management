"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { upsertBomLine, removeBomLine } from "@/lib/actions/products";
import { formatEtb, formatQuantity } from "@/lib/format";
import {
  bomLineSchema,
  type BomLineInput,
} from "@/lib/validations/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type MaterialOption = {
  id: string;
  name: string;
  unitOfMeasure: string;
  costPerUnit: number;
};

type BomLine = {
  id: string;
  quantityPerUnit: number;
  rawMaterial: {
    id: string;
    name: string;
    unitOfMeasure: string;
    costPerUnit: number;
  };
};

type BomEditorProps = {
  variantId: string;
  materials: MaterialOption[];
  lines: BomLine[];
};

export function BomEditor({ variantId, materials, lines }: BomEditorProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BomLineInput>({
    resolver: zodResolver(bomLineSchema),
    defaultValues: {
      rawMaterialId: materials[0]?.id ?? "",
      quantityPerUnit: 1,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await upsertBomLine(variantId, values);
    if (!result.success) {
      setServerError(result.error ?? "Could not save BOM line.");
      return;
    }
    reset({
      rawMaterialId: materials[0]?.id ?? "",
      quantityPerUnit: 1,
    });
    router.refresh();
  });

  const onRemove = async (bomLineId: string) => {
    setRemovingId(bomLineId);
    setServerError(null);
    const result = await removeBomLine(variantId, bomLineId);
    setRemovingId(null);
    if (!result.success) {
      setServerError(result.error ?? "Could not remove line.");
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="rawMaterialId">Raw material</Label>
          <Select id="rawMaterialId" {...register("rawMaterialId")}>
            {materials.length === 0 ? (
              <option value="">No materials available</option>
            ) : (
              materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({formatEtb(m.costPerUnit)} / {m.unitOfMeasure})
                </option>
              ))
            )}
          </Select>
          {errors.rawMaterialId && (
            <p className="text-xs text-danger">{errors.rawMaterialId.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantityPerUnit">Qty per unit</Label>
          <Input
            id="quantityPerUnit"
            type="number"
            step="0.0001"
            min="0.0001"
            {...register("quantityPerUnit", { valueAsNumber: true })}
          />
          {errors.quantityPerUnit && (
            <p className="text-xs text-danger">
              {errors.quantityPerUnit.message}
            </p>
          )}
        </div>
        <div className="md:col-span-3">
          <Button type="submit" disabled={isSubmitting || materials.length === 0}>
            {isSubmitting ? "Saving..." : "Add / update BOM line"}
          </Button>
        </div>
      </form>

      {serverError && <p className="text-sm text-danger">{serverError}</p>}

      {lines.length === 0 ? (
        <p className="text-sm text-muted">
          No BOM lines yet. Add yarn, thread, and trims required per garment.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">Material</th>
                <th className="px-3 py-3 font-medium">Qty / unit</th>
                <th className="px-3 py-3 font-medium">Unit cost</th>
                <th className="px-3 py-3 font-medium">Line cost</th>
                <th className="px-3 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const qty = line.quantityPerUnit;
                const unitCost = line.rawMaterial.costPerUnit;
                return (
                  <tr
                    key={line.id}
                    className="border-t border-border/60 hover:bg-surface/60"
                  >
                    <td className="px-3 py-3">{line.rawMaterial.name}</td>
                    <td className="px-3 py-3">
                      {formatQuantity(qty, line.rawMaterial.unitOfMeasure)}
                    </td>
                    <td className="px-3 py-3">{formatEtb(unitCost)}</td>
                    <td className="px-3 py-3">
                      {formatEtb(qty * unitCost)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={removingId === line.id}
                        onClick={() => onRemove(line.id)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
