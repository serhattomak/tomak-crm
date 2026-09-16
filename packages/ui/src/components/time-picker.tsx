/* Hallmark · component: time-picker · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Clock, X } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { type MouseEvent, useMemo, useState } from "react";

export interface TimePickerProps {
  className?: string;
  clearable?: boolean;
  disabled?: boolean;
  maxTime?: string; // HH:mm
  minTime?: string; // HH:mm
  onChange?: (time: string) => void; // returns "HH:mm"
  placeholder?: string;
  stepMinutes?: number; // default 5
  value?: string; // "HH:mm" or "HH:mm:ss"
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

const QUICK_PRESETS = [
  "08:30",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:30",
  "14:00",
  "15:00",
  "16:30",
  "17:00",
  "18:00",
];

export function TimePicker({
  value = "",
  onChange,
  placeholder = "Saat seçiniz",
  disabled = false,
  className,
  clearable = true,
  stepMinutes = 5,
  minTime,
  maxTime,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);

  // Normalize value to "HH:mm"
  const normalizedValue = useMemo(() => {
    if (!value) return "";
    const parts = value.split(":");
    if (parts.length >= 2) {
      const h = parts[0]?.padStart(2, "0") || "00";
      const m = parts[1]?.padStart(2, "0") || "00";
      return `${h}:${m}`;
    }
    return value;
  }, [value]);

  const [currentHour, currentMinute] = useMemo(() => {
    if (!normalizedValue) return ["09", "00"];
    const [h, m] = normalizedValue.split(":");
    return [h || "09", m || "00"];
  }, [normalizedValue]);

  const minutes = useMemo(() => {
    const list: string[] = [];
    const step = Math.max(1, Math.min(60, stepMinutes));
    for (let i = 0; i < 60; i += step) {
      list.push(String(i).padStart(2, "0"));
    }
    // Also include currentMinute if not in step list
    if (currentMinute && !list.includes(currentMinute)) {
      list.push(currentMinute);
      list.sort((a, b) => Number(a) - Number(b));
    }
    return list;
  }, [stepMinutes, currentMinute]);

  const handleSelectTime = (hour: string, minute: string) => {
    const newTime = `${hour}:${minute}`;
    if (minTime && newTime < minTime) return;
    if (maxTime && newTime > maxTime) return;
    onChange?.(newTime);
  };

  const handleHourChange = (newHour: string) => {
    handleSelectTime(newHour, currentMinute);
  };

  const handleMinuteChange = (newMinute: string) => {
    handleSelectTime(currentHour, newMinute);
  };

  const handleSetNow = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    onChange?.(`${h}:${m}`);
    setOpen(false);
  };

  const handleClear = (e: MouseEvent) => {
    e.stopPropagation();
    onChange?.("");
  };

  return (
    <PopoverPrimitive.Root onOpenChange={setOpen} open={open}>
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        <button
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 font-medium text-xs text-zinc-800 shadow-2xs outline-none transition-all placeholder:text-muted-foreground",
            "hover:border-zinc-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/20 dark:hover:border-zinc-700 dark:placeholder:text-zinc-500",
            className
          )}
          type="button"
        >
          <div className="flex items-center gap-2 truncate">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span
              className={cn(
                "truncate font-mono",
                !normalizedValue &&
                  "font-sans font-normal text-muted-foreground"
              )}
            >
              {normalizedValue || placeholder}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {clearable && normalizedValue ? (
              <span
                className="rounded-full p-0.5 text-muted-foreground hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                onClick={handleClear}
                role="button"
                tabIndex={-1}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            ) : null}
          </div>
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          className="fade-in-0 zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 w-64 animate-in overflow-hidden rounded-2xl border border-border bg-card p-3 text-zinc-900 shadow-xl backdrop-blur-md data-[state=closed]:animate-out dark:text-zinc-100"
          sideOffset={4}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
            <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-800 dark:text-zinc-200">
              <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Saat Seçimi</span>
            </div>
            <button
              className="text-2xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
              onClick={handleSetNow}
              type="button"
            >
              Şu Anki Saat
            </button>
          </div>

          {/* Dual Scroll Columns: Saat & Dakika */}
          <div className="grid grid-cols-2 gap-2 border-b border-border pb-2.5">
            {/* Hours */}
            <div>
              <div className="text-3xs font-bold text-muted-foreground uppercase tracking-wider text-center mb-1">
                Saat
              </div>
              <div className="h-44 overflow-y-auto space-y-0.5 pr-1 no-scrollbar rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 p-1">
                {HOURS.map((h) => {
                  const isSelected = h === currentHour;
                  return (
                    <button
                      className={cn(
                        "w-full py-1.5 text-xs font-mono font-medium rounded-lg text-center transition-all",
                        isSelected
                          ? "bg-blue-600 text-white font-bold shadow-xs"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60"
                      )}
                      key={h}
                      onClick={() => handleHourChange(h)}
                      type="button"
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes */}
            <div>
              <div className="text-3xs font-bold text-muted-foreground uppercase tracking-wider text-center mb-1">
                Dakika
              </div>
              <div className="h-44 overflow-y-auto space-y-0.5 pr-1 no-scrollbar rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 p-1">
                {minutes.map((m) => {
                  const isSelected = m === currentMinute;
                  return (
                    <button
                      className={cn(
                        "w-full py-1.5 text-xs font-mono font-medium rounded-lg text-center transition-all",
                        isSelected
                          ? "bg-blue-600 text-white font-bold shadow-xs"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60"
                      )}
                      key={m}
                      onClick={() => handleMinuteChange(m)}
                      type="button"
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Preset Chips */}
          <div className="pt-2">
            <div className="text-3xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Hızlı Seçenekler
            </div>
            <div className="flex flex-wrap gap-1">
              {QUICK_PRESETS.map((preset) => {
                const isSelected = preset === normalizedValue;
                return (
                  <button
                    className={cn(
                      "px-2 py-0.5 text-2xs font-mono rounded-md border transition-all",
                      isSelected
                        ? "bg-blue-50 border-blue-500 text-blue-700 font-bold dark:bg-blue-950/60 dark:border-blue-400 dark:text-blue-300"
                        : "border-border text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                    key={preset}
                    onClick={() => {
                      onChange?.(preset);
                      setOpen(false);
                    }}
                    type="button"
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
