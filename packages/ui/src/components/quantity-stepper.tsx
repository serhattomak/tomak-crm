"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Minus, Plus } from "lucide-react";
import * as React from "react";

export interface QuantityStepperProps {
  className?: string;
  disabled?: boolean;
  id?: string;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  value: number;
}

export function QuantityStepper({
  className,
  disabled = false,
  id,
  max,
  min = 1,
  onChange,
  value,
}: QuantityStepperProps) {
  const inputId = React.useId();
  const resolvedId = id ?? inputId;

  const clamp = React.useCallback(
    (next: number) => {
      let clamped = Number.isFinite(next) ? Math.trunc(next) : min;
      clamped = Math.max(min, clamped);
      if (typeof max === "number") {
        clamped = Math.min(max, clamped);
      }
      return clamped;
    },
    [max, min]
  );

  const handleDecrement = () => {
    if (disabled) {
      return;
    }
    onChange(clamp(value - 1));
  };

  const handleIncrement = () => {
    if (disabled) {
      return;
    }
    onChange(clamp(value + 1));
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.replace(/[^0-9-]/g, "");
    if (raw === "" || raw === "-") {
      return;
    }
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      return;
    }
    onChange(clamp(parsed));
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const parsed = Number.parseInt(event.target.value, 10);
    if (Number.isNaN(parsed)) {
      onChange(min);
      return;
    }
    onChange(clamp(parsed));
  };

  const isMin = value <= min;
  const isMax = typeof max === "number" ? value >= max : false;

  return (
    <div
      className={cn(
        "inline-flex items-center overflow-hidden rounded-store border border-store-border bg-store-surface shadow-store-sm",
        disabled && "opacity-50",
        className
      )}
    >
      <button
        aria-label="Azalt"
        className="flex h-9 w-9 shrink-0 items-center justify-center text-store-surface-foreground transition-colors hover:bg-store-muted disabled:opacity-40"
        disabled={disabled || isMin}
        onClick={handleDecrement}
        type="button"
      >
        <Minus aria-hidden="true" className="h-4 w-4" />
      </button>

      <input
        aria-label="Adet"
        className="h-9 w-12 border-store-border border-x bg-transparent text-center font-semibold text-sm text-store-surface-foreground outline-none focus-visible:bg-store-muted/50"
        disabled={disabled}
        id={resolvedId}
        inputMode="numeric"
        onBlur={handleBlur}
        onChange={handleInputChange}
        pattern="[0-9]*"
        type="text"
        value={String(value)}
      />

      <button
        aria-label="Artır"
        className="flex h-9 w-9 shrink-0 items-center justify-center text-store-surface-foreground transition-colors hover:bg-store-muted disabled:opacity-40"
        disabled={disabled || isMax}
        onClick={handleIncrement}
        type="button"
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
