export type NavItem = {
  label: string;
  href: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    title: "ACTION CENTER",
    items: [
      { label: "Dashboard", href: "/" },
      { label: "Approvals", href: "#" },
      { label: "Notifications", href: "#" },
    ],
  },
  {
    title: "NAVIGATE",
    items: [
      { label: "Overview", href: "#" },
      { label: "Reports", href: "#" },
    ],
  },
  {
    title: "PRODUCTION",
    items: [
      { label: "Production Orders", href: "#" },
      { label: "Output Entry", href: "#" },
      { label: "Employees", href: "#" },
    ],
  },
  {
    title: "INVENTORY",
    items: [
      { label: "Raw Materials", href: "#" },
      { label: "Capital Assets", href: "#" },
      { label: "Stock Movements", href: "#" },
    ],
  },
  {
    title: "ACCOUNTING",
    items: [
      { label: "Sales", href: "#" },
      { label: "Payments", href: "#" },
      { label: "Cost & Pricing", href: "#" },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      { label: "Branches", href: "#" },
      { label: "Suppliers", href: "#" },
      { label: "Customers", href: "#" },
    ],
  },
  {
    title: "ACCESS CONTROL",
    items: [
      { label: "Users", href: "#" },
      { label: "Roles", href: "#" },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { label: "Audit Log", href: "#" },
      { label: "Settings", href: "#" },
    ],
  },
];
