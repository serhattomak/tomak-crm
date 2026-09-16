"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Check, Minus } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { useId } from "react";

export interface CheckboxProps
  extends ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  description?: ReactNode;
  label?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function Checkbox({
  className,
  label,
  description,
  id,
  disabled,
  checked,
  ref,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id || (label ? generatedId : undefined);

  const checkboxNode = (
    <CheckboxPrimitive.Root
      checked={checked}
      className={cn(
        "peer size-4 shrink-0 rounded-md border border-zinc-300 bg-white outline-none transition-all",
        "hover:border-zinc-400 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20",
        "data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white",
        "data-[state=indeterminate]:border-blue-600 data-[state=indeterminate]:bg-blue-600 data-[state=indeterminate]:text-white",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600",
        "dark:data-[state=checked]:border-blue-500 dark:data-[state=checked]:bg-blue-500",
        "dark:data-[state=indeterminate]:border-blue-500 dark:data-[state=indeterminate]:bg-blue-500",
        className
      )}
      disabled={disabled}
      id={inputId}
      ref={ref}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn(
          "zoom-in-75 flex animate-in items-center justify-center text-current duration-100"
        )}
      >
        {checked === "indeterminate" ? (
          <Minus className="size-3 stroke-[3]" />
        ) : (
          <Check className="size-3 stroke-[3]" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );

  if (!(label || description)) {
    return checkboxNode;
  }

  return (
    <div className="flex select-none items-start gap-2.5">
      <div className="pt-0.5">{checkboxNode}</div>
      <div className="grid gap-0.5 text-xs">
        {label ? (
          <label
            className={cn(
              "cursor-pointer font-medium text-zinc-800 dark:text-zinc-200",
              disabled && "cursor-not-allowed opacity-50"
            )}
            htmlFor={inputId}
          >
            {label}
          </label>
        ) : null}
        {description ? (
          <p className="text-2xs text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
