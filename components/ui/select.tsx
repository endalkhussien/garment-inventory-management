import * as React from "react";

import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      className={cn(
        "ui-select flex h-11 w-full appearance-none rounded-lg border border-[var(--border-strong)] bg-white px-3 pr-10 text-sm leading-normal text-[var(--text-primary)] shadow-sm transition-colors",
        "hover:border-[rgba(15,27,51,0.22)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary",
        "disabled:cursor-not-allowed disabled:bg-page disabled:opacity-60",
        className,
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export { Select };
