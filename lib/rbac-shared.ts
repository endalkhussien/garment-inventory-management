export const ROLE_ADMIN = "Admin";
export const ROLE_SHOP = "Shop";

export function isAdminRole(roleName?: string | null) {
  return roleName === ROLE_ADMIN || roleName === "Manager";
}

export function isShopRole(roleName?: string | null) {
  return roleName === ROLE_SHOP;
}

/** Paths Shop users may access (prefix match). */
export function canShopAccessPath(pathname: string) {
  if (pathname === "/") return true;
  return (
    pathname.startsWith("/products") ||
    pathname.startsWith("/shops/stock") ||
    pathname.startsWith("/shops/restock") ||
    pathname.startsWith("/shops/sales") ||
    pathname.startsWith("/shops/import") ||
    pathname.startsWith("/shops/staff") ||
    pathname.startsWith("/sales") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/api/auth")
  );
}

export const shopAllowedPrefixes = [
  "/",
  "/products",
  "/shops/stock",
  "/shops/restock",
  "/shops/sales",
  "/shops/import",
  "/shops/staff",
  "/sales",
  "/account",
];
