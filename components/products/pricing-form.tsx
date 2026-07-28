"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  refreshVariantCost,
  updateVariantPricing,
} from "@/lib/actions/products";
import { formatEtb } from "@/lib/format";
import {
  calculateCostBreakdown,
  marginFromPrice,
  sellingPriceFromMargin,
} from "@/lib/pricing";
import {
  pricingSchema,
  type PricingInput,
} from "@/lib/validations/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type PricingFormProps = {
  variantId: string;
  materialCost: number;
  laborCost: number;
  overheadPercent: number;
  sellingPrice: number;
  costIsStale: boolean;
};

export function PricingForm({
  variantId,
  materialCost,
  laborCost,
  overheadPercent,
  sellingPrice,
  costIsStale,
}: PricingFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const breakdown = useMemo(
    () =>
      calculateCostBreakdown({
        materialCost,
        laborCost,
        overheadPercent,
      }),
    [materialCost, laborCost, overheadPercent],
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PricingInput>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      mode: "margin",
      marginPercent: 30,
      sellingPrice,
    },
  });

  const mode = watch("mode");
  const marginPercent = watch("marginPercent") ?? 0;
  const manualPrice = watch("sellingPrice") ?? 0;

  const previewPrice =
    mode === "margin"
      ? sellingPriceFromMargin(breakdown.totalCost, marginPercent || 0)
      : manualPrice || 0;

  const previewMargin = marginFromPrice(breakdown.totalCost, previewPrice);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await updateVariantPricing(variantId, values);
    if (!result.success) {
      setServerError(result.error ?? "Could not update price.");
      return;
    }
    router.refresh();
  });

  const onRefresh = async () => {
    setRefreshing(true);
    setServerError(null);
    const result = await refreshVariantCost(variantId);
    setRefreshing(false);
    if (!result.success) {
      setServerError(result.error ?? "Could not refresh cost.");
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {costIsStale && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          <Badge variant="warning">Cost stale</Badge>
          <span className="text-muted">
            A raw material cost changed. Refresh to recalculate.
          </span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={refreshing}
            onClick={onRefresh}
          >
            {refreshing ? "Refreshing..." : "Refresh cost"}
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-page/40 p-3">
          <p className="text-xs text-muted">Material cost</p>
          <p className="mt-1 font-semibold">{formatEtb(breakdown.materialCost)}</p>
        </div>
        <div className="rounded-lg border border-border bg-page/40 p-3">
          <p className="text-xs text-muted">Labor cost</p>
          <p className="mt-1 font-semibold">{formatEtb(breakdown.laborCost)}</p>
        </div>
        <div className="rounded-lg border border-border bg-page/40 p-3">
          <p className="text-xs text-muted">
            Overhead ({breakdown.overheadPercent}%)
          </p>
          <p className="mt-1 font-semibold">
            {formatEtb(breakdown.overheadAmount)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-page/40 p-3">
          <p className="text-xs text-muted">Total cost / unit</p>
          <p className="mt-1 font-semibold text-primary">
            {formatEtb(breakdown.totalCost)}
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mode">Pricing method</Label>
            <Select id="mode" {...register("mode")}>
              <option value="margin">Cost-plus margin %</option>
              <option value="manual">Manual selling price</option>
            </Select>
          </div>
          {mode === "margin" ? (
            <div className="space-y-2">
              <Label htmlFor="marginPercent">Margin %</Label>
              <Input
                id="marginPercent"
                type="number"
                step="0.01"
                min="0"
                {...register("marginPercent", { valueAsNumber: true })}
              />
              {errors.marginPercent && (
                <p className="text-xs text-danger">
                  {errors.marginPercent.message}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling price (ETB)</Label>
              <Input
                id="sellingPrice"
                type="number"
                step="0.01"
                min="0"
                {...register("sellingPrice", { valueAsNumber: true })}
              />
              {errors.sellingPrice && (
                <p className="text-xs text-danger">
                  {errors.sellingPrice.message}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border p-3 text-sm">
          <p>
            Preview selling price:{" "}
            <span className="font-semibold text-[var(--text-primary)]">
              {formatEtb(previewPrice)}
            </span>
          </p>
          <p className="mt-1 text-muted">
            Margin: {formatEtb(previewMargin.marginEtb)} (
            {previewMargin.marginPercent.toFixed(2)}%)
          </p>
          <p className="mt-1 text-muted">
            Current saved price: {formatEtb(sellingPrice)}
          </p>
        </div>

        {serverError && <p className="text-sm text-danger">{serverError}</p>}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save selling price"}
        </Button>
      </form>
    </div>
  );
}
