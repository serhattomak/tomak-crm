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
npm run guard:crm-ui:full       # full CRM sweep: migration tracker (currently FAIL — 1458 errors)
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

## Current baseline (`--full`, 2026-09-15)

176 files scanned. **1458 errors · 1334 advisory warnings.**

| Rule | Severity | Hits | Use instead |
| --- | --- | --- | --- |
| VIOLET | error | 924 | `blue-500` scale |
| SLATE | error | 415 | `zinc-*` |
| NATIVE_SELECT | error | 61 | `SelectField` (≤7 fixed) / `Combobox` (dynamic) |
| FUCHSIA | error | 43 | `blue-500` scale |
| INLINE_HEX_STYLE | error | 6 | design tokens |
| ARBITRARY_HEX | error | 4 | design tokens |
| SVG_PAINT_HEX | error | 4 (allowlisted) | `currentColor` / tokens |
| INPUT_NUMBER | error | 1 | `NumberInput` |
| ARBITRARY_TEXT_SIZE | warn | 1242 | `text-2xs` (11px) / `text-3xs` (10px) / Tailwind scale |
| NATIVE_TABLE | warn | 61 | `@workspace/ui` `Table` primitives |
| INLINE_STYLE_PROP | warn | 31 | Tailwind classes + semantic tokens |

Top offenders: `vehicles/page.tsx` (191), `portal/[token]/PortalClient.tsx` (114),
`projects/[projectId]/page.tsx` (102), `recruitment/page.tsx` (75),
`promotions/page.tsx` (69), `messages/page.tsx` (67).

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

`guard:crm-ui:full` is the migration tracker until legacy pages (`leaves`,
`projects`, `vehicles`, …) are migrated. **The `SCOPE` list is retired in
Faz 7**, once a `--full` sweep is clean — not before (ADR-0004 §9). Retiring it
earlier would remove the only working regression gate for the whole program.

The allowlist (`crm-ui-guard.allowlist.json`) is for documented, single-rule
exceptions — prefer fixing over listing. Known documented exceptions: the Google
"G" brand fills on the auth pages, and print/e-mail HTML template palettes
(e-mail clients cannot consume `oklch` / CSS variables).

## Rules → fix map

| Rule | Use instead |
| --- | --- |
| NATIVE_SELECT | `SelectField` (≤7 fixed opts) / `Combobox` (dynamic) |
| INPUT_NUMBER | `NumberInput` (para `precision=2 suffix ₺`, adet `precision=0` stepper) |
| INPUT_DATE | `DatePicker` (clearable, YYYY-MM-DD, TR) / `DateRangePicker` |
| ARBITRARY_HEX / INLINE_HEX_STYLE / SVG_PAINT_HEX | design tokens (`bg-muted`, `text-zinc-*`, `dark:` variants) |
| SLATE | `zinc-*` |
| VIOLET / FUCHSIA | `blue-500` scale |
| ARBITRARY_TEXT_SIZE *(advisory)* | `text-2xs` / `text-3xs` / Tailwind scale |
| NATIVE_TABLE *(advisory)* | `@workspace/ui` `Table` primitives |
| INLINE_STYLE_PROP *(advisory)* | Tailwind classes + semantic tokens |
