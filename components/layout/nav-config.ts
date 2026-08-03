import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BarChart3,
  ClipboardList,
  Factory,
  FolderTree,
  LayoutDashboard,
  Layers,
  MapPin,
  Package,
  ScanLine,
  Settings,
  Shirt,
  ShoppingCart,
  Store,
  UserRound,
  Users,
  Wallet,
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

/** Simple Admin nav — stock, production, team, shop, access. */
const adminSections: NavSection[] = [
  {
    title: "HOME",
    items: [
      {
        label: "Home",
        href: "/",
        icon: LayoutDashboard,
        description: "Today at a glance",
      },
      {
        label: "Getting started",
        href: "/setup",
        icon: FolderTree,
        description: "First-week checklist",
      },
    ],
  },
  {
    title: "STOCK",
    items: [
      {
        label: "Raw materials",
        href: "/inventory/raw-materials",
        icon: Package,
      },
      {
        label: "Lots & rolls",
        href: "/inventory/lots",
        icon: Layers,
      },
      {
        label: "Stocktake",
        href: "/inventory/stocktake",
        icon: ScanLine,
      },
      {
        label: "Finished goods",
        href: "/shops/stock",
        icon: Store,
      },
      {
        label: "Transfer to shop",
        href: "/shops/transfers",
        icon: ArrowLeftRight,
      },
      {
        label: "Shop orders",
        href: "/shops/orders",
        icon: ClipboardList,
      },
      {
        label: "RM transfers",
        href: "/inventory/raw-transfers",
        icon: ArrowLeftRight,
      },
    ],
  },
  {
    title: "PRODUCTION",
    items: [
      {
        label: "Products & BOM",
        href: "/products",
        icon: Shirt,
      },
      {
        label: "Orders",
        href: "/production/orders",
        icon: ClipboardList,
      },
      {
        label: "Log output",
        href: "/production/output",
        icon: Factory,
      },
    ],
  },
  {
    title: "TEAM & PAY",
    items: [
      {
        label: "Employees",
        href: "/production/employees",
        icon: Users,
      },
      {
        label: "Payroll",
        href: "/payroll",
        icon: Wallet,
      },
    ],
  },
  {
    title: "SELL",
    items: [
      {
        label: "POS / Sales",
        href: "/sales",
        icon: ShoppingCart,
      },
    ],
  },
  {
    title: "INSIGHTS",
    items: [
      {
        label: "Reports",
        href: "/reports",
        icon: BarChart3,
      },
    ],
  },
  {
    title: "ACCESS",
    items: [
      {
        label: "Shops",
        href: "/setup/shops",
        icon: Store,
        description: "Open, edit, close retail shops",
      },
      {
        label: "Branches",
        href: "/setup/branches",
        icon: MapPin,
      },
      {
        label: "Categories",
        href: "/setup/categories",
        icon: FolderTree,
      },
      {
        label: "System settings",
        href: "/setup/settings",
        icon: Settings,
      },
      {
        label: "Users & roles",
        href: "/users",
        icon: Users,
      },
    ],
  },
];

const shopSections: NavSection[] = [
  {
    title: "SHOP",
    items: [
      {
        label: "Home",
        href: "/",
        icon: LayoutDashboard,
      },
      {
        label: "Sell (POS)",
        href: "/sales",
        icon: ShoppingCart,
      },
      {
        label: "My stock",
        href: "/shops/stock",
        icon: Store,
      },
      {
        label: "Order stock",
        href: "/shops/orders",
        icon: ClipboardList,
        description: "Request from warehouse",
      },
      {
        label: "Finance",
        href: "/shops/finance",
        icon: WalletCards,
        description: "Sales & cash summary",
      },
      {
        label: "My account",
        href: "/account",
        icon: UserRound,
        description: "Username & password",
      },
    ],
  },
];

export function getNavSectionsForRole(roleName?: string | null): NavSection[] {
  if (isShopRole(roleName)) return shopSections;
  if (isAdminRole(roleName)) return adminSections;
  return adminSections;
}

/** @deprecated use getNavSectionsForRole */
export const navSections = adminSections;
