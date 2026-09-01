"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Minus, Plus } from "lucide-react";
import * as React from "react";

export interface NumberInputProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  max?: number;
  min?: number;
  onChange?: (val: number) => void;
  precision?: number;
  prefix?: string;
  showStepper?: boolean;
  step?: number;
  suffix?: string;
  value?: number;
}

export function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  prefix,
  suffix,
  showStepper = true,
  precision,
  className,
  disabled,
  ...props
}: NumberInputProps) {
  const [internalVal, setInternalVal] = React.useState<string>(
    value !== undefined && value !== null ? String(value) : ""
  );

  React.useEffect(() => {
    if (value !== undefined && value !== null) {
      setInternalVal(String(value));
    } else {
      setInternalVal("");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  return (
    <div
      className={cn(
        "group relative flex h-9 items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 hover:border-slate-300",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {prefix && (
        <span className="select-none pl-3 font-bold text-slate-400 text-xs">
          {prefix}
        </span>
      )}

      <input
        className={cn(
          "w-full bg-transparent px-3 py-1.5 font-semibold text-slate-900 text-xs outline-none [appearance:textfield] placeholder:text-slate-400 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          prefix && "pl-1.5",
          suffix && "pr-1"
        )}
        disabled={disabled}
        max={max}
        min={min}
        onChange={handleInputChange}
        step={step}
        type="number"
        value={internalVal}
        {...props}
      />

      {suffix && (
        <span className="select-none pr-2 font-medium text-slate-400 text-xs">
          {suffix}
        </span>
      )}

      {showStepper && !disabled && (
        <div className="flex h-full items-center border-slate-100 border-l">
          <button
            className="flex h-full w-6 items-center justify-center text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 active:bg-blue-100"
            onClick={handleDecrement}
            tabIndex={-1}
            type="button"
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            className="flex h-full w-6 items-center justify-center border-slate-100 border-l text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 active:bg-blue-100"
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
}
