"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { recordWastage } from "@/lib/actions/production";
import {
  wastageSchema,
  type WastageInput,
} from "@/lib/validations/production";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function WastageForm({
  productionOrderId,
  materials,
}: {
  productionOrderId: string;
  materials: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WastageInput>({
    resolver: zodResolver(wastageSchema),
    defaultValues: {
      productionOrderId,
      rawMaterialId: materials[0]?.id ?? "",
      quantity: 0,
      note: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await recordWastage(values);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    reset({
      productionOrderId,
      rawMaterialId: materials[0]?.id ?? "",
      quantity: 0,
      note: "",
    });
    router.refresh();
  });

  if (materials.length === 0) {
    return (
      <p className="text-sm text-muted">
        Add a BOM to this product before logging material wastage.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-3">
      <input type="hidden" {...register("productionOrderId")} />
      <div className="space-y-1">
        <Label>Material</Label>
        <Select {...register("rawMaterialId")}>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Quantity wasted</Label>
        <Input
          type="number"
          step="0.001"
          {...register("quantity", { valueAsNumber: true })}
        />
        {errors.quantity && (
          <p className="text-xs text-danger">{errors.quantity.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label>Note (optional)</Label>
        <Input {...register("note")} placeholder="Damaged / scrap" />
      </div>
      <div className="md:col-span-3 flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting} variant="secondary">
          {isSubmitting ? "Saving..." : "Record wastage"}
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </form>
  );
}
