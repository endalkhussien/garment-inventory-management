"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createRawMaterial,
  updateRawMaterial,
} from "@/lib/actions/inventory";
import {
  rawMaterialSchema,
  type RawMaterialInput,
} from "@/lib/validations/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Option = { id: string; name: string };

type RawMaterialFormProps = {
  mode: "create" | "edit";
  materialId?: string;
  categories: Option[];
  suppliers: Option[];
  branches: Option[];
  defaultValues?: Partial<RawMaterialInput>;
};

export function RawMaterialForm({
  mode,
  materialId,
  categories,
  suppliers,
  branches,
  defaultValues,
}: RawMaterialFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RawMaterialInput>({
    resolver: zodResolver(rawMaterialSchema),
    defaultValues: {
      name: "",
      code: "",
      categoryId: categories[0]?.id ?? "",
      unitOfMeasure: "kg",
      supplierId: "__none__",
      costPerUnit: 0,
      reorderThreshold: 0,
      quantity: 0,
      location: "",
      branchId: "__none__",
      ...defaultValues,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result =
      mode === "create"
        ? await createRawMaterial(values)
        : await updateRawMaterial(materialId!, values);

    if (!result.success) {
      setServerError(result.error ?? "Something went wrong.");
      return;
    }

    router.push(
      mode === "create"
        ? `/inventory/raw-materials/${result.id}`
        : `/inventory/raw-materials/${materialId}`,
    );
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register("name")} placeholder="Cotton yarn 30/1" />
          {errors.name && (
            <p className="text-xs text-danger">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">Material code (optional)</Label>
          <Input id="code" {...register("code")} placeholder="FAB-COT-001" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="categoryId">Category</Label>
          <Select id="categoryId" {...register("categoryId")}>
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
          {errors.categoryId && (
            <p className="text-xs text-danger">{errors.categoryId.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="unitOfMeasure">Unit of measure</Label>
          <Input
            id="unitOfMeasure"
            {...register("unitOfMeasure")}
            placeholder="kg, m, pcs"
          />
          {errors.unitOfMeasure && (
            <p className="text-xs text-danger">{errors.unitOfMeasure.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplierId">Supplier</Label>
          <Select id="supplierId" {...register("supplierId")}>
            <option value="__none__">No supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="costPerUnit">Cost per unit (ETB)</Label>
          <Input
            id="costPerUnit"
            type="number"
            step="0.01"
            min="0"
            {...register("costPerUnit", { valueAsNumber: true })}
          />
          {errors.costPerUnit && (
            <p className="text-xs text-danger">{errors.costPerUnit.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="reorderThreshold">Reorder threshold</Label>
          <Input
            id="reorderThreshold"
            type="number"
            step="0.001"
            min="0"
            {...register("reorderThreshold", { valueAsNumber: true })}
          />
          {errors.reorderThreshold && (
            <p className="text-xs text-danger">
              {errors.reorderThreshold.message}
            </p>
          )}
        </div>
        {mode === "create" && (
          <div className="space-y-2">
            <Label htmlFor="quantity">Opening quantity</Label>
            <Input
              id="quantity"
              type="number"
              step="0.001"
              min="0"
              {...register("quantity", { valueAsNumber: true })}
            />
            {errors.quantity && (
              <p className="text-xs text-danger">{errors.quantity.message}</p>
            )}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            {...register("location")}
            placeholder="Warehouse A / Shelf 3"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="branchId">Branch</Label>
          <Select id="branchId" {...register("branchId")}>
            <option value="__none__">Unassigned</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {serverError && <p className="text-sm text-danger">{serverError}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Saving..."
            : mode === "create"
              ? "Create material"
              : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/inventory/raw-materials")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
