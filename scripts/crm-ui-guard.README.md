# crm-ui-guard — CRM input/color drift guard

Zero-dependency Node scan. Bans native inputs + off-palette colors in CRM
scope (`apps/web`, `packages/ui`).

> **Scope note:** `apps/ecommerce` is referenced by design docs but **does not
> exist in this repo** — there is nothing to exclude. The rule set still carries
> the stale exclusion; see [`docs/crm-ui-roadmap.md`](../../docs/crm-ui-roadmap.md) → Gelecek Adımlar #7.

## Run

```sh
# from the repository root
npm run guard:crm-ui            # THE gate: full CRM sweep (must PASS)
npm run guard:crm-ui:full       # identical — kept because ADR-0004, the roadmap and CI name it
npm run guard:crm-ui:fixtures   # proves the fixture pair proves something (17/17 rules)
node scripts/crm-ui-guard.mjs --help
node scripts/crm-ui-guard.mjs <path...>   # ad-hoc file/dir scan
```

## Severity

| Severity | Behaviour |
| --- | --- |
| `error` (default) | Blocking. Affects the exit code. |
| `warn` | Advisory. Printed under `--- advisory: … ---`, **never** affects the exit code. |

A `warn` rule is promoted to `error` only once that rule is clean in a `--full`
sweep (ADR-0004 §9). Rules without an explicit `severity` are errors.

**16 of the 17 rules are `error`; one is `warn`.** The single advisory rule is the
newest — `LIGHT_SURFACE_NO_DARK`, born advisory in the dark-mode pass for the same
reason every rule before it was: it has to prove itself clean before it can block a
build. It reads 0 today, so the promotion is available as soon as that is trusted — and
since 2026-09-16 that zero covers the branch shapes the rule used to be blind to.

## Current baseline (`--full`, 2026-09-16)

195 files scanned. **0 errors · 0 advisory warnings.** (41 hits suppressed by the
allowlist.) **No violation of any kind remains anywhere in CRM scope.**

| Rule | Severity | Hits | Use instead |
| --- | --- | --- | --- |
| NATIVE_SELECT | error | **0** | `SelectField` (closed enum) / `Combobox` (data-bound) — source rule, `crm-ui-standards.md` §2.5.1 |
| INPUT_NUMBER | error | **0** (1 recorded) | `NumberInput` |
| INPUT_DATE | error | **0** | `DatePicker` (clearable, YYYY-MM-DD, TR locale) / `DateRangePicker` |
| VIOLET | error | **0** | `blue-*` scale, tone for tone (Faz 4.1) |
| SLATE | error | **0** | `zinc-*` (Faz 4.0) |
| FUCHSIA | error | **0** | `blue-*` scale, tone for tone (Faz 4.2) |
| INLINE_HEX_STYLE | error | **0** (1 recorded) | design tokens / `--chart-*` (Faz 4.4) |
| ARBITRARY_HEX | error | **0** | design tokens (Faz 4.3) |
| SVG_PAINT_HEX | error | **0** (8 recorded) | `currentColor` / tokens (brand marks excepted) |
| ARBITRARY_TEXT_SIZE | error | **0** | `text-2xs` (11px) / `text-3xs` (10px) / Tailwind scale (Faz 5.5) |
| NATIVE_TABLE | error | **0** | `@workspace/ui` `Table` primitives (Faz 5.3) |
| INLINE_STYLE_PROP | error | **0** | Tailwind classes + semantic tokens (Faz 5.6) |
| CARD_SURFACE | error | **0** | `bg-card` / `border-border` — **and delete the `dark:` partner** (Faz 5.4) |
| MOTION_DURATION | error | **0** | `duration-150` / `200` / `250` — values, not tokens (Faz 6.0) |
| MOTION_EASE | error | **0** | `ease-crm` / `ease-crm-in-out` (Faz 6.0) |
| A11Y_ICON_BUTTON | error | **0** | `aria-label` (or visible text) — a button whose only child is an icon is announced as nothing (Faz 6.1) |
| LIGHT_SURFACE_NO_DARK | warn | **0** | `bg-muted` (light ~zinc-100 / dark ~zinc-800) for surfaces, `bg-border` for 1px rules, and for **tinted** surfaces the paired dark value: `bg-<c>-50/100` → `dark:bg-<c>-950/60`, `bg-<c>-200` → `dark:bg-<c>-900/60`, `border-<c>-100/200/300` → `dark:border-<c>-900/40` / `-800` / `-700` (crm-ui-standards.md §1.2.1). A light surface with no `dark:` counterpart keeps its light value in dark mode — and `text-<c>-600…900` needs its own partner, or fixing the surface alone makes contrast *worse* |

**Faz 6.0 (motion) is complete:** `MOTION_DURATION` and `MOTION_EASE` were added, measured
20 and 19, and swept to 0 — and `prefers-reduced-motion` went from **zero implementation
anywhere** to a global base rule, which §1.5 makes mandatory. That last one was the
finding of the phase: the standard existed and nothing honoured it, across 317
`transition-all`, 205 `transition-colors` and 32 `animate-in`.

