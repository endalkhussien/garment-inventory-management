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
  shopProductWithVariantSchema,
  type ProductInput,
  type ProductWithVariantInput,
  type ShopProductWithVariantInput,
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
      /** When true: hide buying price; admin sets cost later. */
      shopMode?: boolean;
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
          <option value="">No categories</option>
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
  const shopMode = isCreate && Boolean(props.shopMode);
  const categories = props.categories;

  const createSchema = shopMode
    ? shopProductWithVariantSchema
    : productWithVariantSchema;

  const createForm = useForm<
    ProductWithVariantInput | ShopProductWithVariantInput
  >({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      code: "",
      categoryId: categories[0]?.id ?? "",
      description: "",
      garmentInfo: "",
      size: "",
      color: "",
      sku: "",
      sellingPrice: 0,
      ...(shopMode ? {} : { buyingPrice: 0 }),
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

    const buyErrors =
      "buyingPrice" in errors ? errors.buyingPrice : undefined;

    return (
      <form onSubmit={onCreate} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} placeholder="Product name" />
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
              {buyErrors && (
                <p className="text-xs text-danger">{buyErrors.message}</p>
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
          <div className="space-y-2">
            <Label htmlFor="size">Size (optional)</Label>
            <Input id="size" {...register("size")} placeholder="S / M / L" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Color (optional)</Label>
            <Input id="color" {...register("color")} />
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
        {shopMode && (
          <p className="text-xs text-muted">
            Cost price is set by admin. Enter sell price only.
          </p>
        )}
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
