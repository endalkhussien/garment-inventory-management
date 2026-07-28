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
};

const valueVariants = {
  default: "text-[var(--text-primary)]",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export function KpiCard({
  label,
  value,
  hint,
  trend,
  trendLabel,
  icon: Icon,
  variant = "default",
}: KpiCardProps) {
  const trendUp = trend !== undefined && trend >= 0;
  const TrendIcon = trendUp ? TrendingUp : TrendingDown;

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted">{label}</p>
          <p className={cn("mt-1 text-2xl font-semibold", valueVariants[variant])}>
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        {Icon && (
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <TrendIcon
            className={cn(
              "h-3.5 w-3.5",
              trendUp ? "text-success" : "text-danger",
            )}
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
