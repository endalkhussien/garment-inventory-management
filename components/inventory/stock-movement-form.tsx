"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { requestOrApplyStockOut } from "@/lib/actions/approvals";
import { recordStockMovement } from "@/lib/actions/inventory";
import {
  STOCK_REASON_CODES,
  reasonCodeLabels,
  stockMovementSchema,
  type StockMovementInput,
} from "@/lib/validations/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type StockMovementFormProps = {
  rawMaterialId: string;
  unitOfMeasure: string;
  currentQuantity: number;
  branches?: { id: string; name: string }[];
  defaultBranchId?: string | null;
};

export function StockMovementForm({
  rawMaterialId,
  unitOfMeasure,
  currentQuantity,
  branches = [],
  defaultBranchId,
}: StockMovementFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StockMovementInput>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: {
      rawMaterialId,
      type: "IN",
      quantity: 1,
      reasonCode: "PURCHASE",
      note: "",
      branchId: defaultBranchId ?? "__none__",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSuccessMessage(null);

    const payload = { ...values, rawMaterialId };
    const result =
      values.type === "OUT"
        ? await requestOrApplyStockOut(payload)
        : await recordStockMovement(payload);

    if (!result.success) {
      setServerError(result.error ?? "Stock update failed.");
      return;
    }

    setSuccessMessage(
      "pendingApproval" in result && result.pendingApproval
        ? "Large stock-out sent for approval — stock unchanged until approved."
        : "Stock updated successfully.",
    );
    reset({
      rawMaterialId,
      type: "IN",
      quantity: 1,
      reasonCode: "PURCHASE",
      note: "",
      branchId: defaultBranchId ?? "__none__",
    });
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-muted">
        Current stock (all locations):{" "}
        <span className="font-medium text-[var(--text-primary)]">
          {currentQuantity.toLocaleString("en-ET", { maximumFractionDigits: 3 })}{" "}
          {unitOfMeasure}
        </span>
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">Movement</Label>
          <Select id="type" {...register("type")}>
            <option value="IN">Stock in</option>
            <option value="OUT">Stock out</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity ({unitOfMeasure})</Label>
          <Input
            id="quantity"
            type="number"
            step="0.001"
            min="0.001"
            {...register("quantity", { valueAsNumber: true })}
          />
          {errors.quantity && (
            <p className="text-xs text-danger">{errors.quantity.message}</p>
          )}
        </div>
        {branches.length > 0 && (
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="branchId">Branch / location</Label>
            <Select id="branchId" {...register("branchId")}>
              <option value="__none__">Default (material branch / warehouse)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="reasonCode">Reason code</Label>
          <Select id="reasonCode" {...register("reasonCode")}>
            {STOCK_REASON_CODES.map((code) => (
              <option key={code} value={code}>
                {reasonCodeLabels[code]}
              </option>
            ))}
          </Select>
          {errors.reasonCode && (
            <p className="text-xs text-danger">{errors.reasonCode.message}</p>
          )}
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="note">Note (optional)</Label>
          <Textarea id="note" rows={2} {...register("note")} />
        </div>
      </div>

      {serverError && <p className="text-sm text-danger">{serverError}</p>}
      {successMessage && (
        <p className="text-sm text-success">{successMessage}</p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Updating..." : "Record movement"}
      </Button>
    </form>
  );
}
