import { cn } from "@workspace/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import type * as React from "react";

export interface EmptyStateProps extends React.ComponentProps<"div"> {
  action?: React.ReactNode;
  description?: string;
  icon?: LucideIcon;
  title: string;
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-border/80 border-dashed bg-card/40 p-8 text-center transition-colors",
        className
      )}
      data-slot="empty-state"
      {...props}
    >
      {Icon ? (
        <div className="flex size-10 items-center justify-center rounded-lg border border-border/80 bg-muted/60 text-muted-foreground shadow-2xs">
          <Icon className="size-5" />
        </div>
      ) : null}
      <h3 className="mt-3.5 font-semibold text-foreground text-sm tracking-tight">
        {title}
      </h3>
      {description ? (
        <p className="mt-1 max-w-sm text-muted-foreground text-xs leading-relaxed">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
