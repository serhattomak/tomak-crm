/**
 * crm-ui-guard fixture — CLEAN.
 * Canonical CRM patterns only. Guard MUST pass on this file (exit 0).
 *
 * This file is the guard's FALSE-POSITIVE proof, so every line sits on a
 * boundary a rule could plausibly get wrong. Rules are named by id rather
 * than by the literal they match — writing the matched token in a comment
 * would trip the rule, because the guard is a text scanner, not a parser.
 *
 *   A11Y_ICON_BUTTON   an icon-only button that HAS an accessible name
 *   ARBITRARY_HEX      a DB-driven colour value, not a styling literal
 *   ARBITRARY_TEXT_SIZE a real typography token
 *   CARD_SURFACE       semantic surface tokens, no paired hardcoded idiom
 *   INLINE_STYLE_PROP  a DYNAMIC style (the one shape §1.4 keeps style for)
 *   INPUT_DATE / INPUT_NUMBER / NATIVE_SELECT  the `@workspace/ui` primitives
 *   MOTION_DURATION / MOTION_EASE  an on-scale duration and a token easing
 *   NATIVE_TABLE       the Table primitive (capital T)
 *   LIGHT_SURFACE_NO_DARK  a `cn()` union, a paired conditional, and a partner
 *                      that is itself conditional on a surface outside it
 *   SLATE              a `translate-*` utility that must not read as slate
 *
 * If this file ever fails, the guard is wrong — not the fixture.
 */
"use client";

import { DatePicker } from "@workspace/ui/components/date-picker";
import { NumberInput } from "@workspace/ui/components/number-input";
import { SelectField } from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { X } from "lucide-react";
import { useState } from "react";

const STATUS_OPTIONS = [
  { label: "Aktif", value: "active" },
  { label: "Pasif", value: "paused" },
];

export function CleanFixture() {
  const [progress] = useState(42);
  const [seats, setSeats] = useState<number | null>(1);
  const [start, setStart] = useState<string | null>(null);
  const [status, setStatus] = useState("active");
  // A shift colour that comes from the database — data, not styling.
  const shift = { colorHex: "#3B82F6", name: "Sabah" };

  return (
    <div className="border border-border bg-card text-foreground">
      {/* primitives, never the native control */}
      <SelectField
        onChange={setStatus}
        options={STATUS_OPTIONS}
        placeholder="Durum"
        value={status}
      />
      <NumberInput
        min={1}
        onChange={setSeats}
        precision={0}
        showStepper
        value={seats ?? 0}
      />
      <DatePicker onChange={setStart} value={start} />

      {/* the Table primitive — used so NATIVE_TABLE has a positive control */}
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>{shift.name}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {/* on-scale duration, token easing, and a real typography token */}
      <span className="text-2xs transition-colors duration-150 ease-crm">
        {shift.name}
      </span>

      {/* icon-only button WITH an accessible name */}
      <button aria-label="Kapat" type="button">
        <X />
      </button>

      {/* a translate utility must never be read as a slate utility */}
      <span className="translate-x-5 bg-blue-500 text-white">{shift.name}</span>

      {/* the DB colour must not be read as a styling literal */}
      <span className="text-foreground">{shift.colorHex}</span>

      {/* DYNAMIC inline style: computed width, so INLINE_STYLE_PROP must not
          fire. This is the boundary that rule was narrowed to in Faz 5.6. */}
      <span style={{ width: `${progress}%` }} />

      {/* LIGHT_SURFACE_NO_DARK's branch boundaries. All three must stay silent:
          (a) a `cn()` union is ONE surface, so a partner in the neighbouring
              argument counts;
          (b) both branches of a conditional are paired;
          (c) a surface OUTSIDE a conditional is in every branch, so a partner that
              is itself conditional still covers it. */}
      <span className={cn("bg-white", "dark:bg-zinc-900")} />
      <span
        className={
          status === "active"
            ? "bg-emerald-50 dark:bg-emerald-950/60"
            : "bg-zinc-100 dark:bg-zinc-800"
        }
      />
      <span
        className={`${status === "active" ? "dark:bg-zinc-900" : ""} bg-white`}
      />
    </div>
  );
}
