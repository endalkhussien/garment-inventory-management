"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePayrollLine } from "@/lib/actions/payroll";
import {
  payrollLineAdjustSchema,
  type PayrollLineAdjustInput,
} from "@/lib/validations/payroll";

export function PayrollLineAdjustForm({
  lineId,
  bonus,
  deductions,
  note,
}: {
  lineId: string;
  bonus: number;
  deductions: number;
  note?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<PayrollLineAdjustInput>({
    resolver: zodResolver(payrollLineAdjustSchema),
    defaultValues: { lineId, bonus, deductions, note: note ?? "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await updatePayrollLine(values);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <input type="hidden" {...register("lineId")} />
      <div className="space-y-1">
        <Label className="text-xs">Bonus</Label>
        <Input
          type="number"
          step="0.01"
          className="h-8 w-24"
          {...register("bonus", { valueAsNumber: true })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Deductions</Label>
        <Input
          type="number"
          step="0.01"
          className="h-8 w-24"
          {...register("deductions", { valueAsNumber: true })}
        />
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={isSubmitting}>
        {isSubmitting ? "..." : "Update"}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
