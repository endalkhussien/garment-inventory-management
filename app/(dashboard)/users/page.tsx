import Link from "next/link";

import { CreateUserForm } from "@/components/users/user-forms";
import { Badge } from "@/components/ui/badge";
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
      orderBy: { email: "asc" },
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Users & roles</h1>
        <p className="mt-1 text-sm text-muted">
          <strong>Admin</strong> — factory, stock, payroll, all shops.{" "}
          <strong>Shop</strong> — POS and their shop stock only (must assign a
          branch). Prefer{" "}
          <Link href="/setup/shops" className="text-secondary hover:underline">
            Initiate shop
          </Link>{" "}
          to create shop + first login together.
        </p>
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
        <table className="min-w-full text-left text-sm">
          <thead className="bg-page/40 text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-3">User</th>
              <th className="px-3 py-3">Username</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Branch</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border/60">
                <td className="px-3 py-3">
                  <Link
                    href={`/users/${u.id}`}
                    className="text-secondary hover:underline"
                  >
                    {u.name ?? u.email}
                  </Link>
                  <p className="text-xs text-muted">{u.email}</p>
                </td>
                <td className="px-3 py-3 font-medium">
                  {u.username ? `@${u.username}` : "—"}
                </td>
                <td className="px-3 py-3">{u.role.name}</td>
                <td className="px-3 py-3 text-muted">
                  {u.branch?.name ?? "—"}
                </td>
                <td className="px-3 py-3">
                  <Badge variant={u.isActive ? "success" : "danger"}>
                    {u.isActive ? "Active" : "Off"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
