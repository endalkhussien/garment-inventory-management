import Link from "next/link";
import { notFound } from "next/navigation";

import {
  EditUserForm,
  UserLifecycleActions,
} from "@/components/users/user-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type PageProps = { params: { id: string } };

export default async function UserDetailPage({ params }: PageProps) {
  await requireAdmin();

  const [user, roles, branches] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.id },
      include: { role: true, branch: true },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!user) notFound();

  const isAdminAccount = user.role.name === "Admin";
  const canDelete = !isAdminAccount;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">
              {user.name ?? user.email}
            </h1>
            <Badge variant={user.isActive ? "success" : "danger"}>
              {user.isActive ? "Active" : "Inactive"}
            </Badge>
            <Badge variant={isAdminAccount ? "default" : "secondary"}>
              {user.role.name}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {user.username ? `@${user.username}` : user.email}
            {user.branch ? ` · ${user.branch.name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/users">All users</Link>
          </Button>
          {user.branchId && (
            <Button asChild variant="secondary">
              <Link href={`/setup/shops/${user.branchId}`}>Shop page</Link>
            </Button>
          )}
        </div>
      </div>

      {isAdminAccount && (
        <Card className="border-warning/40 bg-warning/5">
          <p className="text-sm text-muted">
            <strong className="text-[var(--text-primary)]">Admin account.</strong>{" "}
            You can update name, username, and password. Admin accounts cannot
            be deleted. The last active Admin cannot be deactivated or demoted.
          </p>
        </Card>
      )}

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Edit user & password</h2>
          <UserLifecycleActions
            userId={user.id}
            isActive={user.isActive}
            canDelete={canDelete}
            userLabel={user.name ?? user.username ?? user.email}
          />
        </div>
        <EditUserForm
          user={{
            id: user.id,
            name: user.name,
            username: user.username,
            roleId: user.roleId,
            branchId: user.branchId,
            isActive: user.isActive,
          }}
          roles={roles.map((r) => ({ id: r.id, name: r.name }))}
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
          isProtectedAdmin={isAdminAccount}
        />
      </Card>
    </div>
  );
}
