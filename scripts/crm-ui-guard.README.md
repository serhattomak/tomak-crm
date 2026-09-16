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
npm run guard:crm-ui:full       # full CRM sweep: migration tracker (currently FAIL — 37 errors, all NATIVE_SELECT)
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

189 files scanned. **37 errors · 1329 advisory warnings.** (10 hits suppressed by the
allowlist.)

| Rule | Severity | Hits | Use instead |
| --- | --- | --- | --- |
| NATIVE_SELECT | error | **37** | `SelectField` (closed enum) / `Combobox` (data-bound) — source rule, `crm-ui-standards.md` §2.5.1 |
| INPUT_NUMBER | error | **0** (1 recorded) | `NumberInput` |
| VIOLET | error | **0** | `blue-*` scale, tone for tone (Faz 4.1) |
| SLATE | error | **0** | `zinc-*` (Faz 4.0) |
| FUCHSIA | error | **0** | `blue-*` scale, tone for tone (Faz 4.2) |
| INLINE_HEX_STYLE | error | **0** (1 recorded) | design tokens / `--chart-*` (Faz 4.4) |
| ARBITRARY_HEX | error | **0** | design tokens (Faz 4.3) |
| SVG_PAINT_HEX | error | **0** (8 recorded) | `currentColor` / tokens (brand marks excepted) |
| ARBITRARY_TEXT_SIZE | warn | 1237 | `text-2xs` (11px) / `text-3xs` (10px) / Tailwind scale |
| NATIVE_TABLE | warn | 61 | `@workspace/ui` `Table` primitives (Faz 5.3) |
| INLINE_STYLE_PROP | warn | 31 | Tailwind classes + semantic tokens |

**Faz 4 (colour discipline) is complete**: all six colour rules read 0, down from
1376 hits across 51 files. **Faz 5 (form & table presentation) is in progress**:
`INPUT_NUMBER` was exempted (its only hit was the primitive itself — the rule cannot
tell an abstraction from a consumer), and `NATIVE_SELECT` is being swept file by
file, 61 → 37 so far across 13 files. The recipe for the sweep is
`crm-ui-standards.md` **§2.5**. Allowlist entries are 4: two brand-mark files, one
data-contract value, one primitive — each with its reason recorded.

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
| NATIVE_SELECT | `SelectField` (closed enum) / `Combobox` (data-bound list) — source decides, not count; §2.5.1 |
| INPUT_NUMBER | `NumberInput` (para `precision=2 suffix ₺`, adet `precision=0` stepper) |
| INPUT_DATE | `DatePicker` (clearable, YYYY-MM-DD, TR) / `DateRangePicker` |
| ARBITRARY_HEX / INLINE_HEX_STYLE / SVG_PAINT_HEX | design tokens (`bg-muted`, `text-zinc-*`, `dark:` variants) |
| SLATE | `zinc-*` |
| VIOLET / FUCHSIA | `blue-500` scale |
| ARBITRARY_TEXT_SIZE *(advisory)* | `text-2xs` / `text-3xs` / Tailwind scale |
| NATIVE_TABLE *(advisory)* | `@workspace/ui` `Table` primitives |
| INLINE_STYLE_PROP *(advisory)* | Tailwind classes + semantic tokens |
