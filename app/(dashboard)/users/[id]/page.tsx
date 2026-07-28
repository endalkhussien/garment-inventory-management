import Link from "next/link";
import { notFound } from "next/navigation";

import { EditUserForm } from "@/components/users/user-forms";
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{user.name ?? user.email}</h1>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/users">Back</Link>
        </Button>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Edit access</h2>
        <EditUserForm
          user={{
            id: user.id,
            name: user.name,
            roleId: user.roleId,
            branchId: user.branchId,
            isActive: user.isActive,
          }}
          roles={roles.map((r) => ({ id: r.id, name: r.name }))}
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        />
      </Card>
    </div>
  );
}
