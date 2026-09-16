/* Hallmark · component: date-picker · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import { cn } from "@workspace/ui/lib/utils";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { type MouseEvent, useMemo, useState } from "react";

const TURKISH_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

const TURKISH_DAYS_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function formatDateString(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface DatePickerProps {
  className?: string;
  clearable?: boolean;
  disabled?: boolean;
  maxDate?: string;
  minDate?: string;
  onChange?: (date: string) => void;
  placeholder?: string;
  value?: string; // YYYY-MM-DD
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Tarih seçiniz",
  disabled = false,
  className,
  minDate,
  maxDate,
  clearable = true,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  // Current viewed month/year in calendar
  const initialDate = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0-11

  // Format Turkish display (15 Mart 2026)
  const displayFormatted = useMemo(() => {
    if (!value) {
      return null;
    }
    const parts = value.split("-");
    const p0 = parts[0];
    const p1 = parts[1];
    const p2 = parts[2];
    if (parts.length !== 3 || !p0 || !p1 || !p2) {
      return value;
    }
    const y = Number.parseInt(p0, 10);
    const m = Number.parseInt(p1, 10) - 1;
    const d = Number.parseInt(p2, 10);
    if (
      Number.isNaN(y) ||
      Number.isNaN(m) ||
      Number.isNaN(d) ||
      !TURKISH_MONTHS[m]
    ) {
      return value;
    }
    return `${d} ${TURKISH_MONTHS[m]} ${y}`;
  }, [value]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Calculate days in current month view
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);

    // Monday as 0, Sunday as 6
    let startingDay = firstDayOfMonth.getDay() - 1;
    if (startingDay === -1) {
      startingDay = 6;
    }

    const totalDays = lastDayOfMonth.getDate();
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] =
      [];

    // Prev month padding
    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = formatDateString(new Date(prevY, prevM, d));
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = formatDateString(new Date(viewYear, viewMonth, d));
      days.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }

    // Next month padding to 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = formatDateString(new Date(nextY, nextM, d));
      days.push({ dateStr, dayNum: d, isCurrentMonth: false });
    }

    return days;
  }, [viewYear, viewMonth]);

  const handleSelectDay = (dateStr: string) => {
    onChange?.(dateStr);
    setOpen(false);
  };

  const handleSetToday = () => {
    const todayStr = formatDateString(new Date());
    onChange?.(todayStr);
    setViewYear(new Date().getFullYear());
    setViewMonth(new Date().getMonth());
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
            "flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 font-medium text-xs text-zinc-800 shadow-2xs outline-none transition-all placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/20 dark:hover:border-zinc-700 dark:placeholder:text-zinc-500",
            className
          )}
          type="button"
        >
          <div className="flex items-center gap-2 truncate">
            <CalendarIcon className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
            <span
              className={cn(
                "truncate",
                !value && "font-normal text-zinc-400 dark:text-zinc-500"
              )}
            >
              {displayFormatted || placeholder}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {clearable && value ? (
              <span
                className="rounded-full p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                onClick={handleClear}
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
          className="fade-in-0 zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 w-72 animate-in overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-3 text-zinc-900 shadow-xl backdrop-blur-md data-[state=closed]:animate-out dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          sideOffset={4}
        >
          {/* Header Month / Year Navigation */}
          <div className="flex items-center justify-between border-zinc-100 border-b pb-2 dark:border-zinc-800">
            <button
              className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:hover:text-zinc-400"
              onClick={handlePrevMonth}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
              {TURKISH_MONTHS[viewMonth]} {viewYear}
            </div>

            <button
              className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:hover:text-zinc-400"
              onClick={handleNextMonth}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 pt-2 pb-1 text-center font-bold text-3xs text-zinc-400 dark:text-zinc-500">
            {TURKISH_DAYS_SHORT.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {calendarDays.map((d, idx) => {
              const isSelected = value === d.dateStr;
              const isToday = formatDateString(new Date()) === d.dateStr;

              return (
                <button
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl font-semibold text-xs transition-all",
                    !d.isCurrentMonth && "text-zinc-300 dark:text-zinc-600",
                    d.isCurrentMonth &&
                      !isSelected &&
                      "text-zinc-700 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-zinc-800 dark:hover:text-blue-300 dark:hover:text-zinc-300",
                    isToday &&
                      !isSelected &&
                      "border border-blue-300 bg-blue-50/50 font-bold text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
                    isSelected &&
                      "bg-blue-600 font-bold text-white shadow-xs hover:bg-blue-700"
                  )}
                  key={d.dateStr}
                  onClick={() => handleSelectDay(d.dateStr)}
                  type="button"
                >
                  {d.dayNum}
                </button>
              );
            })}
          </div>

          {/* Quick Preset Footers */}
          <div className="mt-2 flex items-center justify-between border-zinc-100 border-t pt-2.5 text-2xs dark:border-zinc-800">
            <button
              className="font-bold text-blue-600 hover:text-blue-700 dark:hover:text-blue-400"
              onClick={handleSetToday}
              type="button"
            >
              Bugün
            </button>
            <button
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 dark:hover:text-zinc-500"
              onClick={() => {
                onChange?.("");
                setOpen(false);
              }}
              type="button"
            >
              Temizle
            </button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export interface DateRangePickerProps {
  className?: string;
  endDate?: string; // YYYY-MM-DD
  onChange?: (range: { startDate: string; endDate: string }) => void;
  placeholder?: string;
  startDate?: string; // YYYY-MM-DD
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  placeholder = "Tarih aralığı seçiniz",
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const displayString = useMemo(() => {
    if (startDate && endDate) {
      return `${startDate} → ${endDate}`;
    }
    if (startDate) {
      return `${startDate} → ...`;
    }
    return placeholder;
  }, [startDate, endDate, placeholder]);

  const handleQuickPreset = (
    preset: "today" | "thisMonth" | "lastMonth" | "last30Days" | "thisYear"
  ) => {
    const now = new Date();
    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    if (preset === "today") {
      const today = formatDate(now);
      onChange?.({ endDate: today, startDate: today });
    } else if (preset === "thisMonth") {
      const start = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
      const end = formatDate(
        new Date(now.getFullYear(), now.getMonth() + 1, 0)
      );
      onChange?.({ endDate: end, startDate: start });
    } else if (preset === "lastMonth") {
      const start = formatDate(
        new Date(now.getFullYear(), now.getMonth() - 1, 1)
      );
      const end = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));
      onChange?.({ endDate: end, startDate: start });
    } else if (preset === "last30Days") {
      const start = formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      const end = formatDate(now);
      onChange?.({ endDate: end, startDate: start });
    } else if (preset === "thisYear") {
      const start = formatDate(new Date(now.getFullYear(), 0, 1));
      const end = formatDate(new Date(now.getFullYear(), 11, 31));
      onChange?.({ endDate: end, startDate: start });
    }
    setOpen(false);
  };

  return (
    <PopoverPrimitive.Root onOpenChange={setOpen} open={open}>
      <PopoverPrimitive.Trigger asChild>
        <button
          className={cn(
            "flex h-9 items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 font-medium text-xs text-zinc-800 shadow-2xs outline-none transition-all hover:border-zinc-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/20 dark:hover:border-zinc-700",
            className
          )}
          type="button"
        >
          <CalendarIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
          <span>{displayString}</span>
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          className="z-50 w-64 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-3 text-zinc-900 shadow-xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          sideOffset={4}
        >
          <div className="mb-2 font-bold text-3xs text-zinc-400 uppercase tracking-wider dark:text-zinc-500">
            Hızlı Tarih Filtreleri
          </div>
          <div className="space-y-1 font-semibold text-xs">
            <button
              className="w-full rounded-xl px-2.5 py-1.5 text-left text-zinc-700 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-zinc-800 dark:hover:text-blue-300 dark:hover:text-zinc-300"
              onClick={() => handleQuickPreset("today")}
              type="button"
            >
              Bugün
            </button>
            <button
              className="w-full rounded-xl px-2.5 py-1.5 text-left text-zinc-700 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-zinc-800 dark:hover:text-blue-300 dark:hover:text-zinc-300"
              onClick={() => handleQuickPreset("thisMonth")}
              type="button"
            >
              Bu Ay
            </button>
            <button
              className="w-full rounded-xl px-2.5 py-1.5 text-left text-zinc-700 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-zinc-800 dark:hover:text-blue-300 dark:hover:text-zinc-300"
              onClick={() => handleQuickPreset("lastMonth")}
              type="button"
            >
              Geçen Ay
            </button>
            <button
              className="w-full rounded-xl px-2.5 py-1.5 text-left text-zinc-700 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-zinc-800 dark:hover:text-blue-300 dark:hover:text-zinc-300"
              onClick={() => handleQuickPreset("last30Days")}
              type="button"
            >
              Son 30 Gün
            </button>
            <button
              className="w-full rounded-xl px-2.5 py-1.5 text-left text-zinc-700 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-zinc-800 dark:hover:text-blue-300 dark:hover:text-zinc-300"
              onClick={() => handleQuickPreset("thisYear")}
              type="button"
            >
              Bu Yıl
            </button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
