"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { transferFinishedGoods } from "@/lib/actions/sales";
import {
  transferSchema,
  type TransferInput,
} from "@/lib/validations/sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Option = { id: string; label: string };

export function TransferForm({
  variants,
  branches,
  defaultFromId,
}: {
  variants: Option[];
  branches: Option[];
  defaultFromId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<TransferInput>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      variantId: variants[0]?.id ?? "",
      fromBranchId: defaultFromId ?? branches[0]?.id ?? "",
      toBranchId: branches[1]?.id ?? branches[0]?.id ?? "",
      quantity: 1,
      note: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await transferFinishedGoods(values);
    if (!result.success) {
      setError(result.error ?? "Transfer failed");
      return;
    }
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1 md:col-span-2">
        <Label>Product</Label>
        <Select {...register("variantId")}>
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label>From</Label>
        <Select {...register("fromBranchId")}>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label>To shop</Label>
        <Select {...register("toBranchId")}>
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
          type="number"
          min={1}
          {...register("quantity", { valueAsNumber: true })}
        />
      </div>
      <div className="space-y-1">
        <Label>Note (optional)</Label>
        <Input {...register("note")} />
      </div>
      <div className="md:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Moving..." : "Transfer stock"}
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </form>
  );
}
