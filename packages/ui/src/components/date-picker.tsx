"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import * as React from "react";

const TURKISH_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

const TURKISH_DAYS_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange?: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minDate?: string;
  maxDate?: string;
  clearable?: boolean;
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
  const [open, setOpen] = React.useState(false);

  // Current viewed month/year in calendar
  const initialDate = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = React.useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(initialDate.getMonth()); // 0-11

  // Format YYYY-MM-DD
  const formatDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Format Turkish display (15 Mart 2026)
  const displayFormatted = React.useMemo(() => {
    if (!value) return null;
    const parts = value.split("-");
    const p0 = parts[0];
    const p1 = parts[1];
    const p2 = parts[2];
    if (parts.length !== 3 || !p0 || !p1 || !p2) return value;
    const y = parseInt(p0, 10);
    const m = parseInt(p1, 10) - 1;
    const d = parseInt(p2, 10);
    if (isNaN(y) || isNaN(m) || isNaN(d) || !TURKISH_MONTHS[m]) return value;
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
  const calendarDays = React.useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);

    // Monday as 0, Sunday as 6
    let startingDay = firstDayOfMonth.getDay() - 1;
    if (startingDay === -1) startingDay = 6;

    const totalDays = lastDayOfMonth.getDate();
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

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

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.("");
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <CalendarIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <span
              className={cn(
                "truncate",
                !value && "font-normal text-slate-400"
              )}
            >
              {displayFormatted || placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {clearable && value && (
              <span
                onClick={handleClear}
                className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 w-72 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3 text-slate-900 shadow-xl backdrop-blur-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          {/* Header Month / Year Navigation */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="text-xs font-bold text-slate-900">
              {TURKISH_MONTHS[viewMonth]} {viewYear}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 pt-2 pb-1 text-center text-[10px] font-bold text-slate-400">
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
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(d.dateStr)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl font-semibold transition-all text-xs",
                    !d.isCurrentMonth && "text-slate-300",
                    d.isCurrentMonth &&
                      !isSelected &&
                      "text-slate-700 hover:bg-blue-50 hover:text-blue-700",
                    isToday &&
                      !isSelected &&
                      "border border-blue-300 bg-blue-50/50 text-blue-700 font-bold",
                    isSelected &&
                      "bg-blue-600 text-white font-bold shadow-xs hover:bg-blue-700"
                  )}
                >
                  {d.dayNum}
                </button>
              );
            })}
          </div>

          {/* Quick Preset Footers */}
          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 text-[11px]">
            <button
              type="button"
              onClick={handleSetToday}
              className="font-bold text-blue-600 hover:text-blue-700"
            >
              Bugün
            </button>
            <button
              type="button"
              onClick={() => {
                onChange?.("");
                setOpen(false);
              }}
              className="text-slate-400 hover:text-slate-600"
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
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  onChange?: (range: { startDate: string; endDate: string }) => void;
  placeholder?: string;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  placeholder = "Tarih aralığı seçiniz",
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const displayString = React.useMemo(() => {
    if (startDate && endDate) {
      return `${startDate} → ${endDate}`;
    }
    if (startDate) {
      return `${startDate} → ...`;
    }
    return placeholder;
  }, [startDate, endDate, placeholder]);

  const handleQuickPreset = (preset: "today" | "thisMonth" | "lastMonth" | "last30Days" | "thisYear") => {
    const now = new Date();
    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    if (preset === "today") {
      const today = formatDate(now);
      onChange?.({ startDate: today, endDate: today });
    } else if (preset === "thisMonth") {
      const start = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
      const end = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      onChange?.({ startDate: start, endDate: end });
    } else if (preset === "lastMonth") {
      const start = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const end = formatDate(new Date(now.getFullYear(), now.getMonth(), 0));
      onChange?.({ startDate: start, endDate: end });
    } else if (preset === "last30Days") {
      const start = formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
      const end = formatDate(now);
      onChange?.({ startDate: start, endDate: end });
    } else if (preset === "thisYear") {
      const start = formatDate(new Date(now.getFullYear(), 0, 1));
      const end = formatDate(new Date(now.getFullYear(), 11, 31));
      onChange?.({ startDate: start, endDate: end });
    }
    setOpen(false);
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs outline-none transition-all hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 text-slate-400" />
          <span>{displayString}</span>
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 w-64 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3 text-slate-900 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        >
          <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">
            Hızlı Tarih Filtreleri
          </div>
          <div className="space-y-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleQuickPreset("today")}
              className="w-full text-left px-2.5 py-1.5 rounded-xl text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Bugün
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset("thisMonth")}
              className="w-full text-left px-2.5 py-1.5 rounded-xl text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Bu Ay
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset("lastMonth")}
              className="w-full text-left px-2.5 py-1.5 rounded-xl text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Geçen Ay
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset("last30Days")}
              className="w-full text-left px-2.5 py-1.5 rounded-xl text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Son 30 Gün
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset("thisYear")}
              className="w-full text-left px-2.5 py-1.5 rounded-xl text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Bu Yıl
            </button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
