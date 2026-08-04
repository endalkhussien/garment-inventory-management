import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

import { canShopAccessPath, isAdminRole, isShopRole } from "@/lib/rbac-shared";

const adminOnlyPrefixes = [
  "/setup",
  "/production",
  "/inventory",
  "/payroll",
  "/approvals",
  "/reports",
  "/shops/transfers",
  "/users",
  "/central",
  "/shops/finance",
];

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role?.name as string | undefined;
    const path = req.nextUrl.pathname;

    if (isShopRole(role) && !canShopAccessPath(path)) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (
      !isAdminRole(role) &&
      adminOnlyPrefixes.some((prefix) => path.startsWith(prefix))
    ) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)"],
};
