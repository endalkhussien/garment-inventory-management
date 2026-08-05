import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-border bg-[var(--surface-container-lowest,#fff)] px-3 text-sm leading-normal text-[var(--text-primary)] shadow-sm transition-colors",
          "placeholder:text-muted",
          "hover:border-[var(--outline)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/30 focus-visible:border-action",
          "disabled:cursor-not-allowed disabled:bg-[var(--surface-container-low)] disabled:opacity-60",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
