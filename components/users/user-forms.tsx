"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createUser, updateUser } from "@/lib/actions/users";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/lib/validations/users";

type Option = { id: string; name: string };

export function CreateUserForm({
  roles,
  branches,
  defaultBranchId,
  defaultRoleName,
}: {
  roles: Option[];
  branches: Option[];
  defaultBranchId?: string;
  defaultRoleName?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const preferredRoleId =
    roles.find((r) => r.name === defaultRoleName)?.id ?? roles[0]?.id ?? "";
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      roleId: preferredRoleId,
      branchId: defaultBranchId ?? "__none__",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await createUser(values);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    reset();
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1">
        <Label>Display name</Label>
        <Input {...register("name")} placeholder="Sara" />
        {errors.name && (
          <p className="text-xs text-danger">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label>Username (for login)</Label>
        <Input {...register("username")} placeholder="bole_shop" autoComplete="off" />
        {errors.username && (
          <p className="text-xs text-danger">{errors.username.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label>Email (optional)</Label>
        <Input type="email" {...register("email")} placeholder="Leave blank if not needed" />
        {errors.email && (
          <p className="text-xs text-danger">{errors.email.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label>Password</Label>
        <Input type="password" {...register("password")} autoComplete="new-password" />
        {errors.password && (
          <p className="text-xs text-danger">{errors.password.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label>Role</Label>
        <Select {...register("roleId")}>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Branch (required for Shop)</Label>
        <Select {...register("branchId")}>
          <option value="__none__">None (Admin / HQ)</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="md:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create user"}
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </form>
  );
}

export function EditUserForm({
  user,
  roles,
  branches,
}: {
  user: {
    id: string;
    name: string | null;
    username: string | null;
    roleId: string;
    branchId: string | null;
    isActive: boolean;
  };
  roles: Option[];
  branches: Option[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: user.name ?? "",
      username: user.username ?? "",
      roleId: user.roleId,
      branchId: user.branchId ?? "__none__",
      isActive: user.isActive ? "true" : "false",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await updateUser(user.id, {
      ...values,
      isActive: values.isActive === "true",
    });
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    router.push("/users");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1">
        <Label>Display name</Label>
        <Input {...register("name")} />
        {errors.name && (
          <p className="text-xs text-danger">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label>Username</Label>
        <Input {...register("username")} />
        {errors.username && (
          <p className="text-xs text-danger">{errors.username.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label>Role</Label>
        <Select {...register("roleId")}>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Branch</Label>
        <Select {...register("branchId")}>
          <option value="__none__">None (Admin / HQ)</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Status</Label>
        <Select {...register("isActive")}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Reset password (optional)</Label>
        <Input
          type="password"
          {...register("password")}
          placeholder="Leave blank to keep"
          autoComplete="new-password"
        />
      </div>
      <div className="md:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save user"}
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </form>
  );
}
