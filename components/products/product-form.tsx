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
      defaultOverheadPercent?: number;
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
  const defaultOverhead =
    props.mode === "create" ? (props.defaultOverheadPercent ?? 10) : 10;

  const createForm = useForm<ProductWithVariantInput>({
    resolver: zodResolver(productWithVariantSchema),
    defaultValues: {
      name: "",
      categoryId: categories[0]?.id ?? "",
      description: "",
      size: "M",
      color: "Navy",
      sku: "",
      laborCostPerUnit: 0,
      overheadPercent: defaultOverhead,
    },
  });

  const editForm = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues:
      props.mode === "edit"
        ? props.defaultValues
        : { name: "", categoryId: categories[0]?.id ?? "", description: "" },
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
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Product name</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Men's Crew Neck Sweater"
            />
            {errors.name && (
              <p className="text-xs text-danger">{errors.name.message}</p>
            )}
          </div>
          <CategorySelect
            categories={categories}
            selectProps={register("categoryId")}
            error={errors.categoryId?.message}
          />
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={2} {...register("description")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="size">First variant size</Label>
            <Input id="size" {...register("size")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">First variant color</Label>
            <Input id="color" {...register("color")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" {...register("sku")} placeholder="MCS-M-NAVY" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="laborCostPerUnit">Labor cost / unit (ETB)</Label>
            <Input
              id="laborCostPerUnit"
              type="number"
              step="0.01"
              min="0"
              {...register("laborCostPerUnit", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="overheadPercent">Overhead %</Label>
            <Input
              id="overheadPercent"
              type="number"
              step="0.01"
              min="0"
              {...register("overheadPercent", { valueAsNumber: true })}
            />
          </div>
        </div>
        {serverError && <p className="text-sm text-danger">{serverError}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting || categories.length === 0}>
            {isSubmitting ? "Creating..." : "Create product"}
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
          <Label htmlFor="name">Product name</Label>
          <Input id="name" {...register("name")} />
          {errors.name && (
            <p className="text-xs text-danger">{errors.name.message}</p>
          )}
        </div>
        <CategorySelect
          categories={categories}
          selectProps={register("categoryId")}
          error={errors.categoryId?.message}
        />
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={2} {...register("description")} />
        </div>
      </div>
      {serverError && <p className="text-sm text-danger">{serverError}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save product"}
      </Button>
    </form>
  );
}
