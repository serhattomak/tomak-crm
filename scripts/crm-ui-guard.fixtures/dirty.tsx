/**
 * crm-ui-guard fixture — DIRTY.
 * Every one of the guard's 16 rules fires here at least once.
 * Guard MUST fail on this file (exit 1).
 * Not imported anywhere; excluded from --full via the fixtures dir skip.
 *
 * One section per rule id. The fixtures check asserts the SET of rule ids
 * this file produces, not merely that it fails: a rule that silently stops
 * matching stays invisible otherwise, which is exactly how INPUT_NUMBER went
 * unnoticed here for several phases.
 */
import { useState } from "react";

export function DirtyFixture() {
  const [count, setCount] = useState(1);
  return (
    // SLATE
    <div className="bg-slate-100 text-slate-600">
      {/* NATIVE_SELECT */}
      {/* eslint-disable-next-line */}
      <select
        aria-label="dirty fixture select"
        onChange={() => setCount(count + 1)}
        value={count}
      >
        <option value={1}>One</option>
      </select>
      {/* INPUT_NUMBER — the arrow function here is deliberate: it is the shape
          that used to hide this rule from itself */}
      <input
        aria-label="dirty fixture number"
        onChange={(event) => setCount(Number(event.target.value))}
        type="number"
        value={count}
      />
      {/* INPUT_DATE */}
      <input aria-label="dirty fixture date" type="date" />
      {/* ARBITRARY_HEX */}
      <div className="bg-[#f4f5f8] text-[#111827]" />
      {/* INLINE_HEX_STYLE */}
      <div style={{ backgroundColor: "#ffffff", color: "#111827" }} />
      {/* SVG_PAINT_HEX */}
      <svg role="img" viewBox="0 0 10 10">
        <title>dirty fixture</title>
        <circle cx={5} cy={5} fill="#3B82F6" r={4} />
      </svg>
      {/* VIOLET */}
      <span className="bg-violet-600 text-white">accent</span>
      {/* FUCHSIA */}
      <span className="text-fuchsia-500">brand-ish</span>
      {/* ARBITRARY_TEXT_SIZE */}
      <span className="text-[13px]">off-scale type</span>
      {/* NATIVE_TABLE */}
      <table>
        <tbody>
          <tr>
            <td>native table</td>
          </tr>
        </tbody>
      </table>
      {/* A11Y_ICON_BUTTON — icon-only, no accessible name */}
      <button type="button">
        <X />
      </button>
      {/* MOTION_DURATION */}
      <span className="transition-colors duration-700" />
      {/* MOTION_EASE */}
      <span className="transition-transform ease-linear" />
      {/* INLINE_STYLE_PROP — STATIC shape; no hex, so INLINE_HEX_STYLE stays
          a separate rule */}
      <span style={{ borderColor: "var(--border)" }} />
      {/* LIGHT_SURFACE_NO_DARK — a light surface with no dark: partner at all */}
      <div className="bg-zinc-50 p-4" />
      {/* LIGHT_SURFACE_NO_DARK — the BRANCH shape: `bg-emerald-50` has no partner of
          its own, and the sibling branch's `dark:bg-zinc-800` used to cover for it.
          In dark mode this badge keeps its near-white background. The fixtures check
          asserts this rule's hit COUNT, so reverting branch-awareness fails here even
          though the file already fails for other reasons. */}
      <span
        className={
          count > 0
            ? "bg-emerald-50 text-emerald-700"
            : "bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400"
        }
      />
      {/* CARD_SURFACE — the paired hardcoded idiom */}
      <div className="bg-white p-4 dark:bg-zinc-900" />
    </div>
  );
}

function X() {
  return <span aria-hidden="true">x</span>;
}
