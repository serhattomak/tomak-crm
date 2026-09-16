# crm-ui-guard — CRM input/color drift guard

Zero-dependency Node scan. Bans native inputs + off-palette colors in CRM
scope (`apps/web`, `packages/ui`).

> **Scope note:** `apps/ecommerce` is referenced by design docs but **does not
> exist in this repo** — there is nothing to exclude. The rule set still carries
> the stale exclusion; see [`docs/crm-ui-roadmap.md`](../../docs/crm-ui-roadmap.md) → Gelecek Adımlar #7.

## Run

```sh
# from crm-monorepo/
npm run guard:crm-ui            # scoped CI gate: Batch 1–3 touched files (must PASS)
npm run guard:crm-ui:full       # full CRM sweep: migration tracker (currently PASS — 0 errors, 1320 advisory)
node scripts/crm-ui-guard.mjs --help
node scripts/crm-ui-guard.mjs <path...>   # ad-hoc file/dir scan
```

## Severity

| Severity | Behaviour |
| --- | --- |
| `error` (default) | Blocking. Affects the exit code. |
| `warn` | Advisory. Printed under `--- advisory: … ---`, **never** affects the exit code. |

A `warn` rule is promoted to `error` only once that rule is clean in a `--full`
sweep (ADR-0004 §9). Rules without an explicit `severity` are errors — the
original 9 rules are unchanged by the advisory layer.

## Current baseline (`--full`, 2026-09-16)

189 files scanned. **0 errors · 1320 advisory warnings.** (10 hits suppressed by the
allowlist.) **No blocking violation remains anywhere in CRM scope.**

| Rule | Severity | Hits | Use instead |
| --- | --- | --- | --- |
| NATIVE_SELECT | error | **0** | `SelectField` (closed enum) / `Combobox` (data-bound) — source rule, `crm-ui-standards.md` §2.5.1 |
| INPUT_NUMBER | error | **0** (1 recorded) | `NumberInput` |
| VIOLET | error | **0** | `blue-*` scale, tone for tone (Faz 4.1) |
| SLATE | error | **0** | `zinc-*` (Faz 4.0) |
| FUCHSIA | error | **0** | `blue-*` scale, tone for tone (Faz 4.2) |
| INLINE_HEX_STYLE | error | **0** (1 recorded) | design tokens / `--chart-*` (Faz 4.4) |
| ARBITRARY_HEX | error | **0** | design tokens (Faz 4.3) |
| SVG_PAINT_HEX | error | **0** (8 recorded) | `currentColor` / tokens (brand marks excepted) |
| ARBITRARY_TEXT_SIZE | warn | **0** | `text-2xs` (11px) / `text-3xs` (10px) / Tailwind scale (Faz 5.5) |
| NATIVE_TABLE | warn | **0** | `@workspace/ui` `Table` primitives (Faz 5.3) |
| INLINE_STYLE_PROP | warn | **0** | Tailwind classes + semantic tokens (Faz 5.6) |
| A11Y_ICON_BUTTON | warn | **106** | `aria-label` (or visible text) — a button whose only child is an icon is announced as nothing (Faz 6.1) |

**Faz 6.0 (motion) is complete:** `MOTION_DURATION` and `MOTION_EASE` were added, measured
20 and 19, and swept to 0 — and `prefers-reduced-motion` went from **zero implementation
anywhere** to a global base rule, which §1.5 makes mandatory. That last one was the
finding of the phase: the standard existed and nothing honoured it, across 317
`transition-all`, 205 `transition-colors` and 32 `animate-in`.

The reduced-motion rule is global rather than per-component on purpose — a `motion-reduce:`
variant must be remembered on every new animation, and the one that gets forgotten is the
one that hurts. Durations collapse to 0.01ms rather than 0 so `transitionend` and
`animationend` still fire and nothing waiting on them hangs.

**A11Y_ICON_BUTTON (Faz 6.1)** measures the largest single accessibility gap in the
codebase. It is a warn rule so the gate stays green while the work is tracked. Worth noting
for whoever sweeps it: the labels must be written in the project's Turkish vocabulary, so
the glossary (Faz 6.3) belongs *before* the sweep, not after — otherwise 106 labels get
written twice.

