/* Hallmark · component: phone-input · genre: modern-minimal · theme: Adaptive Zinc/Violet */
"use client";

import { Check, Phone, AlertCircle } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

interface PhoneInputProps {
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  onChange: (value: string, isValid: boolean) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
}

export function formatPhoneNumber(input: string): string {
  if (!input) return "";

  // Normalize: keep leading plus and numbers only
  const hasPlus = input.trim().startsWith("+");
  const digits = input.replace(/\D/g, "");

  if (!digits) {
    return hasPlus ? "+" : "";
  }

  // If starts with 90 or 0
  let cleanDigits = digits;
  if (cleanDigits.startsWith("90") && cleanDigits.length > 2) {
    cleanDigits = cleanDigits.slice(2);
  } else if (cleanDigits.startsWith("0") && cleanDigits.length > 1) {
    cleanDigits = cleanDigits.slice(1);
  }

  // Format as +90 (5XX) XXX XX XX
  const limited = cleanDigits.slice(0, 10);
  let formatted = "+90 ";

  if (limited.length > 0) {
    formatted += `(${limited.slice(0, 3)}`;
  }
  if (limited.length >= 3) {
    formatted += `) ${limited.slice(3, 6)}`;
  }
  if (limited.length >= 6) {
    formatted += ` ${limited.slice(6, 8)}`;
  }
  if (limited.length >= 8) {
    formatted += ` ${limited.slice(8, 10)}`;
  }

  return formatted.trim();
}

export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  // For TR numbers: 10 digits starting with 5 (e.g. 5321234567) or 12 digits starting with 905
  if (digits.length === 10 && digits.startsWith("5")) {
    return true;
  }
  if (digits.length === 12 && digits.startsWith("905")) {
    return true;
  }
  if (digits.length === 11 && digits.startsWith("05")) {
    return true;
  }
  // Generic international validity: 9 to 15 digits
  return digits.length >= 10 && digits.length <= 15;
}

export function PhoneInput({
  value,
  onChange,
  placeholder = "+90 (5XX) XXX XX XX",
  disabled = false,
  required = false,
  autoFocus = false,
  className = "",
  id,
  name,
}: PhoneInputProps) {
  const [displayValue, setDisplayValue] = useState(() => formatPhoneNumber(value));
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setDisplayValue(formatPhoneNumber(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatPhoneNumber(raw);
    const valid = validatePhoneNumber(formatted);
    setDisplayValue(formatted);
    onChange(formatted, valid);
  };

  const isValid = validatePhoneNumber(displayValue);
  const showError = touched && displayValue.length > 0 && !isValid;

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-3 flex items-center text-zinc-400 dark:text-zinc-500">
          <Phone className="h-3.5 w-3.5" />
        </div>
        <input
          autoFocus={autoFocus}
          className={`w-full rounded-xl border bg-white py-2 pr-9 pl-9 text-xs text-zinc-900 placeholder:text-zinc-400 transition-all focus:outline-none dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 ${
            showError
              ? "border-rose-400 focus:border-rose-500 dark:border-rose-500"
              : isValid
              ? "border-emerald-300 focus:border-emerald-500 dark:border-emerald-700"
              : "border-zinc-200 focus:border-violet-500 dark:border-zinc-700 dark:focus:border-violet-400"
          } ${disabled ? "cursor-not-allowed opacity-60" : ""} ${className}`}
          disabled={disabled}
          id={id}
          name={name}
          onBlur={() => setTouched(true)}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          type="tel"
          value={displayValue}
        />
        <div className="pointer-events-none absolute right-3 flex items-center">
          {isValid ? (
            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : showError ? (
            <AlertCircle className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
          ) : null}
        </div>
      </div>
      {showError && (
        <p className="mt-1 text-[10px] text-rose-500 dark:text-rose-400 animate-in fade-in">
          Lütfen geçerli bir telefon numarası girin (+90 5XX...)
        </p>
      )}
    </div>
  );
}
