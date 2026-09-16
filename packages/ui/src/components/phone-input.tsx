"use client";

import { AlertCircle, Check, Phone } from "lucide-react";
import { useEffect, useState, type ChangeEvent } from "react";
import { Input } from "@workspace/ui/components/input";

export interface PhoneInputProps {
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
  if (!input) {
    return "";
  }

  // Normalize: keep leading plus and numbers only (TR locale)
  const hasPlus = input.trim().startsWith("+");
  const digits = input.replace(/\D/g, "");

  if (!digits) {
    return hasPlus ? "+" : "";
  }

  // Strip TR country/trunk prefix before grouping
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
  if (!phone) {
    return false;
  }
  const digits = phone.replace(/\D/g, "");
  // TR numbers: 10 digits starting with 5, 12 digits starting with 905, 11 starting with 05
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
  const [displayValue, setDisplayValue] = useState<string>(() =>
    formatPhoneNumber(value)
  );
  const [touched, setTouched] = useState<boolean>(false);

  useEffect(() => {
    const formatted = formatPhoneNumber(value);
    if (formatted !== displayValue) {
      setDisplayValue(formatted);
    }
  }, [value, displayValue]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const formatted = formatPhoneNumber(e.target.value);
    const valid = validatePhoneNumber(formatted);
    setDisplayValue(formatted);
    onChange(formatted, valid);
  };

  const isValid = validatePhoneNumber(displayValue);
  const showError = touched && displayValue.length > 0 && !isValid;

  return (
    <Input
      autoFocus={autoFocus}
      className={className}
      disabled={disabled}
      error={
        showError
          ? "Lütfen geçerli bir telefon numarası girin (+90 5XX...)"
          : undefined
      }
      id={id}
      leftIcon={<Phone className="h-3.5 w-3.5" />}
      name={name}
      onBlur={() => setTouched(true)}
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
      rightIcon={
        isValid ? (
          <Check className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
        ) : showError ? (
          <AlertCircle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
        ) : undefined
      }
      type="tel"
      value={displayValue}
    />
  );
}
