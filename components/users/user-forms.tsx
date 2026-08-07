"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  createShopLogin,
  createUser,
  deleteUser,
  setUserActive,
  updateShopLogin,
  updateUser,
} from "@/lib/actions/users";
import {
  createUserSchema,
  shopLoginSchema,
  updateShopLoginSchema,
  updateUserSchema,
  type CreateUserInput,
  type ShopLoginInput,
  type UpdateShopLoginInput,
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
    if (result.id) {
      router.push(`/users/${result.id}`);
    }
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
        <Input
          {...register("username")}
          placeholder="bole_shop"
          autoComplete="off"
        />
        {errors.username && (
          <p className="text-xs text-danger">{errors.username.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label>Email (optional)</Label>
        <Input
          type="email"
          {...register("email")}
          placeholder="Leave blank if not needed"
        />
        {errors.email && (
          <p className="text-xs text-danger">{errors.email.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label>Password</Label>
        <Input
          type="password"
          {...register("password")}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted">Min 8 characters, letter + number</p>
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
        <Label>Shop / branch (required for Shop role)</Label>
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
  isProtectedAdmin = false,
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
  /** When true, role/status may be locked to protect Admin accounts in UI hints */
  isProtectedAdmin?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
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
    setOk(null);
    const result = await updateUser(user.id, {
      ...values,
      isActive: values.isActive === "true",
    });
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    setOk(
      values.password?.trim()
        ? "Saved. Password was updated."
        : "User details saved.",
    );
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
        <Label>Username (login)</Label>
        <Input {...register("username")} autoComplete="off" />
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
        {isProtectedAdmin && (
          <p className="text-xs text-muted">
            Last active Admin cannot be demoted or deactivated.
          </p>
        )}
      </div>
      <div className="space-y-1">
        <Label>Shop / branch</Label>
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
        <Label>New password (optional)</Label>
        <Input
          type="password"
          {...register("password")}
          placeholder="Leave blank to keep current password"
          autoComplete="new-password"
        />
        <p className="text-xs text-muted">
          Set a new password to reset shop or staff login access.
        </p>
        {errors.password && (
          <p className="text-xs text-danger">{errors.password.message}</p>
        )}
      </div>
      <div className="md:col-span-2 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save changes"}
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
        {ok && <p className="text-sm text-success">{ok}</p>}
      </div>
    </form>
  );
}

export function UserLifecycleActions({
  userId,
  isActive,
  canDelete,
  userLabel,
}: {
  userId: string;
  isActive: boolean;
  canDelete: boolean;
  userLabel: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function toggleActive() {
    setPending(true);
    setError(null);
    const result = await setUserActive(userId, !isActive);
    setPending(false);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    router.refresh();
  }

  async function onDelete() {
    if (
      !window.confirm(
        `Permanently delete ${userLabel}? Admin accounts cannot be deleted.`,
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await deleteUser(userId);
    setPending(false);
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    router.push("/users");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() => void toggleActive()}
      >
        {isActive ? "Deactivate" : "Activate"}
      </Button>
      {canDelete && (
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() => void onDelete()}
        >
          Delete
        </Button>
      )}
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </div>
  );
}

/** Create a Shop-role login for a specific shop (on shop detail page). */
export function CreateShopLoginForm({
  branchId,
  shopName,
}: {
  branchId: string;
  shopName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShopLoginInput>({
    resolver: zodResolver(shopLoginSchema),
    defaultValues: {
      branchId,
      name: "",
      username: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await createShopLogin({ ...values, branchId });
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    reset({ branchId, name: "", username: "", password: "" });
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
      <p className="md:col-span-2 text-xs text-muted">
        New login for <strong>{shopName}</strong> (Shop role).
      </p>
      <div className="space-y-1">
        <Label>Display name</Label>
        <Input {...register("name")} placeholder="Bole cashier" />
        {errors.name && (
          <p className="text-xs text-danger">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label>Username</Label>
        <Input {...register("username")} autoComplete="off" />
        {errors.username && (
          <p className="text-xs text-danger">{errors.username.message}</p>
        )}
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label>Password</Label>
        <Input
          type="password"
          {...register("password")}
          autoComplete="new-password"
        />
        {errors.password && (
          <p className="text-xs text-danger">{errors.password.message}</p>
        )}
      </div>
      <div className="md:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Add shop login"}
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </form>
  );
}

/** Admin updates shop user name, username, status, password. */
export function EditShopLoginForm({
  user,
}: {
  user: {
    id: string;
    name: string | null;
    username: string | null;
    isActive: boolean;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateShopLoginInput>({
    resolver: zodResolver(updateShopLoginSchema),
    defaultValues: {
      name: user.name ?? "",
      username: user.username ?? "",
      isActive: user.isActive ? "true" : "false",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setOk(null);
    const result = await updateShopLogin(user.id, {
      ...values,
      isActive: values.isActive === "true",
    });
    if (!result.success) {
      setError(result.error ?? "Failed");
      return;
    }
    setOk(
      values.password?.trim()
        ? "Saved. Password was updated."
        : "Shop login saved.",
    );
    setOpen(false);
    router.refresh();
  });

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setOpen(true)}
        >
          Edit / reset password
        </Button>
        <Link
          href={`/users/${user.id}`}
          className="text-xs text-secondary hover:underline"
        >
          Full user page
        </Link>
        {ok && <span className="text-xs text-success">{ok}</span>}
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-2 grid gap-2 rounded-xl border border-border bg-page/40 p-3 md:grid-cols-2"
    >
      <div className="space-y-1">
        <Label>Display name</Label>
        <Input {...register("name")} />
        {errors.name && (
          <p className="text-xs text-danger">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label>Username</Label>
        <Input {...register("username")} autoComplete="off" />
        {errors.username && (
          <p className="text-xs text-danger">{errors.username.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <Label>Status</Label>
        <Select {...register("isActive")}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>New password (optional)</Label>
        <Input
          type="password"
          {...register("password")}
          placeholder="Leave blank to keep"
          autoComplete="new-password"
        />
        {errors.password && (
          <p className="text-xs text-danger">{errors.password.message}</p>
        )}
      </div>
      <div className="md:col-span-2 flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save login"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </form>
  );
}
