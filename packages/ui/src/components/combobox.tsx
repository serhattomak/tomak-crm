"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import {
  type ChangeEvent,
  type JSX,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";

export interface ComboboxOption {
  badge?: string;
  description?: string;
  icon?: ReactNode;
  label: string;
  value: string;
}

export interface ComboboxProps {
  "aria-label"?: string;
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

interface OptionRowProps {
  isSelected: boolean;
  onSelect: (value: string) => void;
  option: ComboboxOption;
}

function OptionRow({
  isSelected,
  onSelect,
  option,
}: OptionRowProps): JSX.Element {
  const handleClick = useCallback((): void => {
    onSelect(option.value);
  }, [onSelect, option.value]);

  return (
    <button
      aria-pressed={isSelected}
      className={cn(
        "flex w-full cursor-pointer select-none items-center justify-between rounded-xl bg-transparent px-2.5 py-2 text-left font-semibold text-xs transition-colors",
        isSelected
          ? "bg-blue-50 font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
          : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      )}
      onClick={handleClick}
      type="button"
    >
      <span className="flex items-center gap-2 truncate">
        {option.icon ? <span className="shrink-0">{option.icon}</span> : null}
        <span className="block min-w-0">
          <span className="block truncate">{option.label}</span>
          {option.description ? (
            <span
              className={cn(
                "block font-normal text-3xs",
                isSelected
                  ? "text-blue-600/80 dark:text-blue-300/80"
                  : "text-muted-foreground"
              )}
            >
              {option.description}
            </span>
          ) : null}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-1.5">
        {option.badge ? (
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 font-bold text-3xs",
              isSelected
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            )}
          >
            {option.badge}
          </span>
        ) : null}
        {isSelected ? (
          <Check className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
        ) : null}
      </span>
    </button>
  );
}

export function Combobox({
  "aria-label": ariaLabel,
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
}: ComboboxProps): JSX.Element {
  const [open, setOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");

  const selectedOption: ComboboxOption | undefined = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const displayLabel: string =
    selectedOption === undefined ? placeholder : selectedOption.label;

  const filteredOptions = useMemo((): ComboboxOption[] => {
    if (!search.trim()) {
      return options;
    }
    const query = search.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.description?.toLowerCase().includes(query) ?? false)
    );
  }, [options, search]);

  const handleSelect = useCallback(
    (val: string): void => {
      onChange?.(val);
      setOpen(false);
      setSearch("");
    },
    [onChange]
  );

  const clearSelection = useCallback((): void => {
    onChange?.("");
    setSearch("");
  }, [onChange]);

  const handleClear = useCallback(
    (event: MouseEvent): void => {
      event.stopPropagation();
      clearSelection();
    },
    [clearSelection]
  );

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setSearch(event.target.value);
    },
    []
  );

  const handleResetSearch = useCallback((): void => {
    setSearch("");
  }, []);

  return (
    <PopoverPrimitive.Root onOpenChange={setOpen} open={open}>
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        <button
          aria-expanded={open}
          aria-label={ariaLabel}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 font-semibold text-xs text-zinc-800 shadow-2xs outline-none transition-all placeholder:text-muted-foreground hover:border-zinc-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-100 dark:hover:border-zinc-700 dark:placeholder:text-zinc-500",
            triggerClassName
          )}
          role="combobox"
          type="button"
        >
          <span className="flex items-center gap-2 truncate">
            {selectedOption?.icon ? (
              <span className="shrink-0">{selectedOption.icon}</span>
            ) : null}
            <span
              className={cn(
                "truncate",
                selectedOption
                  ? null
                  : "font-normal text-muted-foreground"
              )}
            >
              {displayLabel}
            </span>
          </span>

          <span className="flex shrink-0 items-center gap-1">
            {clearable === true && value !== undefined && value !== "" ? (
              <button
                aria-label="Temizle"
                className="rounded-full bg-transparent p-0.5 text-muted-foreground hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                onClick={handleClear}
                type="button"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <ChevronDown className="h-4 w-4 text-muted-foreground opacity-80" />
          </span>
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          className={cn(
            "fade-in-0 zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 z-50 w-[var(--radix-popover-trigger-width)] min-w-[12rem] animate-in overflow-hidden rounded-2xl border border-border bg-card p-1.5 text-zinc-900 shadow-lg backdrop-blur-md data-[state=closed]:animate-out dark:text-zinc-100",
            className
          )}
          sideOffset={4}
        >
          {/* Search Box */}
          <div className="relative mb-1 flex items-center border-border border-b px-2 pb-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              className="w-full bg-transparent px-2 font-medium text-xs text-zinc-900 outline-none placeholder:text-muted-foreground dark:text-zinc-100 dark:placeholder:text-zinc-500"
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
              type="text"
              value={search}
            />
            {search.length > 0 ? (
              <button
                aria-label="Aramayı temizle"
                className="text-muted-foreground hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                onClick={handleResetSearch}
                type="button"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          {/* List */}
          <div className="max-h-60 space-y-0.5 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <OptionRow
                  isSelected={option.value === value}
                  key={option.value}
                  onSelect={handleSelect}
                  option={option}
                />
              ))
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
