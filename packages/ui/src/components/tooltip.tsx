"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import type * as React from "react";

function TooltipProvider({
  delayDuration = 150,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />;
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 6,
  shortcut,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content> & {
  shortcut?: string;
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        className={cn(
          "fade-in-0 zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 animate-in overflow-hidden rounded-xl border border-zinc-800/20 bg-zinc-900 px-3 py-1.5 font-medium text-white text-xs shadow-md data-[state=closed]:animate-out dark:border-zinc-700/60 dark:bg-zinc-800",
          className
        )}
        sideOffset={sideOffset}
        {...props}
      >
        <div className="flex items-center gap-2">
          <span>{children}</span>
          {shortcut && (
            <kbd className="rounded border border-zinc-700/60 bg-zinc-800 px-1.5 py-0.5 font-mono text-3xs text-zinc-300 dark:border-zinc-600 dark:bg-zinc-700">
              {shortcut}
            </kbd>
          )}
        </div>
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
