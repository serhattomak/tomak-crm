import { cn } from "@workspace/ui/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"

const storeBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] leading-none font-semibold transition-colors",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        category:
          "border-store-border bg-store-surface text-store-surface-foreground shadow-store-sm",
        default:
          "border-transparent bg-store-muted text-store-muted-foreground",
        featured:
          "border-transparent bg-store-accent text-store-accent-foreground",
        new: "border-transparent bg-store-primary text-store-primary-foreground shadow-store-sm",
        sale: "border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20",
        sku: "border-transparent bg-store-muted font-mono text-store-muted-foreground",
      },
    },
  }
)

export interface StoreBadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof storeBadgeVariants> {
  icon?: React.ReactNode
}

export function StoreBadge({
  className,
  icon,
  variant,
  children,
  ...props
}: StoreBadgeProps) {
  return (
    <span className={cn(storeBadgeVariants({ variant }), className)} {...props}>
      {icon ? (
        <span aria-hidden="true" className="shrink-0">
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  )
}

export { storeBadgeVariants }
