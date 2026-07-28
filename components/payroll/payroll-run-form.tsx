"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPayrollRun } from "@/lib/actions/payroll";
import {
  payrollRunSchema,
  type PayrollRunInput,
} from "@/lib/validations/payroll";

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function PayrollRunForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PayrollRunInput>({
    resolver: zodResolver(payrollRunSchema),
    defaultValues: {
      title: `Payroll ${new Date().toLocaleDateString("en-ET", { month: "long", year: "numeric" })}`,
      periodStart: firstDayOfMonth(),
      periodEnd: todayIso(),
      note: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await createPayrollRun(values);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    router.push(`/payroll/${result.id}`);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-1 md:col-span-2">
        <Label>Title</Label>
        <Input {...register("title")} />
        {errors.title && (
          <p className="text-xs text-danger">{errors.title.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label>Period start</Label>
        <Input type="date" {...register("periodStart")} />
        {errors.periodStart && (
          <p className="text-xs text-danger">{errors.periodStart.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label>Period end</Label>
        <Input type="date" {...register("periodEnd")} />
        {errors.periodEnd && (
          <p className="text-xs text-danger">{errors.periodEnd.message}</p>
        )}
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label>Note (optional)</Label>
        <Input {...register("note")} placeholder="e.g. March sewing team" />
      </div>
      <div className="md:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Calculating..." : "Generate payroll"}
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
      <p className="md:col-span-2 text-xs text-muted">
        Payroll = prorated monthly base salary + (piece rate × good units in
        period). Set salaries on each employee first.
      </p>
    </form>
  );
}
