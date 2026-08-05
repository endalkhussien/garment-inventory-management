import Link from "next/link";

import { cn } from "@/lib/utils";

export type FilterCategory = { id: string; name: string };

/**
 * Builds `?a=1&b=2` from current params + patch.
 * Pass empty string to drop a key; omit to keep existing.
 */
export function hrefWithQuery(
  path: string,
  current: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
) {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...current, ...patch })) {
    if (v === undefined || v === "" || v === "all") continue;
    merged[k] = v;
  }
  const qs = new URLSearchParams(merged).toString();
  return qs ? `${path}?${qs}` : path;
}

export function CategoryFilterChips({
  path,
  categories,
  activeId,
  currentParams = {},
  paramKey = "category",
  label = "Category",
}: {
  path: string;
  categories: FilterCategory[];
  activeId?: string | null;
  currentParams?: Record<string, string | undefined>;
  paramKey?: string;
  label?: string;
}) {
  if (categories.length === 0) return null;

  const active = activeId && activeId !== "all" ? activeId : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="label-caps">{label}</span>
      <Link
        href={hrefWithQuery(path, currentParams, { [paramKey]: undefined })}
        className={cn(
          "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
          !active
            ? "bg-[var(--primary-container)] text-white"
            : "bg-[var(--surface-container)] text-muted hover:text-[var(--text-primary)]",
        )}
      >
        All
      </Link>
      {categories.map((c) => (
        <Link
          key={c.id}
          href={hrefWithQuery(path, currentParams, { [paramKey]: c.id })}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            active === c.id
              ? "bg-[var(--secondary-fixed)] font-semibold text-[var(--on-secondary-fixed)]"
              : "bg-[var(--surface-container)] text-muted hover:text-[var(--text-primary)]",
          )}
        >
          {c.name}
        </Link>
      ))}
    </div>
  );
}

export function StatusFilterChips({
  path,
  active,
  currentParams = {},
  paramKey = "status",
}: {
  path: string;
  active?: string | null;
  currentParams?: Record<string, string | undefined>;
  paramKey?: string;
}) {
  const value = active && active !== "all" ? active : null;
  const items: { id: string | null; label: string }[] = [
    { id: null, label: "All" },
    { id: "low", label: "Low stock" },
    { id: "ok", label: "In stock" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">
        Status
      </span>
      {items.map((item) => (
        <Link
          key={item.label}
          href={hrefWithQuery(path, currentParams, {
            [paramKey]: item.id ?? undefined,
          })}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm",
            value === item.id || (!value && item.id === null)
              ? item.id === null
                ? "bg-primary text-on-primary"
                : "bg-primary/15 font-medium text-primary"
              : "bg-page text-muted hover:text-[var(--text-primary)]",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
