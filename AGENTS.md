<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CRM Monorepo

A multi-tenant CRM platform (Next.js 16 frontend + .NET 10 API + Supabase).

> **Where the work stands:** `docs/crm-ui-roadmap.md` opens with **"📍 NEREDE KALDIK — buradan
> başla"** — what closed, what is blocked and why, what is waiting on a human decision, and
> what can be picked up without one. Read that section before starting anything in the UI
> programme; the rest of that file is the detailed record and the ~270-row progress log.

## Tooling

This project uses **Ultracite** (Biome under the hood). Biome is the one formatter and
Ultracite's rule set is the lint configuration.

| Task | Command |
|---|---|
| Format | `npm run format` (Biome, root) |
| Lint check | `npm run check` (Ultracite/Biome, read-only) |
| Diagnose setup | `npm exec -- ultracite doctor` |
| ESLint (the CI lint) | `npm run lint` |

Prettier is gone as of 2026-09-16 (roadmap #18). `.prettierrc` conflicted with the code —
it said `semi: false` while `apps/web` is written with semicolons — and `apps/web` /
`packages/ui` each declared `format: prettier --write`, so `npm run format` used to fight
the tree. `format` is now a single root script that runs where `biome.jsonc` is; **do not**
run Biome from a package directory, where it finds no config and silently uses its defaults.

> **Known gap (roadmap #31):** `npm run check` reports **5554** findings and they are
> **lint rules, not formatting** — the formatter is clean (`npm run format` is a no-op).
> The largest are `noJsxPropsBind` (1693, adopting it rewrites how every handler is passed)
> and `useSortedClasses` (1317, mechanical). ~470 are a11y. Ultracite is still NOT part of
> any CI gate; `npm run lint` is ESLint via Turbo, and the ESLint baseline is 0 errors with
> 343 warnings. Wiring Ultracite in is a per-rule triage, not a one-time diff.

## Repository layout

This was two repositories until 2026-09-16: an outer one holding `docs/`, AGENTS.md
and the formatter config, and an inner `crm-monorepo/` holding the application — which
the outer `.gitignore` excluded. They are one repository now, rooted here.

**Documents written before that date say `crm-monorepo/...`. Read that prefix as the
repository root.** The ADRs and the roadmap's Progress Log are kept verbatim: their
stale paths are the evidence for why the merge happened, and rewriting a dated record
so it looks current destroys the record.

Two names still say `crm-monorepo` on purpose, because renaming them would orphan live
data — the Supabase `project_id` in `supabase/config.toml`, and the compose `name` in
`docker-compose.yml`. Both pin the identity the folder name used to provide.

## Environment and measurement

Machine-specific facts (services, ports, the names that must not be renamed, tool
limits) and the traps that follow: **[environment.md](docs/agents/environment.md)**.

Read it before trusting any "no findings" result. The lesson it is built around is
that **a blind measurement looks identical to a clean one** — every rule in that file
exists because something here reported "nothing found" while being incapable of
finding anything, including three times during the session that wrote it.

## Coding Standards

- [TypeScript conventions](docs/agents/ts-conventions.md) — type safety, async, error handling
- [React & Next.js conventions](docs/agents/react-conventions.md) — components, security, performance
- [CRM UI & Component Standards](docs/crm-ui-standards.md) — Linear/Stripe design standards, `@workspace/ui` primitives, decomposition rules
- [Testing conventions](docs/agents/testing.md) — test structure and async patterns

## Agent Skills

- **Issue tracker** — Issues are tracked as Markdown files in `.scratch/`. See [issue-tracker.md](docs/agents/issue-tracker.md).
- **Triage labels** — Canonical labels (`needs-triage`, `ready-for-agent`, etc.). See [triage-labels.md](docs/agents/triage-labels.md).
- **Domain docs** — Single-context layout (`CONTEXT.md` and `docs/adr/`). See [domain.md](docs/agents/domain.md).
