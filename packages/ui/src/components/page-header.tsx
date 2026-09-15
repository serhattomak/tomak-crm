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
 * NOTE: the page title is deliberately `text-2xl sm:text-3xl` — this is the
 * house page-title scale. `crm-ui-standards.md` sec.1.3's smaller heading rule
 * applies to card and section headings, not to page titles.
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
          <h1 className="font-bold text-2xl text-foreground tracking-tight sm:text-3xl">
            {title}
          </h1>
          {badge}
        </div>
        {description ? (
          <p className="mt-0.5 text-muted-foreground text-xs">{description}</p>
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
