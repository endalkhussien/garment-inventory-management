"use client";

import { useRouter } from "next/navigation";
import { useState, type ComponentProps } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createProductWithVariant,
  updateProduct,
} from "@/lib/actions/products";
import {
  productSchema,
  productWithVariantSchema,
  type ProductInput,
  type ProductWithVariantInput,
} from "@/lib/validations/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Option = { id: string; name: string };

type ProductFormProps =
  | {
      mode: "create";
      categories: Option[];
    }
  | {
      mode: "edit";
      productId: string;
      categories: Option[];
      defaultValues: ProductInput;
    };

function CategorySelect({
  categories,
  error,
  selectProps,
}: {
  categories: Option[];
  error?: string;
  selectProps: ComponentProps<typeof Select>;
}) {
  return (
    <div className="space-y-2">
      <Label>Category</Label>
      <Select {...selectProps}>
        {categories.length === 0 ? (
          <option value="">Create categories in Setup first</option>
        ) : (
          categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))
        )}
      </Select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function ProductForm(props: ProductFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isCreate = props.mode === "create";
  const categories = props.categories;

  const createForm = useForm<ProductWithVariantInput>({
    resolver: zodResolver(productWithVariantSchema),
    defaultValues: {
      name: "",
      code: "",
      categoryId: categories[0]?.id ?? "",
      description: "",
      garmentInfo: "",
      size: "M",
      color: "Navy",
      sku: "",
      buyingPrice: 0,
      sellingPrice: 0,
    },
  });

  const editForm = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues:
      props.mode === "edit"
        ? props.defaultValues
        : {
            name: "",
            code: "",
            categoryId: categories[0]?.id ?? "",
            description: "",
            garmentInfo: "",
          },
  });

  const onCreate = createForm.handleSubmit(async (values) => {
    setServerError(null);
    const result = await createProductWithVariant(values);
    if (!result.success) {
      setServerError(result.error ?? "Could not create product.");
      return;
    }
    router.push(`/products/${result.id}`);
    router.refresh();
  });

  const onEdit = editForm.handleSubmit(async (values) => {
    if (props.mode !== "edit") return;
    setServerError(null);
    const result = await updateProduct(props.productId, values);
    if (!result.success) {
      setServerError(result.error ?? "Could not update product.");
      return;
    }
    router.refresh();
  });

  if (isCreate) {
    const {
      register,
      formState: { errors, isSubmitting },
    } = createForm;

    return (
      <form onSubmit={onCreate} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Product name"
            />
            {errors.name && (
              <p className="text-xs text-danger">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              {...register("code")}
              placeholder="MCS-001"
              className="uppercase"
            />
            {errors.code && (
              <p className="text-xs text-danger">{errors.code.message}</p>
            )}
          </div>
          <CategorySelect
            categories={categories}
            selectProps={register("categoryId")}
            error={errors.categoryId?.message}
          />
          <div className="space-y-2">
            <Label htmlFor="buyingPrice">Buy (ETB)</Label>
            <Input
              id="buyingPrice"
              type="number"
              step="0.01"
              min="0"
              {...register("buyingPrice", { valueAsNumber: true })}
            />
            {errors.buyingPrice && (
              <p className="text-xs text-danger">
                {errors.buyingPrice.message}
              </p>
            )}
          </div>
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
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" {...register("sku")} placeholder="Optional" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="garmentInfo">Notes</Label>
            <Input
              id="garmentInfo"
              {...register("garmentInfo")}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Details</Label>
            <Textarea id="description" rows={2} {...register("description")} />
          </div>
        </div>
        {serverError && <p className="text-sm text-danger">{serverError}</p>}
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={isSubmitting || categories.length === 0}
          >
            {isSubmitting ? "Saving…" : "Create"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/products")}
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  const {
    register,
    formState: { errors, isSubmitting },
  } = editForm;

  return (
    <form onSubmit={onEdit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register("name")} />
          {errors.name && (
            <p className="text-xs text-danger">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">Code</Label>
          <Input id="code" {...register("code")} className="uppercase" />
          {errors.code && (
            <p className="text-xs text-danger">{errors.code.message}</p>
          )}
        </div>
        <CategorySelect
          categories={categories}
          selectProps={register("categoryId")}
          error={errors.categoryId?.message}
        />
        <div className="space-y-2">
          <Label htmlFor="garmentInfo">Notes</Label>
          <Input id="garmentInfo" {...register("garmentInfo")} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Details</Label>
          <Textarea id="description" rows={2} {...register("description")} />
        </div>
      </div>
      {serverError && <p className="text-sm text-danger">{serverError}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
