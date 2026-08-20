"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Minus, Plus } from "lucide-react";
import * as React from "react";

export interface NumberInputProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value?: number;
  onChange?: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  showStepper?: boolean;
  precision?: number;
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

    const num = parseFloat(raw);
    if (!isNaN(num)) {
      let clamped = num;
      if (min !== undefined && clamped < min) clamped = min;
      if (max !== undefined && clamped > max) clamped = max;
      onChange?.(clamped);
    }
  };

  const handleIncrement = () => {
    if (disabled) return;
    const current = value ?? 0;
    let next = current + step;
    if (max !== undefined && next > max) next = max;
    if (precision !== undefined) next = Number(next.toFixed(precision));
    onChange?.(next);
  };

  const handleDecrement = () => {
    if (disabled) return;
    const current = value ?? 0;
    let next = current - step;
    if (min !== undefined && next < min) next = min;
    if (precision !== undefined) next = Number(next.toFixed(precision));
    onChange?.(next);
  };

  return (
    <div
      className={cn(
        "group relative flex h-9 items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 hover:border-slate-300",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {prefix && (
        <span className="pl-3 text-xs font-bold text-slate-400 select-none">
          {prefix}
        </span>
      )}

      <input
        type="number"
        value={internalVal}
        onChange={handleInputChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={cn(
          "w-full bg-transparent px-3 py-1.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          prefix && "pl-1.5",
          suffix && "pr-1"
        )}
        {...props}
      />

      {suffix && (
        <span className="pr-2 text-xs font-medium text-slate-400 select-none">
          {suffix}
        </span>
      )}

      {showStepper && !disabled && (
        <div className="flex h-full items-center border-l border-slate-100">
          <button
            type="button"
            tabIndex={-1}
            onClick={handleDecrement}
            className="flex h-full w-6 items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600 active:bg-blue-100 transition-colors"
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={handleIncrement}
            className="flex h-full w-6 items-center justify-center border-l border-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-600 active:bg-blue-100 transition-colors"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
