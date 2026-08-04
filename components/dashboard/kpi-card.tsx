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
  primary: "bg-primary/10 text-primary",
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
}: KpiCardProps) {
  const trendUp = trend !== undefined && trend >= 0;
  const TrendIcon = trendUp ? TrendingUp : TrendingDown;

  return (
    <Card className="relative overflow-hidden">
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1 rounded-l-xl",
          accent === "blue" && "bg-[var(--kpi-blue)]",
          accent === "green" && "bg-[var(--kpi-green)]",
          accent === "amber" && "bg-[var(--kpi-amber)]",
          accent === "violet" && "bg-[var(--kpi-violet)]",
          accent === "primary" && "bg-primary",
        )}
      />
      <div className="flex items-start justify-between gap-2 pl-1">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {label}
          </p>
          <p
            className={cn(
              "mt-1.5 text-2xl font-semibold tabular-nums tracking-tight",
              valueVariants[variant],
            )}
          >
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        {Icon && (
          <div className={cn("rounded-lg p-2.5", accentIcon[accent])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1 pl-1 text-xs">
          <TrendIcon
            className={cn("h-3.5 w-3.5", trendUp ? "text-success" : "text-danger")}
          />
          <span className={trendUp ? "text-success" : "text-danger"}>
            {trend > 0 ? "+" : ""}
            {trend}%
          </span>
          {trendLabel && <span className="text-muted">{trendLabel}</span>}
        </div>
      )}
    </Card>
  );
}
