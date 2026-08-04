"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight, Package2, X } from "lucide-react";

import { getNavSectionsForRole } from "@/components/layout/nav-config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onCloseMobile: () => void;
  companyName?: string;
  companyTagline?: string;
};

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggle,
  onCloseMobile,
  companyName = "Esset Inventory",
  companyTagline = "Ethiopia",
}: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const navSections = getNavSectionsForRole(session?.user?.role?.name);
  const showLabels = mobileOpen || !collapsed;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-border transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0",
        "bg-[var(--sidebar-bg)] text-[var(--sidebar-fg)]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        collapsed ? "lg:w-[72px]" : "lg:w-60",
        "w-[min(17rem,85vw)]",
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-3 sm:h-16">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary">
            <Package2 className="h-5 w-5" />
          </div>
          {showLabels && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{companyName}</p>
              <p className="truncate text-[11px] text-[var(--sidebar-muted)]">
                {companyTagline}
              </p>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-[var(--sidebar-fg)] hover:bg-white/10 lg:hidden"
            onClick={onCloseMobile}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden text-[var(--sidebar-fg)] hover:bg-white/10 lg:inline-flex"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto overscroll-contain p-2.5 pb-6">
        {navSections.map((section, sectionIndex) => (
          <div
            key={section.title}
            className={cn(sectionIndex > 0 && "mt-4 border-t border-white/10 pt-3")}
          >
            {showLabels && (
              <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--sidebar-muted)]">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href !== "#" &&
                  (pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href)));

                return (
                  <li key={`${section.title}-${item.label}`}>
                    <Link
                      href={item.href}
                      onClick={onCloseMobile}
                      title={!showLabels ? item.label : undefined}
                      className={cn(
                        "flex min-h-10 items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors lg:min-h-0",
                        !showLabels && "justify-center px-0",
                        isActive
                          ? "bg-[var(--sidebar-active)] font-medium text-[var(--sidebar-active-fg)]"
                          : "text-[var(--sidebar-muted)] hover:bg-white/5 hover:text-[var(--sidebar-fg)]",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      {showLabels && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
