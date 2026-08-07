import {
  ChangePasswordForm,
  ProfileForm,
} from "@/components/account/account-forms";
import { ExportDataCard } from "@/components/setup/export-data-card";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { isShopRole, requireSession } from "@/lib/rbac";

export default async function AccountPage() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true, branch: true },
  });

  if (!user) {
    return <p className="text-sm text-danger">User not found.</p>;
  }

  const shopUser = isShopRole(user.role.name);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">My account</h1>
        <p className="mt-1 text-sm text-muted">
          Change your username or password anytime.{" "}
          {shopUser && user.branch
            ? `You are signed in for ${user.branch.name}.`
            : null}
        </p>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Profile</h2>
        <ProfileForm
          name={user.name ?? ""}
          username={user.username ?? ""}
        />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Change password</h2>
        <ChangePasswordForm />
      </Card>

      {shopUser ? (
        <Card>
          <ExportDataCard
            mode="shop"
            shopLabel={user.branch?.name ?? undefined}
          />
        </Card>
      ) : null}
    </div>
  );
}
