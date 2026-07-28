import { Badge } from "@/components/ui/badge";

type LowStockBadgeProps = {
  quantity: number;
  reorderThreshold: number;
};

export function LowStockBadge({
  quantity,
  reorderThreshold,
}: LowStockBadgeProps) {
  if (quantity > reorderThreshold) {
    return null;
  }

  return <Badge variant="warning">Low stock</Badge>;
}
