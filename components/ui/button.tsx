import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-primary)] text-on-primary hover:bg-[var(--color-primary-hover)] shadow-sm",
        action:
          "bg-action text-white hover:bg-action-hover shadow-sm",
        secondary:
          "bg-[var(--surface-container)] text-[var(--text-primary)] border border-border hover:bg-[var(--surface-container-high)]",
        ghost: "hover:bg-[var(--surface-container-low)] text-muted hover:text-[var(--text-primary)]",
        danger: "bg-danger text-white hover:bg-danger/90",
      },
      size: {
        default: "h-11 px-4 py-2 sm:h-10",
        sm: "h-9 rounded-lg px-3 text-xs sm:h-8",
        lg: "h-11 rounded-lg px-6",
        icon: "h-11 w-11 sm:h-10 sm:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
