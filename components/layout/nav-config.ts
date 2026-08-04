import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Layers,
  Package,
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
  description?: string;
};

export type NavSection = {
  title: string;
  hint?: string;
  items: NavItem[];
};

const adminSections: NavSection[] = [
  {
    title: "CONTROL",
    items: [
      {
        label: "Control home",
        href: "/",
        icon: LayoutDashboard,
      },
      {
        label: "Central inventory",
        href: "/central",
        icon: Layers,
        description: "All shops rolled up · filter by shop",
      },
      {
        label: "Finance",
        href: "/shops/finance",
        icon: WalletCards,
        description: "Charts · multi-shop filters",
      },
    ],
  },
  {
    title: "PRODUCTS",
    items: [
      {
        label: "Products",
        href: "/products",
        icon: Shirt,
      },
      {
        label: "Categories",
        href: "/setup/categories",
        icon: Package,
        description: "Male · Ladies · Kids",
      },
    ],
  },
  {
    title: "SHOPS",
    items: [
      {
        label: "Manage shops",
        href: "/setup/shops",
        icon: Store,
      },
      {
        label: "Shop stock",
        href: "/shops/stock",
        icon: Layers,
      },
      {
        label: "Add stock",
        href: "/shops/restock",
        icon: RefreshCw,
      },
      {
        label: "Bulk import",
        href: "/shops/import",
        icon: Upload,
        description: "Restock or sales file",
      },
      {
        label: "Shop staff",
        href: "/shops/staff",
        icon: Users,
        description: "Salary & commission",
      },
    ],
  },
  {
    title: "ACCESS",
    items: [
      {
        label: "Users & roles",
        href: "/users",
        icon: Users,
      },
      {
        label: "Settings",
        href: "/setup/settings",
        icon: Settings,
      },
    ],
  },
];

const shopSections: NavSection[] = [
  {
    title: "MY SHOP",
    items: [
      {
        label: "Home",
        href: "/",
        icon: LayoutDashboard,
      },
      {
        label: "My stock",
        href: "/shops/stock",
        icon: Store,
      },
      {
        label: "Add stock",
        href: "/shops/restock",
        icon: RefreshCw,
        description: "Manual · CSV · Excel",
      },
      {
        label: "Bulk import",
        href: "/shops/import",
        icon: Upload,
        description: "Restock or sales",
      },
      {
        label: "My staff",
        href: "/shops/staff",
        icon: Users,
        description: "Salary & commission",
      },
      {
        label: "My account",
        href: "/account",
        icon: UserRound,
      },
    ],
  },
];

export function getNavSectionsForRole(roleName?: string | null): NavSection[] {
  if (isShopRole(roleName)) return shopSections;
  if (isAdminRole(roleName)) return adminSections;
  return adminSections;
}

export const navSections = adminSections;
