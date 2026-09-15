import { cn } from "@workspace/ui/lib/utils";
import type * as React from "react";

interface PageContainerProps extends React.ComponentProps<"div"> {
  /**
   * Full-bleed surfaces (kanban boards, chat, calendar, print views) skip the
   * canonical padding and manage their own inner spacing.
   *
   * Bleed is *not* an escape hatch for arbitrary padding — it is the declared
   * shell type for surfaces that must touch the viewport edge.
   */
  bleed?: boolean;
}

/**
 * The single owner of page padding. Pages must not set their own `p-*`/`px-*`:
 * that is how the app ended up with six competing padding variants and legacy
 * pages double-padding on top of the layout.
 */
function PageContainer({
  bleed = false,
  className,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "w-full",
        bleed ? "p-0" : "px-4 py-5 md:px-6 md:py-6",
        className
      )}
      data-slot="page-container"
      {...props}
    />
  );
}

export { PageContainer };
export type { PageContainerProps };
