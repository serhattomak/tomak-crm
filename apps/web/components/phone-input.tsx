"use client";

export type { PhoneInputProps } from "@workspace/ui/components/phone-input";
// Backward-compat shim — canonical implementation lives in @workspace/ui.
// Preserved so any stale `@/components/phone-input` imports keep working.
export {
  formatPhoneNumber,
  PhoneInput,
  validatePhoneNumber,
} from "@workspace/ui/components/phone-input";
