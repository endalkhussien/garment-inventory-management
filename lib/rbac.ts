import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import {
  isAdminRole,
  isShopRole,
} from "@/lib/rbac-shared";

export {
  ROLE_ADMIN,
  ROLE_SHOP,
  isAdminRole,
  isShopRole,
  canShopAccessPath,
  shopAllowedPrefixes,
} from "@/lib/rbac-shared";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (!isAdminRole(session.user.role?.name)) {
    redirect("/");
  }
  return session;
}

/** Admin / Manager or Shop (e.g. product catalogue). */
export async function requireAdminOrShop() {
  const session = await requireSession();
  const role = session.user.role?.name;
  if (!isAdminRole(role) && !isShopRole(role)) {
    redirect("/");
  }
  return session;
}

export function getShopBranchId(session: {
  user: { role: { name: string }; branch: { id: string } | null };
}) {
  if (isShopRole(session.user.role.name)) {
    return session.user.branch?.id ?? null;
  }
  return null;
}
