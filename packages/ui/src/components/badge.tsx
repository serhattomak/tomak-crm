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
        accent: "border-transparent bg-accent-soft text-accent-foreground",
        default:
          "border-transparent bg-foreground text-background shadow-2xs hover:bg-foreground/90",
        destructive:
          "border-transparent bg-danger-soft text-danger-ink hover:bg-danger-soft/70",
        info: "border-transparent bg-info-soft text-info-ink",
        neutral: "border-transparent bg-muted text-muted-foreground",
        outline: "border-border text-foreground hover:bg-muted/50",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        success: "border-transparent bg-success-soft text-success-ink",
        warning: "border-transparent bg-warning-soft text-warning-ink",
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