The reduced-motion rule is global rather than per-component on purpose — a `motion-reduce:`
variant must be remembered on every new animation, and the one that gets forgotten is the
one that hurts. Durations collapse to 0.01ms rather than 0 so `transitionend` and
`animationend` still fire and nothing waiting on them hangs.

**A11Y_ICON_BUTTON (Faz 6.1)** was the largest single accessibility gap in the codebase.
It first measured **106**, and the distribution was the whole story: **95 of those 106 were a
single `X` inside a `DialogClose`/`SheetClose`**, so that sweep was 92% one word. Three sat
inside `packages/ui` primitives and were fixed first (the sixth time that ordering has
mattered here); the other 103 followed. Labels are written in the project's Turkish
vocabulary, which is why the glossary (Faz 6.3) had to come *before* the sweep.

**The real number was 137, not 106.** In Faz 7 the rule was found to be reading tags with
`[^>]*`, which cannot cross a `>` — and `onClick={() => f()}` supplies one. So 31 further
icon-only buttons were invisible, and "106 → 0" was recorded while 31 violations were still
in the tree. With a brace-aware scan the rule reports 31, and they are now labelled. The
record above is corrected rather than rewritten away, because the mistake is the useful part:
an advisory rule cannot fail the gate, so a rule that silently stops matching reads as
progress.

The full label triage: `Kapat` 95 · `Satırı kaldır` 3 · `Hedefi kaldır` 3 ·
`Aramayı temizle` 4 · `Geri` 2 · `Kapat` (popover) 3 · `Kopyala` 2 · `Kaldır` 2 ·
`Önceki ay` 1 · `Sonraki ay` 1 · `Önceki sayfa` 1 · `Sonraki sayfa` 1 · `Düzenle` 1 ·
`Düzenlemeyi iptal et` 1 · `Yenile` 2 · `Adayı düzenle/sil` · `İlanı sil` ·
`Aşamayı düzenle` · `Pozisyonu düzenle/sil` · `Personeli görüntüle/düzenle` ·
`Ürünü kaldır` · `Karşılaştırmadan çıkar` · `Dahili not modunu kapat` ·
`Tablo/Kart görünümü`.

Two rules govern the wording. The `X` buttons are `Kapat`, not `Sil`, because they sit
inside a close wrapper — the action is closing a dialog, not deleting a record. And `Kaldır`
vs `Sil` follows §1.6: removing a row from a form is `Kaldır`, deleting a stored record is
`Sil`, which is why `handleRemoveItem` becomes "Satırı kaldır" while
`handleDeleteCandidate` becomes "Adayı sil" even though both render a `Trash2` icon. The
icon cannot tell them apart; the handler can. Labels are entity-qualified for the same
reason — a table of four rows should not read as four identical "Sil"s.

**The sweep is fully clean — 0 errors, 0 warnings, and 0 advisory of any kind.** From the
Faz 0 baseline of 1458 errors and 1334 advisories, **all 17 rules read zero** — including the
seven advisory rules were promoted to `error`, so the guard no longer has a soft layer to
hide in. Nothing in this file is hand-maintained: a count is a copy of a measurement, and the
moment it stops matching the guard it is wrong.

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

## Branch awareness (2026-09-16)

`classExpressions` read a class expression as **one union** of literals. That is right
for `cn("bg-white", "dark:bg-zinc-900")` — comma-separated arguments all apply — and
wrong for the branches of a conditional, which are **alternatives**. `cond ? "a" : "b"`
and `` `base ${cond ? "a" : "b"}` `` both arrived as a single blob, so a `dark:` partner
in one branch covered a light surface that lived alone in the other.

Swept before changing anything: **12,540 class expressions — 395 with an alternative,
12,145 without.** Every literal now carries a `scope`: the union of the literals that
can coexist with it, computed from the branch it sits in at each conditional level. The
rule searches for the partner in that `scope`. An expression with no conditional has
one coexistence class, so its `scope` collapses to the old union and its verdict is
**byte-identical** — measured across all 12,145, not hoped for. That equivalence is what
makes the change safe to reason about.

What it found: **3** light surfaces in `organization/page.tsx` (the Active/OnLeave
employee badges, table and card) whose `dark:` partner sat in a sibling branch. They
were fixed in the same session and `--full` is back to 0 errors · 0 advisory.

Two of them were invisible to the runtime audit as well, and not because it is broken:
the audited data had **zero employees**, so the badge never rendered. A route-level
"starved" floor cannot see a *sub-surface* no data reaches. The static rule is
data-independent; the audit is not, and neither replaces the other.

`cn()` is still one surface. The fixture pair pins it, and so does the
"4245 candidates / real 30" note in `classExpressions`' own header.

## Proof (fixtures)

```sh
npm run guard:crm-ui:fixtures   # asserts all six properties below at once
```

The pair proves two things in each direction, and `crm-ui-guard.fixtures.mjs` asserts all of
them:

