"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ChevronLeft,
  ChevronRight,
  Package2,
  Plus,
  X,
} from "lucide-react";

import {
  ADD_PRODUCT_HREF,
  getNavSectionsForRole,
} from "@/components/layout/nav-config";
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
  companyTagline = "Garment Management",
}: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const sections = getNavSectionsForRole(session?.user?.role?.name);
  const mainSections = sections.filter((s) => !s.footer);
  const footerSections = sections.filter((s) => s.footer);
  const showLabels = mobileOpen || !collapsed;

  function isActive(href: string) {
    return (
      href !== "#" &&
      (pathname === href || (href !== "/" && pathname.startsWith(href)))
    );
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-full flex-col transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0",
        "bg-[var(--sidebar-bg)] text-[var(--sidebar-fg)]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        collapsed ? "lg:w-sidebar-collapsed" : "lg:w-sidebar",
        "w-[min(16.25rem,88vw)]",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 px-4 pt-5 pb-2",
          !showLabels && "justify-center px-2",
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-fixed)] text-[var(--on-primary-fixed)] shadow-sm">
          <Package2 className="h-5 w-5" />
        </div>
        {showLabels && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold leading-tight text-white">
              {companyName}
            </p>
            <p className="truncate text-[11px] uppercase tracking-wider text-[var(--sidebar-muted)]">
              {companyTagline}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-white/80 hover:bg-white/10 lg:hidden"
          onClick={onCloseMobile}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {showLabels ? (
        <div className="px-4 pb-4 pt-2">
          <Link
            href={ADD_PRODUCT_HREF}
            onClick={onCloseMobile}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--secondary-fixed)] py-2.5 text-sm font-semibold text-[var(--on-secondary-fixed)] transition-colors hover:bg-[var(--secondary-fixed-dim)] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        </div>
      ) : (
        <div className="flex justify-center px-2 pb-3 pt-1">
          <Link
            href={ADD_PRODUCT_HREF}
            title="Add Product"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--secondary-fixed)] text-[var(--on-secondary-fixed)] hover:bg-[var(--secondary-fixed-dim)]"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </div>
      )}

      <nav className="flex flex-1 flex-col overflow-y-auto overscroll-contain px-3 pb-4">
        <div className="flex-1 space-y-5">
          {mainSections.map((section) => (
            <div key={section.title}>
              {showLabels && section.title !== "Main" && (
                <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--sidebar-muted)]">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <li key={`${section.title}-${item.label}`}>
                      <Link
                        href={item.href}
                        onClick={onCloseMobile}
                        title={!showLabels ? item.label : undefined}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 lg:min-h-0",
                          !showLabels && "justify-center px-0",
                          active
                            ? "bg-[var(--sidebar-active)] font-bold text-[var(--sidebar-active-fg)]"
                            : "text-[var(--sidebar-muted)] opacity-90 hover:bg-[var(--sidebar-hover)] hover:text-white hover:opacity-100",
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" aria-hidden />
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
        </div>

        {footerSections.length > 0 && (
          <div className="mt-auto border-t border-white/10 pt-3">
            {footerSections.map((section) => (
              <ul key={section.title} className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        onClick={onCloseMobile}
                        title={!showLabels ? item.label : undefined}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                          !showLabels && "justify-center px-0",
                          active
                            ? "bg-[var(--sidebar-active)] font-bold text-[var(--sidebar-active-fg)]"
                            : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-white",
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        {showLabels && <span>{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ))}
            <div className={cn("mt-2", !showLabels && "flex justify-center")}>
              <Button
                variant="ghost"
                size={showLabels ? "sm" : "icon"}
                className="hidden w-full justify-start text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-white lg:inline-flex"
                onClick={onToggle}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4" />
                    <span className="ml-2">Collapse</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
