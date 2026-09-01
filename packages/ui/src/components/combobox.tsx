"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import * as React from "react";

export interface ComboboxOption {
  badge?: string;
  description?: string;
  icon?: React.ReactNode;
  label: string;
  value: string;
}

export interface ComboboxProps {
  className?: string;
  clearable?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
  onChange?: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  triggerClassName?: string;
  value?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Seçiniz...",
  searchPlaceholder = "Ara...",
  emptyMessage = "Sonuç bulunamadı.",
  disabled = false,
  className,
  triggerClassName,
  clearable = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedOption = React.useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) {
      return options;
    }
    const query = search.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        opt.description?.toLowerCase().includes(query)
    );
  }, [options, search]);

  const handleSelect = (val: string) => {
    onChange?.(val);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.("");
    setSearch("");
  };

  return (
    <PopoverPrimitive.Root onOpenChange={setOpen} open={open}>
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        <button
          aria-expanded={open}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-800 text-xs shadow-2xs outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50",
            triggerClassName
          )}
          role="combobox"
          type="button"
        >
          <div className="flex items-center gap-2 truncate">
            {selectedOption?.icon && (
              <span className="shrink-0">{selectedOption.icon}</span>
            )}
            <span
              className={cn(
                "truncate",
                !selectedOption && "font-normal text-slate-400"
              )}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {clearable && value && (
              <span
                className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={handleClear}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown className="h-4 w-4 text-slate-400 opacity-80" />
          </div>
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          className={cn(
            "fade-in-0 zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 w-[var(--radix-popover-trigger-width)] min-w-[12rem] animate-in overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-1.5 text-slate-900 shadow-lg backdrop-blur-md data-[state=closed]:animate-out",
            className
          )}
          sideOffset={4}
        >
          {/* Search Box */}
          <div className="relative mb-1 flex items-center border-slate-100 border-b px-2 pb-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <input
              autoFocus
              className="w-full bg-transparent px-2 font-medium text-slate-900 text-xs outline-none placeholder:text-slate-400"
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              type="text"
              value={search}
            />
            {search && (
              <button
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setSearch("")}
                type="button"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-60 space-y-0.5 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <div
                    className={cn(
                      "flex cursor-pointer select-none items-center justify-between rounded-xl px-2.5 py-2 font-semibold text-xs transition-colors",
                      isSelected
                        ? "bg-blue-50 font-bold text-blue-700"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    )}
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {option.icon && (
                        <span className="shrink-0">{option.icon}</span>
                      )}
                      <div>
                        <div className="truncate">{option.label}</div>
                        {option.description && (
                          <div
                            className={cn(
                              "font-normal text-[10px]",
                              isSelected ? "text-blue-600/80" : "text-slate-400"
                            )}
                          >
                            {option.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {option.badge && (
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 font-bold text-[10px]",
                            isSelected
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          )}
                        >
                          {option.badge}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
