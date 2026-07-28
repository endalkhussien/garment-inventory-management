import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/** Horizontal scroll wrapper for wide tables on small screens. */
export function ResponsiveTable({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "-mx-1 overflow-x-auto overscroll-x-contain px-1 sm:mx-0 sm:px-0",
        className,
      )}
      {...props}
    >
      <div className="inline-block min-w-full align-middle">{children}</div>
    </div>
  );
}
