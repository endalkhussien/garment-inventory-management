"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createExpense } from "@/lib/actions/expenses";
import {
  expenseCategories,
  expenseCategoryLabels,
  expenseSchema,
  type ExpenseInput,
} from "@/lib/validations/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type BranchOption = { id: string; name: string };

export function ExpenseForm({
  branches,
  lockedBranchId,
  defaultBranchId,
}: {
  branches: BranchOption[];
  lockedBranchId?: string | null;
  defaultBranchId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      branchId: lockedBranchId ?? defaultBranchId ?? branches[0]?.id ?? "",
      category: "OTHER",
      title: "",
      amount: 0,
      expenseDate: today,
      note: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setOk(false);
    const result = await createExpense(values);
    if (!result.success) {
      setError(result.error ?? "Could not save.");
      return;
    }
    setOk(true);
    reset({
      branchId: values.branchId,
      category: "OTHER",
      title: "",
      amount: 0,
      expenseDate: today,
      note: "",
    });
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {!lockedBranchId && (
        <div className="space-y-1">
          <Label>Shop</Label>
          <Select {...register("branchId")}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Category</Label>
          <Select {...register("category")}>
            {expenseCategories.map((c) => (
              <option key={c} value={c}>
                {expenseCategoryLabels[c]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Date</Label>
          <Input type="date" {...register("expenseDate")} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Title</Label>
        <Input {...register("title")} placeholder="Shop rent March" />
        {errors.title && (
          <p className="text-xs text-danger">{errors.title.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label>Amount (ETB)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          {...register("amount", { valueAsNumber: true })}
        />
        {errors.amount && (
          <p className="text-xs text-danger">{errors.amount.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label>Note</Label>
        <Textarea rows={2} {...register("note")} />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {ok && <p className="text-sm text-success">Expense saved.</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Record expense"}
      </Button>
    </form>
  );
}
