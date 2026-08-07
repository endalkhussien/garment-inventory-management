import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Layers,
  Package,
  RefreshCw,
  Settings,
  Shirt,
  ShoppingCart,
  Store,
  Upload,
  UserRound,
  Users,
  WalletCards,
  Warehouse,
} from "lucide-react";

import { isAdminRole, isShopRole } from "@/lib/rbac-shared";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavSection = {
  title: string;
  items: NavItem[];
  /** Pinned to sidebar footer */
  footer?: boolean;
};

/** Stitch HQ: main command nav + operations for multi-shop retail. */
const adminSections: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Central Inventory", href: "/central", icon: Warehouse },
      { label: "Finance", href: "/shops/finance", icon: WalletCards },
      { label: "Products", href: "/products", icon: Shirt },
      { label: "Shop Management", href: "/setup/shops", icon: Store },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Stock", href: "/shops/stock", icon: Layers },
      { label: "Restock", href: "/shops/restock", icon: RefreshCw },
      { label: "Direct sale", href: "/sales", icon: ShoppingCart },
      { label: "Bulk sales", href: "/shops/sales", icon: Upload },
      { label: "Staff", href: "/shops/staff", icon: Users },
      { label: "Categories", href: "/setup/categories", icon: Package },
    ],
  },
  {
    title: "System",
    footer: true,
    items: [
      { label: "Users", href: "/users", icon: Users },
      { label: "Settings", href: "/setup/settings", icon: Settings },
    ],
  },
];

/** Stitch Shop Manager: branch-focused tools. */
const shopSections: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Products", href: "/products", icon: Shirt },
      { label: "Stock", href: "/shops/stock", icon: Layers },
      { label: "Restock", href: "/shops/restock", icon: RefreshCw },
      { label: "Direct sale", href: "/sales", icon: ShoppingCart },
      { label: "Bulk sales", href: "/shops/sales", icon: Upload },
      { label: "Staff", href: "/shops/staff", icon: Users },
    ],
  },
  {
    title: "Account",
    footer: true,
    items: [{ label: "Account", href: "/account", icon: UserRound }],
  },
];

export const ADD_PRODUCT_HREF = "/products/new";

export function getNavSectionsForRole(roleName?: string | null): NavSection[] {
  if (isShopRole(roleName)) return shopSections;
  if (isAdminRole(roleName)) return adminSections;
  return adminSections;
}

export const navSections = adminSections;
