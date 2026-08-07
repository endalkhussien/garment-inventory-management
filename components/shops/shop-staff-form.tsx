"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { Select } from "@/components/ui/select";

export function ShopStaffForm({
  mode,
  staffId,
  branchId,
  defaultValues,
  redirectTo,
}: {
  mode: "create" | "edit";
  staffId?: string;
  branchId?: string | null;
  defaultValues?: Partial<ShopStaffInput>;
  /** Where to go after a successful create/update */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
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
      commissionMode: "PERCENT_OF_REVENUE",
      pieceRatePerUnit: 0,
      commissionPercent: 0,
      ...defaultValues,
    },
  });

  const commissionMode = useWatch({ control, name: "commissionMode" });
  const isPerPiece = commissionMode === "PER_PIECE";

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

    if (redirectTo) {
      router.push(redirectTo);
      router.refresh();
      return;
    }

    if (mode === "create") {
      reset({
        name: "",
        phone: "",
        jobTitle: "",
        code: "",
        monthlyBaseSalary: 0,
        commissionMode: "PERCENT_OF_REVENUE",
        pieceRatePerUnit: 0,
        commissionPercent: 0,
      });
    }
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="staff-name">Full name</Label>
          <Input
            id="staff-name"
            {...register("name")}
            placeholder="Abebe Kebede"
            autoComplete="name"
          />
          {errors.name && (
            <p className="text-xs text-danger">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="staff-job">Job title</Label>
          <Input
            id="staff-job"
            {...register("jobTitle")}
            placeholder="Sales associate"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="staff-phone">Phone</Label>
          <Input
            id="staff-phone"
            type="tel"
            {...register("phone")}
            placeholder="+251 …"
            autoComplete="tel"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="staff-code">Staff code</Label>
          <Input
            id="staff-code"
            {...register("code")}
            placeholder="S01"
            className="font-data"
          />
          <p className="text-xs text-muted">Optional · must be unique if set</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="staff-salary">Monthly salary (ETB)</Label>
          <Input
            id="staff-salary"
            type="number"
            step="0.01"
            min={0}
            className="font-data"
            {...register("monthlyBaseSalary", { valueAsNumber: true })}
          />
          {errors.monthlyBaseSalary && (
            <p className="text-xs text-danger">
              {errors.monthlyBaseSalary.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="staff-commission-mode">Commission type</Label>
          <Select id="staff-commission-mode" {...register("commissionMode")}>
            <option value="PERCENT_OF_REVENUE">% of sales revenue</option>
            <option value="PER_PIECE">ETB per piece sold</option>
          </Select>
          <p className="text-xs text-muted">
            Applied to this shop&apos;s period sales (not per cashier)
          </p>
        </div>
        {isPerPiece ? (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="staff-piece-rate">Rate (ETB per piece)</Label>
            <Input
              id="staff-piece-rate"
              type="number"
              step="0.01"
              min={0}
              className="font-data"
              {...register("pieceRatePerUnit", { valueAsNumber: true })}
            />
            {errors.pieceRatePerUnit && (
              <p className="text-xs text-danger">
                {errors.pieceRatePerUnit.message}
              </p>
            )}
            <p className="text-xs text-muted">
              Commission = units sold at the shop × this rate
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="staff-commission">Commission %</Label>
            <Input
              id="staff-commission"
              type="number"
              step="0.01"
              min={0}
              max={100}
              className="font-data"
              {...register("commissionPercent", { valueAsNumber: true })}
            />
            {errors.commissionPercent && (
              <p className="text-xs text-danger">
                {errors.commissionPercent.message}
              </p>
            )}
            <p className="text-xs text-muted">
              Commission = shop sales revenue × this percent
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-[var(--error-container)] px-3 py-2 text-sm text-[var(--on-error-container)]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" variant="action" disabled={isSubmitting}>
          {isSubmitting
            ? "Saving…"
            : mode === "create"
              ? "Add staff member"
              : "Save changes"}
        </Button>
        {mode === "edit" && redirectTo && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(redirectTo)}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
