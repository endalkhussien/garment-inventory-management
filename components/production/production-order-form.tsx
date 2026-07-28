"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createProductionOrder,
  updateDraftProductionOrder,
} from "@/lib/actions/production";
import {
  productionOrderSchema,
  type ProductionOrderInput,
} from "@/lib/validations/production";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Option = { id: string; label: string };

export function ProductionOrderForm({
  variants,
  employees,
  branches,
  defaultBranchId,
  orderId,
  defaults,
}: {
  variants: Option[];
  employees: Option[];
  branches: Option[];
  defaultBranchId?: string;
  orderId?: string;
  defaults?: Partial<ProductionOrderInput>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!orderId;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductionOrderInput>({
    resolver: zodResolver(productionOrderSchema),
    defaultValues: {
      variantId: defaults?.variantId ?? variants[0]?.id ?? "",
      quantityTarget: defaults?.quantityTarget ?? 10,
      targetDate: defaults?.targetDate ?? "",
      supervisorId: defaults?.supervisorId ?? "__none__",
      warehouseBranchId:
        defaults?.warehouseBranchId ??
        defaultBranchId ??
        branches[0]?.id ??
        "",
      note: defaults?.note ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = isEdit
      ? await updateDraftProductionOrder(orderId, values)
      : await createProductionOrder(values);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    router.push(`/production/orders/${result.id}`);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>Product variant</Label>
          <Select {...register("variantId")}>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </Select>
          {errors.variantId && (
            <p className="text-xs text-danger">{errors.variantId.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>How many to make</Label>
          <Input
            type="number"
            min={1}
            {...register("quantityTarget", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <Label>Target date (optional)</Label>
          <Input type="date" {...register("targetDate")} />
        </div>
        <div className="space-y-2">
          <Label>Supervisor (optional)</Label>
          <Select {...register("supervisorId")}>
            <option value="__none__">Unassigned</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Finished goods go to</Label>
          <Select {...register("warehouseBranchId")}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Note (optional)</Label>
          <Textarea rows={2} {...register("note")} />
        </div>
      </div>
      {error && <p className="text-sm text-danger whitespace-pre-wrap">{error}</p>}
      <Button type="submit" disabled={isSubmitting || variants.length === 0}>
        {isSubmitting
          ? "Saving..."
          : isEdit
            ? "Save draft changes"
            : "Create draft order"}
      </Button>
    </form>
  );
}
