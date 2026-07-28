"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createCapitalAsset,
  updateCapitalAsset,
} from "@/lib/actions/inventory";
import {
  ASSET_CONDITIONS,
  capitalAssetSchema,
  conditionLabels,
  type CapitalAssetInput,
} from "@/lib/validations/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Option = { id: string; name: string };

type CapitalAssetFormProps = {
  mode: "create" | "edit";
  assetId?: string;
  assetTypes: Option[];
  branches: Option[];
  defaultValues?: Partial<CapitalAssetInput>;
};

export function CapitalAssetForm({
  mode,
  assetId,
  assetTypes,
  branches,
  defaultValues,
}: CapitalAssetFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CapitalAssetInput>({
    resolver: zodResolver(capitalAssetSchema),
    defaultValues: {
      name: "",
      typeId: assetTypes[0]?.id ?? "__none__",
      typeName: assetTypes[0]?.name ?? "",
      serialNumber: "",
      purchaseDate: "",
      purchaseCost: 0,
      condition: "GOOD",
      location: "",
      branchId: "__none__",
      ...defaultValues,
    },
  });

  const typeId = watch("typeId");

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const selected = assetTypes.find((t) => t.id === values.typeId);
    const payload = {
      ...values,
      typeId: selected?.id ?? null,
      typeName: selected?.name || values.typeName,
    };
    const result =
      mode === "create"
        ? await createCapitalAsset(payload)
        : await updateCapitalAsset(assetId!, payload);

    if (!result.success) {
      setServerError(result.error ?? "Something went wrong.");
      return;
    }

    router.push(
      mode === "create"
        ? `/inventory/capital-assets/${result.id}`
        : `/inventory/capital-assets/${assetId}`,
    );
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            {...register("name")}
            placeholder="Juki DDL-8700"
          />
          {errors.name && (
            <p className="text-xs text-danger">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="typeId">Type</Label>
          <Select
            id="typeId"
            value={typeId ?? "__none__"}
            onChange={(e) => {
              const id = e.target.value;
              setValue("typeId", id === "__none__" ? null : id);
              const selected = assetTypes.find((t) => t.id === id);
              setValue("typeName", selected?.name ?? "");
            }}
          >
            <option value="__none__">Select type</option>
            {assetTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          {errors.typeName && (
            <p className="text-xs text-danger">{errors.typeName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="serialNumber">Serial number</Label>
          <Input id="serialNumber" {...register("serialNumber")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="purchaseDate">Purchase date</Label>
          <Input id="purchaseDate" type="date" {...register("purchaseDate")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="purchaseCost">Purchase cost (ETB)</Label>
          <Input
            id="purchaseCost"
            type="number"
            step="0.01"
            min="0"
            {...register("purchaseCost", { valueAsNumber: true })}
          />
          {errors.purchaseCost && (
            <p className="text-xs text-danger">{errors.purchaseCost.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="condition">Condition</Label>
          <Select id="condition" {...register("condition")}>
            {ASSET_CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {conditionLabels[c]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Assigned location</Label>
          <Input
            id="location"
            {...register("location")}
            placeholder="Line 2 / Cutting room"
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
              ? "Register asset"
              : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/inventory/capital-assets")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
