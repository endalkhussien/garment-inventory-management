"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createShopStaff,
  updateShopStaff,
} from "@/lib/actions/shop-staff";
import {
  shopStaffSchema,
  type ShopStaffInput,
} from "@/lib/validations/shop-staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ShopStaffForm({
  mode,
  staffId,
  branchId,
  defaultValues,
}: {
  mode: "create" | "edit";
  staffId?: string;
  branchId?: string | null;
  defaultValues?: Partial<ShopStaffInput>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShopStaffInput>({
    resolver: zodResolver(shopStaffSchema),
    defaultValues: {
      name: "",
      phone: "",
      jobTitle: "",
      code: "",
      monthlyBaseSalary: 0,
      commissionPercent: 0,
      ...defaultValues,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result =
      mode === "create"
        ? await createShopStaff({
            ...values,
            branchId: branchId ?? undefined,
          })
        : await updateShopStaff(staffId!, values);

    if (!result.success) {
      setError(result.error ?? "Could not save.");
      return;
    }
    if (mode === "create") {
      reset({
        name: "",
        phone: "",
        jobTitle: "",
        code: "",
        monthlyBaseSalary: 0,
        commissionPercent: 0,
      });
    }
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Full name</Label>
          <Input {...register("name")} placeholder="Abebe Kebede" />
          {errors.name && (
            <p className="text-xs text-danger">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label>Job title</Label>
          <Input {...register("jobTitle")} placeholder="Sales associate" />
        </div>
        <div className="space-y-1">
          <Label>Phone</Label>
          <Input {...register("phone")} />
        </div>
        <div className="space-y-1">
          <Label>Staff code (optional)</Label>
          <Input {...register("code")} placeholder="S01" />
        </div>
        <div className="space-y-1">
          <Label>Monthly salary (ETB)</Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            {...register("monthlyBaseSalary", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-1">
          <Label>Commission %</Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            max={100}
            {...register("commissionPercent", { valueAsNumber: true })}
          />
          <p className="text-xs text-muted">
            Of shop sales in the finance period (estimate).
          </p>
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? "Saving..."
          : mode === "create"
            ? "Add staff"
            : "Save changes"}
      </Button>
    </form>
  );
}
