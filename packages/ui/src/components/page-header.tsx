import { cn } from "@workspace/ui/lib/utils";
import type * as React from "react";

interface PageHeaderProps extends React.ComponentProps<"div"> {
  /** Optional slot rendered inline after the title — typically a count `Badge`. */
  badge?: React.ReactNode;
  /** Right-aligned action controls (buttons, filters). */
  actions?: React.ReactNode;
  description?: string;
  title: string;
}

/**
 * Canonical page header. Title/description/badge/actions in one place so every
 * screen speaks the same hierarchy.
 *
 * NOTE: the page title is deliberately `text-2xl` — the floating-shell spec
 * (§3.5) pins the page title at 23–24px. It no longer grows to 30px on `sm`:
 * the new hierarchy comes from weight and spacing, not from scale.
 */
function PageHeader({
  actions,
  badge,
  className,
  description,
  title,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-4 sm:flex-row sm:items-center",
        className
      )}
      data-slot="page-header"
      {...props}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-2xl text-foreground tracking-tight">
            {title}
          </h1>
          {badge}
        </div>
        {description ? (
          <p className="mt-1 text-muted-foreground text-xs">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export { PageHeader };
export type { PageHeaderProps };
