"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { ComponentProps, Ref } from "react";

export interface TextareaProps extends ComponentProps<"textarea"> {
  error?: boolean | string;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({
  className,
  error,
  disabled,
  id,
  ref,
  ...props
}: TextareaProps) {
  const hasError = Boolean(error);

  const baseTextarea = (
    <textarea
      aria-invalid={hasError ? "true" : undefined}
      className={cn(
        "w-full rounded-xl border bg-white p-3 font-medium text-xs text-zinc-900 shadow-2xs transition-all placeholder:text-zinc-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500",
        hasError
          ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-red-500/80"
          : "border-zinc-200 hover:border-zinc-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:focus:border-blue-500 dark:focus:ring-blue-500/20 dark:hover:border-zinc-700",
        className
      )}
      disabled={disabled}
      id={id}
      ref={ref}
      {...props}
    />
  );

  if (typeof error !== "string" || error.length === 0) {
    return baseTextarea;
  }

  return (
    <div className="w-full">
      {baseTextarea}
      <p className="mt-1 font-medium text-[11px] text-red-500 dark:text-red-400">
        {error}
      </p>
    </div>
  );
}