**The full sweep is clean — 0 errors and 0 warnings.** From the Faz 0 baseline of 1458
errors and 1334 advisories, every rule in this guard now reads zero, which is the
precondition ADR-0004 §9 attached to promoting the warn rules to error in Faz 7.

**INLINE_STYLE_PROP (Faz 5.6)** needed the rule narrowed rather than the code changed.
It flagged every `style={{}}` while §1.4 bans inline style for **static** values only and
says in the same sentence that `style` remains correct for unmeasurable dynamic ones. So
the rule was wider than its own standard — the same defect as CARD_SURFACE flagging
frosted glass, and it fails the same way: the counter never reaches zero and the pull is
to widen the migration until it does.

The triage of all 31: **19 legitimate dynamic** (progress percentages, `scale()` transforms,
node positions), **9 database-driven colours** (`tpl.colorHex`, `stage.colorHex || "#3B82F6"`)
which deferred item 25 already records as a data contract, **1** the `Progress` primitive's
own implementation, and **3 genuinely static**. The narrowed pattern flags a block only when
every value is a plain quoted literal — no `${`, no member access, no fallback — which is a
shape test, and applied to all 31 it leaves exactly those three.

The three became `min-w-[800px]`, `max-h-[560px] min-h-[320px]`, and an arbitrary
`background-image` + `background-size` for the organisation canvas's dot grid. All four
arbitrary values were confirmed in the compiled CSS, not assumed, because the syntax for a
gradient containing a CSS variable and a size hint has to survive underscore conversion.

**ARBITRARY_TEXT_SIZE (Faz 5.5)** was the cheapest sweep of the phase because the
distribution did the work: 674 sites were `text-[11px]` and 451 were `text-[10px]`, and
both already had a token at exactly that size (`text-2xs` 0.6875rem, `text-3xs`
0.625rem). 1125 of 1188 — 94.7% — were a pure identity swap. The other 63 needed a
decision, and it was to pull everything onto the scale with a **10px floor**: 9px to
`text-3xs` (as Faz 0 already prescribed when it removed 9px from the scale), and 8px and
7px there too since they sit below the floor. Those 15 sites grow 2–3px, which is the
right direction — 7px text is not readable, so the floor is an accessibility fix as much
as a token one.
| CARD_SURFACE | warn | **0** | `bg-card` / `border-border` — **and delete the `dark:` partner**, see below (Faz 5.4) |

**Faz 4 (colour discipline) and 5.2/5.3 are complete**: all six colour rules read 0,
`NATIVE_SELECT` 61 → 0 across 13 files, `NATIVE_TABLE` 61 → 0 across 28. `--full` has
exited 0 since 5.2 — from 1458 at the Faz 0 baseline. What remains is entirely in the
advisory layer, which is why a warn rule can only be promoted to error once its own
count reaches 0 (ADR-0004 §9).

**CARD_SURFACE (Faz 5.4) is deliberately narrow:** it fires only on the *paired* idiom
(`bg-white … dark:bg-zinc-9xx`, `border-zinc-2xx … dark:border-zinc-8xx`), because a
hardcoded pair is provably a themed surface. Two deliberate exclusions:

- A bare `bg-white` with no dark partner is not flagged — it may be a fixed light
  surface (print) rather than a themed one.
- **Translucent `bg-white/90` or `/80` with `backdrop-blur` is not flagged.** That frosted
  panel is a surface whose translucency is the point; swapping it to `bg-card` would make
  it opaque and kill the effect. This one is worth remembering because the rule got it
  wrong first and matched `bg-white` as a prefix — 15 sites where the migration was right
  and the rule was wrong. An over-matching rule never announces itself; it simply never
  reaches zero, and the tempting fix is to widen the migration until the counter clears.

The `dark:` partner is part of the finding, not a detail: it sets the same property in
the same variant at the same specificity, so the legacy class wins in the compiled
stylesheet and the token never applies — measured in 5.0 on 31 lines of `messages`.

