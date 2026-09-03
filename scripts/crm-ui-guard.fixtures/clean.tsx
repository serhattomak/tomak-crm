/**
 * crm-ui-guard fixture — CLEAN.
 * Canonical CRM patterns only. Guard MUST pass on this file (exit 0).
 * Proves: SelectField/NumberInput/DatePicker + zinc/blue tokens pass, and
 * data-driven hex (`colorHex`) plus `translate-x-*` do NOT false-positive.
 */
"use client";

import { DatePicker } from "@workspace/ui/components/date-picker";
import { NumberInput } from "@workspace/ui/components/number-input";
import { SelectField } from "@workspace/ui/components/select";
import { useState } from "react";

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
];

export function CleanFixture() {
  const [status, setStatus] = useState("active");
  const [seats, setSeats] = useState<number | null>(1);
  const [start, setStart] = useState<string | null>(null);
  // Data-driven hex (shift color from DB) — allowed, not styling.
  const shift = { colorHex: "#3B82F6", name: "Morning" };
  return (
    <div className="border border-zinc-200 bg-muted text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
      <SelectField
        onChange={setStatus}
        options={STATUS_OPTIONS}
        placeholder="Status"
        value={status}
      />
      <NumberInput
        min={1}
        onChange={setSeats}
        precision={0}
        showStepper
        value={seats ?? 0}
      />
      <DatePicker
        onChange={setStart}
        value={start}
      />
      <span className="translate-x-5 bg-blue-500 text-white">{shift.name}</span>
      <span style={{ borderColor: "var(--border)" }}>{shift.colorHex}</span>
    </div>
  );
}
