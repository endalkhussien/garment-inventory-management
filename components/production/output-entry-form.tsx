"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { recordOutputEntry } from "@/lib/actions/production";
import {
  outputEntrySchema,
  type OutputEntryInput,
} from "@/lib/validations/production";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Option = { id: string; label: string };

export function OutputEntryForm({
  orders,
  employees,
  defaultOrderId,
}: {
  orders: Option[];
  employees: Option[];
  defaultOrderId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<OutputEntryInput>({
    resolver: zodResolver(outputEntrySchema),
    defaultValues: {
      productionOrderId: defaultOrderId ?? orders[0]?.id ?? "",
      employeeId: "__none__",
      outputDate: new Date().toISOString().slice(0, 10),
      quantityGood: 1,
      quantityRejected: 0,
      note: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await recordOutputEntry(values);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    reset({
      ...values,
      quantityGood: 1,
      quantityRejected: 0,
      note: "",
    });
    router.refresh();
  });

  if (orders.length === 0) {
    return (
      <p className="text-sm text-muted">
        No open orders. Start a production order first, then log output here.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1 md:col-span-2">
        <Label>Order</Label>
        <Select {...register("productionOrderId")}>
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Employee (optional)</Label>
        <Select {...register("employeeId")}>
          <option value="__none__">Not assigned</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Date</Label>
        <Input type="date" {...register("outputDate")} />
      </div>
      <div className="space-y-1">
        <Label>Good units</Label>
        <Input
          type="number"
          min={0}
          {...register("quantityGood", { valueAsNumber: true })}
        />
      </div>
      <div className="space-y-1">
        <Label>Rejected</Label>
        <Input
          type="number"
          min={0}
          {...register("quantityRejected", { valueAsNumber: true })}
        />
      </div>
      <div className="md:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Log output"}
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </form>
  );
}
