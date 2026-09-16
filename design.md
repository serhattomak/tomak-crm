# Design — CRM Application (Moved)

> **Status:** ❌ Not canonical. Kept only so existing links and agent references don't break.
> **Canonical source:** 👉 [`docs/crm-ui-standards.md`](docs/crm-ui-standards.md)
> **Decision record:** [`docs/adr/0004-crm-design-system-enforcement.md`](docs/adr/0004-crm-design-system-enforcement.md)
> **Roadmap:** [`docs/crm-ui-roadmap.md`](docs/crm-ui-roadmap.md)

---

## Why this file was emptied

This file claimed to be "the single source of truth for visual and interaction decisions" — but its **concrete values contradicted the actual code**. An agent following it literally would have re-themed the entire application, because the tokens it specifies are not the tokens this repo defines.

| This file specified | What the code actually defines |
| --- | --- |
| Hue **270** tokens: `--color-paper`, `--color-ink`, `--color-rule`, `--color-accent` | Hue **260** tokens in `packages/ui/src/styles/globals.css`: `--background`, `--foreground`, `--card`, `--primary` (`oklch(0.55 0.22 260)`), `--muted`, `--border`, … |
| A `--space-*` scale | **Does not exist.** Spacing comes from Tailwind's default scale; density rules live in `crm-ui-standards.md` §1.3 |
| **Geist** as the typeface | `--font-sans` is **Inter**; `--font-serif` is **Playfair Display** (used on auth screens); Geist Mono is loaded for code |
| A `--radius-*` scale as a fresh definition | Already defined in `globals.css`, all derived from `--radius: 0.5rem` (`--radius-sm: calc(var(--radius) * 0.6)` … `--radius-4xl: calc(var(--radius) * 2.6)`) |

## What survives

The **philosophy** in this file was sound and is already carried by the canonical standard: modern-minimal, Linear/Stripe-grade craft, "build confidence through clarity and hierarchy — never through decoration, novelty, gradients, or visual noise." That is `crm-ui-standards.md` §1.2 (Anti-AI-Slop & Color Discipline), nearly verbatim in intent.

Only the **concrete values** were wrong. Those now live in exactly one place.

---

## Do not add to this file

New token, color, typography, spacing, motion or component decisions are written **only** into [`docs/crm-ui-standards.md`](docs/crm-ui-standards.md). A rule living in two documents is how this repo ended up with three competing design systems in the first place.

The `--space-*` scale and the Geist typeface were explicitly **rejected** in ADR-0004 — re-proposing them requires a new ADR, not an edit here. See [`docs/crm-ui-roadmap.md`](docs/crm-ui-roadmap.md) → Program C.
