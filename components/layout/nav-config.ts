import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Layers,
  Package,
  PackagePlus,
  RefreshCw,
  Settings,
  Shirt,
  Store,
  Upload,
  UserRound,
  Users,
  WalletCards,
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
};

const adminSections: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Inventory", href: "/central", icon: Layers },
      { label: "Finance", href: "/shops/finance", icon: WalletCards },
    ],
  },
  {
    title: "Catalog",
    items: [
      { label: "Products", href: "/products", icon: Shirt },
      { label: "Categories", href: "/setup/categories", icon: Package },
    ],
  },
  {
    title: "Shops",
    items: [
      { label: "Manage shops", href: "/setup/shops", icon: Store },
      { label: "Stock", href: "/shops/stock", icon: Layers },
      { label: "Restock", href: "/shops/restock", icon: RefreshCw },
      { label: "Import", href: "/shops/import", icon: Upload },
      { label: "Staff", href: "/shops/staff", icon: Users },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Users", href: "/users", icon: Users },
      { label: "Settings", href: "/setup/settings", icon: Settings },
    ],
  },
];

const shopSections: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Products", href: "/products", icon: Shirt },
      { label: "New product", href: "/products/new", icon: PackagePlus },
      { label: "Stock", href: "/shops/stock", icon: Store },
      { label: "Restock", href: "/shops/restock", icon: RefreshCw },
      { label: "Import", href: "/shops/import", icon: Upload },
      { label: "Staff", href: "/shops/staff", icon: Users },
      { label: "Account", href: "/account", icon: UserRound },
    ],
  },
];

export function getNavSectionsForRole(roleName?: string | null): NavSection[] {
  if (isShopRole(roleName)) return shopSections;
  if (isAdminRole(roleName)) return adminSections;
  return adminSections;
}

export const navSections = adminSections;
