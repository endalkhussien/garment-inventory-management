"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createSale } from "@/lib/actions/sales";
import { formatEtb } from "@/lib/format";
import {
  PAYMENT_METHODS,
  paymentMethodLabels,
  saleSchema,
  type SaleInput,
} from "@/lib/validations/sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type VariantOption = {
  id: string;
  label: string;
  sellingPrice: number;
  stockByBranch: Record<string, number>;
};

export function PosSaleForm({
  branches,
  variants,
  defaultBranchId,
}: {
  branches: { id: string; name: string }[];
  variants: VariantOption[];
  defaultBranchId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<SaleInput>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      branchId: defaultBranchId ?? branches[0]?.id ?? "",
      variantId: variants[0]?.id ?? "",
      quantity: 1,
      unitPrice: variants[0]?.sellingPrice ?? 0,
      paymentMethod: "CASH",
      customerName: "",
    },
  });

  const branchId = watch("branchId");
  const variantId = watch("variantId");
  const quantity = watch("quantity") || 0;
  const unitPrice = watch("unitPrice") || 0;

  const selected = useMemo(
    () => variants.find((v) => v.id === variantId),
    [variants, variantId],
  );

  useEffect(() => {
    if (selected) {
      setValue("unitPrice", selected.sellingPrice);
    }
  }, [selected, setValue]);

  const available = selected?.stockByBranch[branchId] ?? 0;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setReceipt(null);
    const result = await createSale(values);
    if (!result.success) {
      setError(result.error ?? "Sale failed");
      return;
    }
    setReceipt(result.id ?? "ok");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Shop</Label>
          <Select {...register("branchId")}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Product</Label>
          <Select {...register("variantId")}>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted">Available here: {available}</p>
        </div>
        <div className="space-y-2">
          <Label>Quantity</Label>
          <Input
            type="number"
            min={1}
            {...register("quantity", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <Label>Unit price (editable)</Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            {...register("unitPrice", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <Label>Payment</Label>
          <Select {...register("paymentMethod")}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {paymentMethodLabels[m]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Customer name (optional)</Label>
          <Input
            {...register("customerName")}
            placeholder="Leave blank for walk-in"
          />
        </div>
      </div>

      <p className="text-sm">
        Total:{" "}
        <span className="font-semibold text-primary">
          {formatEtb(quantity * unitPrice)}
        </span>
      </p>

      {error && <p className="text-sm text-danger">{error}</p>}
      {receipt && (
        <p className="text-sm text-success">
          Sale saved.{" "}
          <a className="text-secondary underline" href={`/sales/${receipt}`}>
            View receipt
          </a>
        </p>
      )}

      <Button
        type="submit"
        className="w-full sm:w-auto"
        disabled={isSubmitting || variants.length === 0}
      >
        {isSubmitting ? "Processing..." : "Complete sale"}
      </Button>
    </form>
  );
}
