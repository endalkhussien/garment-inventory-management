"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  addProductVariant,
  updateProductVariant,
} from "@/lib/actions/products";
import {
  shopVariantSchema,
  variantSchema,
  type ShopVariantInput,
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
  /** Hide buying price / margin fields. */
  shopMode?: boolean;
};

export function VariantForm({
  productId,
  mode,
  variantId,
  defaultValues,
  shopMode = false,
}: VariantFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  type FormValues = VariantInput | ShopVariantInput;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(
      shopMode ? shopVariantSchema : variantSchema,
    ) as Resolver<FormValues>,
    defaultValues: {
      size: "",
      color: "",
      sku: "",
      sellingPrice: 0,
      ...(shopMode ? {} : { buyingPrice: 0 }),
      ...defaultValues,
    },
  });

  const onSubmit = handleSubmit(async (values: FormValues) => {
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

  const buyError =
    "buyingPrice" in errors ? errors.buyingPrice : undefined;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="size">Size (optional)</Label>
          <Input id="size" {...register("size")} placeholder="S / M / L" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="color">Color (optional)</Label>
          <Input id="color" {...register("color")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sku">SKU / Code</Label>
          <Input id="sku" {...register("sku")} />
          {errors.sku && (
            <p className="text-xs text-danger">{errors.sku.message}</p>
          )}
        </div>
        {!shopMode && (
          <div className="space-y-2">
            <Label htmlFor="buyingPrice">Buy (ETB)</Label>
            <Input
              id="buyingPrice"
              type="number"
              step="0.01"
              min="0"
              {...register("buyingPrice", { valueAsNumber: true })}
            />
            {buyError && (
              <p className="text-xs text-danger">{buyError.message}</p>
            )}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="sellingPrice">Sell (ETB)</Label>
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
      {shopMode && (
        <p className="text-xs text-muted">
          Cost price is managed by admin.
        </p>
      )}
      {serverError && <p className="text-sm text-danger">{serverError}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? "Saving…"
          : mode === "create"
            ? "Add variant"
            : "Save"}
      </Button>
    </form>
  );
}
