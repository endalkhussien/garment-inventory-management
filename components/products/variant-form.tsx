"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  addProductVariant,
  updateProductVariant,
} from "@/lib/actions/products";
import {
  variantSchema,
  type VariantInput,
} from "@/lib/validations/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type VariantFormProps = {
  productId: string;
  mode: "create" | "edit";
  variantId?: string;
  defaultValues?: Partial<VariantInput>;
};

export function VariantForm({
  productId,
  mode,
  variantId,
  defaultValues,
}: VariantFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VariantInput>({
    resolver: zodResolver(variantSchema),
    defaultValues: {
      size: "",
      color: "",
      sku: "",
      buyingPrice: 0,
      sellingPrice: 0,
      ...defaultValues,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result =
      mode === "create"
        ? await addProductVariant(productId, values)
        : await updateProductVariant(variantId!, values);

    if (!result.success) {
      setServerError(result.error ?? "Could not save variant.");
      return;
    }

    if (mode === "create") {
      reset();
      router.push(`/products/${productId}/variants/${result.id}`);
    }
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="size">Size</Label>
          <Input id="size" {...register("size")} placeholder="S / M / L" />
          {errors.size && (
            <p className="text-xs text-danger">{errors.size.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <Input id="color" {...register("color")} />
          {errors.color && (
            <p className="text-xs text-danger">{errors.color.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="sku">SKU / Code</Label>
          <Input id="sku" {...register("sku")} />
          {errors.sku && (
            <p className="text-xs text-danger">{errors.sku.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="buyingPrice">Buying price (ETB)</Label>
          <Input
            id="buyingPrice"
            type="number"
            step="0.01"
            min="0"
            {...register("buyingPrice", { valueAsNumber: true })}
          />
          {errors.buyingPrice && (
            <p className="text-xs text-danger">{errors.buyingPrice.message}</p>
          )}
        </div>
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
      </div>
      {serverError && <p className="text-sm text-danger">{serverError}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? "Saving..."
          : mode === "create"
            ? "Add variant"
            : "Save variant"}
      </Button>
    </form>
  );
}
