"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createEmployee, updateEmployee } from "@/lib/actions/production";
import {
  employeeSchema,
  type EmployeeInput,
} from "@/lib/validations/production";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type EmployeeFormProps = {
  branches: { id: string; name: string }[];
  employee?: {
    id: string;
    name: string;
    code?: string | null;
    phone?: string | null;
    branchId?: string | null;
    hireDate?: Date | null;
    monthlyBaseSalary?: number;
    pieceRatePerUnit?: number;
  };
};

export function EmployeeForm({ branches, employee }: EmployeeFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!employee;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeInput>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: employee?.name ?? "",
      code: employee?.code ?? "",
      phone: employee?.phone ?? "",
      branchId: employee?.branchId ?? "__none__",
      hireDate: employee?.hireDate
        ? employee.hireDate.toISOString().slice(0, 10)
        : "",
      monthlyBaseSalary: employee?.monthlyBaseSalary ?? 0,
      pieceRatePerUnit: employee?.pieceRatePerUnit ?? 0,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = isEdit
      ? await updateEmployee(employee.id, values)
      : await createEmployee(values);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    if (!isEdit) reset();
    router.refresh();
    if (isEdit) router.push(`/production/employees/${employee.id}`);
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-3">
      <div className="space-y-1">
        <Label>Name</Label>
        <Input {...register("name")} placeholder="Worker name" />
        {errors.name && (
          <p className="text-xs text-danger">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label>Code (optional)</Label>
        <Input {...register("code")} placeholder="E-01" />
      </div>
      <div className="space-y-1">
        <Label>Phone (optional)</Label>
        <Input {...register("phone")} />
      </div>
      <div className="space-y-1">
        <Label>Branch</Label>
        <Select {...register("branchId")}>
          <option value="__none__">Any / HQ</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Hire date</Label>
        <Input type="date" {...register("hireDate")} />
      </div>
      <div className="space-y-1">
        <Label>Monthly base salary (ETB)</Label>
        <Input
          type="number"
          step="0.01"
          {...register("monthlyBaseSalary", { valueAsNumber: true })}
        />
      </div>
      <div className="space-y-1">
        <Label>Piece rate per good unit (ETB)</Label>
        <Input
          type="number"
          step="0.01"
          {...register("pieceRatePerUnit", { valueAsNumber: true })}
        />
      </div>
      <div className="md:col-span-3 flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Saving..."
            : isEdit
              ? "Save employee"
              : "Add employee"}
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </form>
  );
}
