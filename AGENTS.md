<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CRM Monorepo

A multi-tenant CRM platform (Next.js 16 frontend + .NET 10 API + Supabase).

## Tooling

This project uses **Ultracite** (Biome under the hood) for formatting and linting.

| Task | Command |
|---|---|
| Format & fix | `npm exec -- ultracite fix` |
| Check only | `npm exec -- ultracite check` |
| Diagnose setup | `npm exec -- ultracite doctor` |

Run `npm exec -- ultracite fix` before committing.

> **Known gap (roadmap #18):** `biome.jsonc` extends `ultracite/biome/core` and
> `ultracite/biome/react` with no `files.includes`, so it now sees all of `apps/`
> and `packages/`. Those were never run through it — they are Prettier-styled with
> semicolons while the root `.prettierrc` says `semi: false`. Ultracite is NOT part
> of any CI gate (`npm run lint` is ESLint via Turbo); wiring it in is a one-time
> large diff that needs its own commit and review.

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
