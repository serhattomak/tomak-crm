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
| ARBITRARY_TEXT_SIZE | warn | 1228 | `text-2xs` (11px) / `text-3xs` (10px) / Tailwind scale |
| NATIVE_TABLE | warn | 61 | `@workspace/ui` `Table` primitives (Faz 5.3) |
| INLINE_STYLE_PROP | warn | 31 | Tailwind classes + semantic tokens |

**Faz 4 (colour discipline) is complete**: all six colour rules read 0, down from
1376 hits across 51 files. **Faz 5.2 (select migration) is complete**: `NATIVE_SELECT`
went 61 → 0 across 13 files, so `--full` now exits 0 for the first time — from 1458 at
the Faz 0 baseline. What remains is entirely in the advisory layer (5.3/5.4/5.5/5.6),
which is why a warn rule cannot be promoted to error until its own count reaches 0
(ADR-0004 §9). The recipe for the sweep is `crm-ui-standards.md` **§2.5**. Allowlist
entries are 4: two brand-mark files, one data-contract value, one primitive — each with
its reason recorded.

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