- `clean.tsx` exits **0** — no false positives on `translate-*`, a data-driven `colorHex`,
  a **dynamic** `style` (computed width), the `Table` primitive, an on-scale `duration-150`
  with `ease-crm`, a `text-2xs` token, an icon button that already has a name, a `cn()`
  union, a fully paired conditional, or a conditional `dark:` partner on a surface that
  sits outside the conditional.
- `dirty.tsx` exits **1**, and produces **every one of the 17 rule ids** — none missing, none
  unknown.

That rule-id assertion is not decoration. `dirty.tsx` claimed "every violation class exactly
once" while firing for only 9 of 16, and its `INPUT_NUMBER` case never fired at all, because
its multi-line input put an arrow function before `type=`. The check was "does the file fail",
and it did — for the other eight rules. An exit code is not coverage.

Two more assertions came with branch awareness, because the rule-id **set** has blind
spots of its own — the same defect one level down:

- **`clean.tsx` must report NOTHING.** The old check was "exits 0", and an advisory rule
  never affects the exit code, so a false positive in the advisory layer could not be
  observed here at all.
- **`dirty.tsx`'s `LIGHT_SURFACE_NO_DARK` hit count is exact (2).** A set assertion
  cannot see a rule that keeps firing once while failing to see a whole shape, and
  `dirty.tsx` already fails for 16 other reasons — so reverted branch-awareness would
  stay green. The count is what makes the branch case load-bearing: strip it and the
  count drops to 1. That was verified by removing the case in a scratch copy, not
  assumed.

## CI gate note

`guard:crm-ui` is **the** regression gate, and it scans all of CRM scope: any hit is a
regression → STOP the batch, fix by hand per ADR-0002, no auto-fix, no bulk-sed.

**There is no scoped mode any more.** The 18-file `SCOPE` list that used to be the gate was
retired in Faz 7 (ADR-0004 §9.5) once a full sweep reached 0 errors and 0 warnings, so
`guard:crm-ui` and `guard:crm-ui:full` run the same scan. The list served its purpose: for
most of Program A the full sweep was `FAIL`, and a gate that fails on every run is not a
gate. But it was narrower than the truth by construction, and the last thing it did was hide
its own retirement criterion behind a rule that could not see.

**This rule cannot see whether a surface *renders* correctly** — only that it is paired. That is
what the Playwright dark-mode audit is for: it walks the real DOM in the dark theme and measures
painted backgrounds and text contrast (`apps/web/e2e/theme-audit.spec.ts`, 31 routes, both detectors
carrying positive controls). It found the tinted class in the first place, and it caught the
contrast regression that fixing surfaces without their text causes.

**CI now holds all of this** (Faz 7, `.github/workflows/ci.yml`): the guard and the fixture
check run in their own job *without* `npm ci`, because the guard has zero dependencies — a
design-system regression reports in seconds, before the install finishes. `web` runs
typecheck, lint and build; `api` runs the .NET build. Prettier is deliberately absent:
`apps/web` is not covered by any formatter, so a format check could not pass.

The allowlist (`crm-ui-guard.allowlist.json`) is for documented, single-rule
exceptions — prefer fixing over listing. It holds **8 entries**, each with its reason
recorded: the Google "G" brand fills on `login` and `register` (brand guidelines forbid
tokenizing them); the `NumberInput` and `Table` primitives' own internal
`<input type="number">` and `<table>` (the guard cannot tell an abstraction from a
consumer — fixing is impossible by construction); the pipeline stage colour, which is
persisted user-editable data rather than a styling literal; and the `orders/[orderId]/print`
table, a print surface whose border grid and inverted header do not follow the theme; and two
light-only surfaces exempted from `LIGHT_SURFACE_NO_DARK` — the customer portal (zero `dark:`
usages in 900+ lines, and it is a document a customer opens from a token link) and the same
`orders/[orderId]/print` route (paper has no dark mode). Note
that print and e-mail HTML palettes are **not** listed: they keep their hex by
construction — those values never land in a position the guard matches — so an exemption
would be meaningless. (An earlier revision of this file claimed they were listed.)

## Rules → fix map

| Rule | Use instead |
| --- | --- |
| NATIVE_SELECT | `SelectField` (closed enum) / `Combobox` (data-bound list) — source decides, not count; §2.5.1 |
| INPUT_NUMBER | `NumberInput` (para `precision=2` + `suffix` — pass the field's own currency, e.g. `suffix={currency}`; a hardcoded ₺ lies the moment a project is priced in USD. adet `precision=0` + `showStepper`) |
| INPUT_DATE | `DatePicker` (clearable, YYYY-MM-DD, TR) / `DateRangePicker` |
| ARBITRARY_HEX / INLINE_HEX_STYLE / SVG_PAINT_HEX | design tokens (`bg-muted`, `text-zinc-*`, `dark:` variants) |
| SLATE | `zinc-*` |
| VIOLET / FUCHSIA | `blue-500` scale |
| ARBITRARY_TEXT_SIZE | `text-2xs` / `text-3xs` / Tailwind scale |
| NATIVE_TABLE | `@workspace/ui` `Table` primitives |
| INLINE_STYLE_PROP | Tailwind classes + semantic tokens |
