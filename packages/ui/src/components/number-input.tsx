"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Minus, Plus } from "lucide-react";
import {
  type ChangeEvent,
  type ComponentProps,
  type ReactNode,
  type Ref,
  useEffect,
  useState,
} from "react";

export interface NumberInputProps
  extends Omit<
    ComponentProps<"input">,
    "onChange" | "value" | "size" | "prefix"
  > {
  error?: boolean | string;
  inputSize?: "default" | "sm";
  max?: number;
  min?: number;
  onChange?: (val: number) => void;
  precision?: number;
  prefix?: ReactNode;
  ref?: Ref<HTMLInputElement>;
  showStepper?: boolean;
  step?: number;
  suffix?: ReactNode;
  value?: number;
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix,
  suffix,
  showStepper = false,
  precision,
  className,
  disabled,
  error,
  inputSize = "default",
  id,
  ref,
  ...props
}: NumberInputProps) {
  const hasError = Boolean(error);
  const [internalVal, setInternalVal] = useState<string>(
    value !== undefined && value !== null ? String(value) : ""
  );

  useEffect(() => {
    if (value !== undefined && value !== null) {
      setInternalVal(String(value));
    } else {
      setInternalVal("");
    }
  }, [value]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInternalVal(raw);

    if (raw === "") {
      onChange?.(min ?? 0);
      return;
    }

    const num = Number.parseFloat(raw);
    if (!Number.isNaN(num)) {
      let clamped = num;
      if (min !== undefined && clamped < min) {
        clamped = min;
      }
      if (max !== undefined && clamped > max) {
        clamped = max;
      }
      onChange?.(clamped);
    }
  };

  const handleIncrement = () => {
    if (disabled) {
      return;
    }
    const current = value ?? 0;
    let next = current + step;
    if (max !== undefined && next > max) {
      next = max;
    }
    if (precision !== undefined) {
      next = Number(next.toFixed(precision));
    }
    onChange?.(next);
  };

  const handleDecrement = () => {
    if (disabled) {
      return;
    }
    const current = value ?? 0;
    let next = current - step;
    if (min !== undefined && next < min) {
      next = min;
    }
    if (precision !== undefined) {
      next = Number(next.toFixed(precision));
    }
    onChange?.(next);
  };

  const heightClass = inputSize === "sm" ? "h-8" : "h-9";

  const container = (
    <div
      className={cn(
        "group relative flex items-center overflow-hidden rounded-xl border bg-card shadow-2xs transition-all focus-within:ring-2",
        heightClass,
        hasError
          ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-500/20 dark:border-red-500/80"
          : "border-border focus-within:border-blue-500 focus-within:ring-blue-500/20 hover:border-zinc-300 dark:bg-zinc-900 dark:hover:border-zinc-700",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {prefix && (
        <span className="flex select-none items-center pl-3 font-semibold text-xs text-zinc-400 dark:text-zinc-500">
          {prefix}
        </span>
      )}

      <input
        aria-invalid={hasError ? "true" : undefined}
        className={cn(
          "w-full bg-transparent px-3 py-1.5 font-medium text-xs text-zinc-900 outline-none [appearance:textfield] placeholder:text-zinc-400 disabled:cursor-not-allowed dark:text-zinc-100 dark:placeholder:text-zinc-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          Boolean(prefix) && "pl-1.5",
          Boolean(suffix) && "pr-1.5"
        )}
        disabled={disabled}
        id={id}
        max={max}
        min={min}
        onChange={handleInputChange}
        ref={ref}
        step={step}
        type="number"
        value={internalVal}
        {...props}
      />

      {suffix && (
        <span className="flex select-none items-center pr-3 font-medium text-xs text-zinc-400 dark:text-zinc-500">
          {suffix}
        </span>
      )}

      {showStepper && !disabled && (
        <div className="flex h-full items-center border-border border-l">
          <button
            aria-label="Decrease value"
            className="flex h-full w-6 items-center justify-center text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 active:bg-zinc-200 dark:text-zinc-500 dark:active:bg-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            onClick={handleDecrement}
            tabIndex={-1}
            type="button"
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            aria-label="Increase value"
            className="flex h-full w-6 items-center justify-center border-border border-l text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 active:bg-zinc-200 dark:text-zinc-500 dark:active:bg-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            onClick={handleIncrement}
            tabIndex={-1}
            type="button"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );

  if (typeof error === "string") {
    return (
      <div className="w-full">
        {container}
        <p className="mt-1 font-medium text-red-500 text-xs dark:text-red-400">
          {error}
        </p>
      </div>
    );
  }

  return container;
}
