"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { ComponentProps, ReactNode, Ref } from "react";

export interface InputProps extends Omit<ComponentProps<"input">, "size"> {
  error?: boolean | string;
  inputSize?: "default" | "sm";
  leftIcon?: ReactNode;
  ref?: Ref<HTMLInputElement>;
  rightIcon?: ReactNode;
}

export function Input({
  className,
  type = "text",
  inputSize = "default",
  error,
  leftIcon,
  rightIcon,
  disabled,
  id,
  ref,
  ...props
}: InputProps) {
  const hasError = Boolean(error);
  const sizeClasses =
    inputSize === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-xs";

  const baseInput = (
    <input
      aria-invalid={hasError ? "true" : undefined}
      className={cn(
        "w-full rounded-xl border bg-white font-medium text-xs text-zinc-900 shadow-2xs transition-all placeholder:text-zinc-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500",
        sizeClasses,
        hasError
          ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-red-500/80"
          : "border-zinc-200 hover:border-zinc-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:focus:border-blue-500 dark:focus:ring-blue-500/20 dark:hover:border-zinc-700",
        Boolean(leftIcon) && "pl-9",
        Boolean(rightIcon) && "pr-9",
        className
      )}
      disabled={disabled}
      id={id}
      ref={ref}
      type={type}
      {...props}
    />
  );

  if (!(leftIcon || rightIcon) && typeof error !== "string") {
    return baseInput;
  }

  return (
    <div className="w-full">
      <div className="relative flex w-full items-center">
        {leftIcon ? (
          <div className="pointer-events-none absolute left-3 flex items-center justify-center text-zinc-400 dark:text-zinc-500 [&_svg]:size-4">
            {leftIcon}
          </div>
        ) : null}
        {baseInput}
        {rightIcon ? (
          <div className="pointer-events-none absolute right-3 flex items-center justify-center text-zinc-400 dark:text-zinc-500 [&_svg]:size-4">
            {rightIcon}
          </div>
        ) : null}
      </div>
      {typeof error === "string" && error.length > 0 ? (
        <p className="mt-1 font-medium text-[11px] text-red-500 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