**Swept to zero:** 85 files, 1912 class strings. A separate check for token-and-legacy
coexistence in the same string also reads 0, which is the check the guard itself cannot
perform.

Total hardcoded surfaces were **2425** (799 `bg-white` + 1626 borders); **185 carried no
`dark:` partner at all** and remain — those are dark-mode defect candidates rather than
tokenisation work, and they are triaged separately.

The primitive layer was settled first, in `beb9cc6`, because a rule that fires on the
authority components starts with built-in false positives. Allowlist entries are 6, each
with its reason recorded: two brand-mark files, one data-contract value, the `NumberInput`
primitive, the `Table` primitive, and the order print surface.

> ⚠️ **This table is a copy of a measurement, not a maintained estimate.** After any
> sweep, re-run `guard:crm-ui:full` and copy the last line. If a count here disagrees
> with `docs/crm-ui-roadmap.md`, both are wrong until re-measured — that is exactly
> how this section drifted to 62 while the real number was already 38.

Top offenders in the old baseline (`vehicles` 191, `portal/…/PortalClient` 114,
`projects/[projectId]` 102) were all violet and slate counts; those files no
longer appear.

## Proof (fixtures)

```sh
node scripts/crm-ui-guard.mjs scripts/crm-ui-guard.fixtures/dirty.tsx  # expect exit 1
node scripts/crm-ui-guard.mjs scripts/crm-ui-guard.fixtures/clean.tsx  # expect exit 0 (PASS)
```

`clean.tsx` also proves no false positives on `translate-x-*`,
data-driven `colorHex: "#…"`, or `var(--…)` style values.

## CI gate note

`guard:crm-ui` (scoped) is the **live regression gate**: every file in scope was
migrated to `packages/ui` standards, so any hit is a regression → STOP the
batch, fix by hand per ADR-0002, no auto-fix, no bulk-sed.

`guard:crm-ui:full` is the migration tracker. **As of 2026-09-16 it reports 0 errors
for the first time** (from 1458 at the Faz 0 baseline), which is the condition
ADR-0004 §9 attached to retiring the scoped `SCOPE` list — but the retirement itself is
a **Faz 7** action, so both gates still run and `SCOPE` stays in place. It is
deliberately narrower than a full sweep, and it is the gate that has actually caught
regressions; removing it early would trade a proven gate for an unproven one.

The allowlist (`crm-ui-guard.allowlist.json`) is for documented, single-rule
exceptions — prefer fixing over listing. It holds 4 entries, each with its reason
recorded: the Google "G" brand fills on `login` and `register` (brand guidelines forbid
tokenizing them), the `NumberInput` primitive's own internal `<input type="number">`
(the guard cannot tell an abstraction from a consumer), and the pipeline stage colour,
which is persisted user-editable data rather than a styling literal. Note that print and
e-mail HTML palettes are **not** listed: they keep their hex by construction — those
values never land in a position the guard matches — so an exemption would be
meaningless. (An earlier revision of this file claimed they were listed.)

## Rules → fix map

| Rule | Use instead |
| --- | --- |
| NATIVE_SELECT | `SelectField` (closed enum) / `Combobox` (data-bound list) — source decides, not count; §2.5.1 |
| INPUT_NUMBER | `NumberInput` (para `precision=2 suffix ₺`, adet `precision=0` stepper) |
| INPUT_DATE | `DatePicker` (clearable, YYYY-MM-DD, TR) / `DateRangePicker` |
| ARBITRARY_HEX / INLINE_HEX_STYLE / SVG_PAINT_HEX | design tokens (`bg-muted`, `text-zinc-*`, `dark:` variants) |
| SLATE | `zinc-*` |
| VIOLET / FUCHSIA | `blue-500` scale |
| ARBITRARY_TEXT_SIZE *(advisory)* | `text-2xs` / `text-3xs` / Tailwind scale |
| NATIVE_TABLE *(advisory)* | `@workspace/ui` `Table` primitives |
| INLINE_STYLE_PROP *(advisory)* | Tailwind classes + semantic tokens |
