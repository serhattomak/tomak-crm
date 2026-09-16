import { cn } from "@workspace/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-medium text-2xs leading-tight transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      size: {
        default: "px-2 py-0.5 text-2xs",
        lg: "px-2.5 py-1 text-xs",
        sm: "px-1.5 py-0.2 text-3xs",
      },
      variant: {
        accent:
          "border-primary/20 bg-primary/10 text-primary dark:border-primary/30 dark:bg-primary/15 dark:text-primary",
        default:
          "border-transparent bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90",
        destructive:
          "border-transparent bg-destructive/15 text-destructive hover:bg-destructive/25 dark:bg-destructive/25",
        neutral: "border-border bg-muted/60 text-muted-foreground",
        outline: "border-border text-foreground hover:bg-muted/50",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        success:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400",
        warning:
          "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400",
      },
    },
  }
);

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ size, variant }), className)}
      data-slot="badge"
      {...props}
    />
  );
}

export { Badge, badgeVariants };
