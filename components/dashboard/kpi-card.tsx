import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  trend?: number;
  trendLabel?: string;
  icon?: LucideIcon;
  variant?: "default" | "success" | "warning" | "danger";
  accent?: "blue" | "green" | "amber" | "violet" | "primary";
  alert?: boolean;
};

const valueVariants = {
  default: "text-[var(--text-primary)]",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

const accentIcon = {
  blue: "kpi-icon-blue",
  green: "kpi-icon-green",
  amber: "kpi-icon-amber",
  violet: "kpi-icon-violet",
  primary: "bg-[var(--secondary-container)] text-[var(--on-secondary-container)]",
};

export function KpiCard({
  label,
  value,
  hint,
  trend,
  trendLabel,
  icon: Icon,
  variant = "default",
  accent = "primary",
  alert = false,
}: KpiCardProps) {
  const trendUp = trend !== undefined && trend >= 0;
  const TrendIcon = trendUp ? TrendingUp : TrendingDown;

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-shadow hover:shadow-md",
        alert && "border-[var(--error-container)]",
      )}
    >
      {alert && (
        <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-bl-full bg-[var(--error-container)]/25" />
      )}
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="label-caps">{label}</p>
          <p
            className={cn(
              "mt-2 font-mono text-2xl font-bold tracking-tight sm:text-[28px]",
              valueVariants[variant],
            )}
          >
            {value}
          </p>
          {hint && (
            <p className="mt-1 text-sm text-muted">{hint}</p>
          )}
        </div>
        {Icon && (
          <div className={cn("rounded-md p-1.5", accentIcon[accent])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className="relative z-10 mt-2 flex items-center gap-1 text-sm">
          <TrendIcon
            className={cn("h-3.5 w-3.5", trendUp ? "text-success" : "text-danger")}
          />
          <span
            className={cn(
              "font-medium",
              trendUp ? "text-success" : "text-danger",
            )}
          >
            {trend > 0 ? "+" : ""}
            {trend}%
          </span>
          {trendLabel && <span className="text-muted">{trendLabel}</span>}
        </div>
      )}
    </Card>
  );
}
