"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight, Factory, X } from "lucide-react";

import { getNavSectionsForRole } from "@/components/layout/nav-config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onCloseMobile: () => void;
};

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggle,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const navSections = getNavSectionsForRole(session?.user?.role?.name);

  // On mobile drawer always show labels; on desktop respect collapsed
  const showLabels = mobileOpen || !collapsed;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-border bg-surface shadow-card transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 lg:shadow-sm",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        collapsed ? "lg:w-[72px]" : "lg:w-64",
        "w-[min(18rem,85vw)]",
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-border px-3 sm:h-16">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary shadow-sm">
            <Factory className="h-5 w-5" />
          </div>
          {showLabels && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                TextilePro
              </p>
              <p className="truncate text-xs text-muted">Gabicon · Ethiopia</p>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onCloseMobile}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
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

      <nav className="flex-1 overflow-y-auto overscroll-contain p-3 pb-6">
        {navSections.map((section, sectionIndex) => (
          <div
            key={section.title}
            className={cn(sectionIndex > 0 && "mt-5 border-t border-border pt-4")}
          >
            {showLabels && (
              <div className="mb-2 px-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {section.title}
                </p>
                {section.hint && (
                  <p className="mt-0.5 text-[11px] leading-snug text-muted/80">
                    {section.hint}
                  </p>
                )}
              </div>
            )}
            <ul className="space-y-1">
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
                      className={cn(
                        "group flex min-h-11 items-center gap-3 rounded-xl px-2 py-2.5 text-sm transition-colors lg:min-h-0 lg:py-2",
                        !showLabels && "justify-center px-0",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted hover:bg-page hover:text-[var(--text-primary)]",
                      )}
                      title={
                        !showLabels
                          ? item.description
                            ? `${item.label} — ${item.description}`
                            : item.label
                          : item.description
                      }
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5 shrink-0 lg:h-4 lg:w-4",
                          isActive
                            ? "text-primary"
                            : "text-muted group-hover:text-primary",
                        )}
                        aria-hidden
                      />
                      {showLabels && (
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {item.label}
                          </span>
                          {item.description && (
                            <span className="hidden truncate text-[11px] text-muted/80 group-hover:text-muted sm:block">
                              {item.description}
                            </span>
                          )}
                        </span>
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
