# crm-ui-guard — CRM input/color drift guard

Zero-dependency Node scan. Bans native inputs + off-palette colors in CRM
scope (`apps/web`, `packages/ui`). Store (`apps/ecommerce`) is out of scope
by design and is never scanned or modified.

## Run

```sh
# from crm-monorepo/
npm run guard:crm-ui            # scoped CI gate: Batch 1–3 touched files (must PASS)
npm run guard:crm-ui:full       # full CRM sweep: migration tracker (may list legacy drift)
node scripts/crm-ui-guard.mjs --help
node scripts/crm-ui-guard.mjs <path...>   # ad-hoc file/dir scan
```

## Proof (fixtures)

```sh
node scripts/crm-ui-guard.mjs scripts/crm-ui-guard.fixtures/dirty.tsx  # expect exit 1 (9+ hits)
node scripts/crm-ui-guard.mjs scripts/crm-ui-guard.fixtures/clean.tsx  # expect exit 0 (PASS)
```

`clean.tsx` also proves no false positives on `translate-x-*`,
data-driven `colorHex: "#…"`, or `var(--…)` style values.

## CI gate note

`guard:crm-ui` (scoped) is the gate: every file in scope was migrated to
`packages/ui` standards, so any hit is a regression → STOP the batch, fix by
hand per ADR-0002, no auto-fix, no bulk-sed. `guard:crm-ui:full` is
informational until legacy pages (leaves, projects, …) are migrated; promote
it to the blocking gate only after a clean full sweep. The allowlist
(`crm-ui-guard.allowlist.json`, currently empty) is for documented,
single-rule exceptions — prefer fixing over listing.

## Rules → fix map

| Rule | Use instead |
| --- | --- |
| NATIVE_SELECT | `SelectField` (≤7 fixed opts) / `Combobox` (dynamic) |
| INPUT_NUMBER | `NumberInput` (para `precision=2 suffix ₺`, adet `precision=0` stepper) |
| INPUT_DATE | `DatePicker` (clearable, YYYY-MM-DD, TR) / `DateRangePicker` |
| ARBITRARY_HEX / INLINE_HEX_STYLE / SVG_PAINT_HEX | design tokens (`bg-muted`, `text-zinc-*`, `dark:` variants) |
| SLATE | `zinc-*` |
| VIOLET / FUCHSIA | `blue-500` scale |
