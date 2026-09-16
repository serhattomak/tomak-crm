"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Label as LabelPrimitive } from "radix-ui";
import type { ComponentPropsWithoutRef, Ref } from "react";

export interface LabelProps
  extends ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  ref?: Ref<HTMLLabelElement>;
  required?: boolean;
}

export function Label({
  className,
  children,
  required,
  ref,
  ...props
}: LabelProps) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "flex select-none items-center gap-1 font-semibold text-2xs text-zinc-600 dark:text-zinc-400",
        className
      )}
      ref={ref}
      {...props}
    >
      <span>{children}</span>
      {required ? (
        <span aria-hidden="true" className="font-bold text-red-500">
          *
        </span>
      ) : null}
    </LabelPrimitive.Root>
  );
}
