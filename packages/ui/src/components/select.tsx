"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import type * as React from "react";

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 font-medium text-xs text-zinc-900 shadow-2xs outline-none transition-all placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/20 dark:hover:border-zinc-700 dark:placeholder:text-zinc-500 [&>span]:line-clamp-1",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 opacity-80 dark:text-zinc-500" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      className={cn(
        "flex cursor-default items-center justify-center py-1 text-zinc-400 dark:text-zinc-500",
        className
      )}
      {...props}
    >
      <ChevronUp className="h-4 w-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      className={cn(
        "flex cursor-default items-center justify-center py-1 text-zinc-400 dark:text-zinc-500",
        className
      )}
      {...props}
    >
      <ChevronDown className="h-4 w-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          "fade-in-0 zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-96 min-w-[8rem] animate-in overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-1 text-zinc-900 shadow-lg backdrop-blur-md data-[state=closed]:animate-out dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100",
          position === "popper" &&
            "data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        sideOffset={sideOffset}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn(
        "px-2.5 py-1.5 font-bold text-[10px] text-zinc-400 uppercase tracking-wider dark:text-zinc-500",
        className
      )}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-xl py-2 pr-8 pl-2.5 font-medium text-xs text-zinc-700 outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 data-[disabled]:opacity-50 dark:text-zinc-300 dark:data-[highlighted]:bg-blue-950/40 dark:data-[highlighted]:text-blue-300",
        className
      )}
      {...props}
    >
      <span className="absolute right-2.5 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      className={cn("-mx-1 my-1 h-px bg-zinc-100 dark:bg-zinc-800", className)}
      {...props}
    />
  );
}

export interface SelectOption {
  disabled?: boolean;
  label: string;
  value: string;
}

export interface SelectFieldProps {
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  triggerClassName?: string;
  value?: string;
}

export function SelectField({
  "aria-label": ariaLabel,
  options,
  value,
  onChange,
  placeholder = "Seçiniz...",
  disabled = false,
  className,
  triggerClassName,
}: SelectFieldProps) {
  return (
    <Select disabled={disabled} onValueChange={onChange} value={value}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(triggerClassName, className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            disabled={option.disabled}
            key={option.value}
            value={option.value}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
