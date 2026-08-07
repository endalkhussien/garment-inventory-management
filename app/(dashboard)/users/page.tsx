import Link from "next/link";

import {
  CreateUserForm,
  UserLifecycleActions,
} from "@/components/users/user-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function UsersPage({
  searchParams,
}: {
  searchParams?: { branchId?: string };
}) {
  await requireAdmin();

  const [users, roles, branches] = await Promise.all([
    prisma.user.findMany({
      include: { role: true, branch: true },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const defaultBranchId = searchParams?.branchId;
  const preselectShop = Boolean(
    defaultBranchId &&
      branches.some((b) => b.id === defaultBranchId && b.isShop),
  );

  const shopUsers = users.filter((u) => u.role.name === "Shop");
  const adminUsers = users.filter((u) => u.role.name === "Admin");
  const otherUsers = users.filter(
    (u) => u.role.name !== "Shop" && u.role.name !== "Admin",
  );

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Users & logins</h1>
          <p className="mt-1 text-sm text-muted">
            Full create, edit, password reset, activate, and delete for non-admin
            accounts.{" "}
            <strong>Admin</strong> accounts cannot be deleted (last active Admin
            cannot be deactivated).
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/setup/shops">Shop management</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase text-muted">All users</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {users.length}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-muted">Shop logins</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {shopUsers.length}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-muted">Admins</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {adminUsers.length}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Create user</h2>
        <CreateUserForm
          roles={roles.map((r) => ({ id: r.id, name: r.name }))}
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
          defaultBranchId={defaultBranchId}
          defaultRoleName={preselectShop ? "Shop" : undefined}
        />
      </Card>

      <Card className="overflow-x-auto p-0">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">
          All accounts
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-page/40 text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-3">User</th>
              <th className="px-3 py-3">Username</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Shop</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isAdminAccount = u.role.name === "Admin";
              return (
                <tr key={u.id} className="border-t border-border/60">
                  <td className="px-3 py-3">
                    <Link
                      href={`/users/${u.id}`}
                      className="font-medium text-secondary hover:underline"
                    >
                      {u.name ?? u.email}
                    </Link>
                    <p className="text-xs text-muted">{u.email}</p>
                  </td>
                  <td className="px-3 py-3 font-medium">
                    {u.username ? `@${u.username}` : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <Badge
                      variant={
                        isAdminAccount
                          ? "default"
                          : u.role.name === "Shop"
                            ? "secondary"
                            : "default"
                      }
                    >
                      {u.role.name}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {u.branch ? (
                      <Link
                        href={`/setup/shops/${u.branch.id}`}
                        className="text-secondary hover:underline"
                      >
                        {u.branch.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={u.isActive ? "success" : "danger"}>
                      {u.isActive ? "Active" : "Off"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-2">
                      <Button asChild size="sm" variant="secondary">
                        <Link href={`/users/${u.id}`}>
                          Edit / password
                        </Link>
                      </Button>
                      <UserLifecycleActions
                        userId={u.id}
                        isActive={u.isActive}
                        canDelete={!isAdminAccount}
                        userLabel={u.name ?? u.username ?? u.email}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {otherUsers.length > 0 && (
        <p className="text-xs text-muted">
          Also includes {otherUsers.length} non-Admin/Shop role user(s).
        </p>
      )}
    </div>
  );
}
