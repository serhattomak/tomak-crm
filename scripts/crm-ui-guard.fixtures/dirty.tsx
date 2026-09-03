/**
 * crm-ui-guard fixture — DIRTY.
 * Every violation class exactly once. Guard MUST fail on this file (exit 1).
 * Not imported anywhere; excluded from --full via the fixtures dir skip.
 */
import { useState } from "react";

export function DirtyFixture() {
  const [count, setCount] = useState(1);
  return (
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
      {/* INPUT_NUMBER */}
      <input
        aria-label="dirty fixture number"
        onChange={(event) => setCount(Number(event.target.value))}
        type="number"
        value={count}
      />
      {/* INPUT_DATE */}
      <input
        aria-label="dirty fixture date"
        type="date"
      />
      {/* ARBITRARY_HEX */}
      <div className="bg-[#f4f5f8] text-[#111827]" />
      {/* INLINE_HEX_STYLE */}
      <div style={{ backgroundColor: "#ffffff", color: "#111827" }} />
      {/* SVG_PAINT_HEX */}
      <svg
        role="img"
        viewBox="0 0 10 10"
      >
        <title>dirty fixture</title>
        <circle
          cx={5}
          cy={5}
          fill="#3B82F6"
          r={4}
        />
      </svg>
      {/* VIOLET */}
      <span className="bg-violet-600 text-white">accent</span>
      {/* FUCHSIA */}
      <span className="text-fuchsia-500">brand-ish</span>
    </div>
  );
}
