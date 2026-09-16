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

## Coding Standards

- [TypeScript conventions](docs/agents/ts-conventions.md) — type safety, async, error handling
- [React & Next.js conventions](docs/agents/react-conventions.md) — components, security, performance
- [CRM UI & Component Standards](docs/crm-ui-standards.md) — Linear/Stripe design standards, `@workspace/ui` primitives, decomposition rules
- [Testing conventions](docs/agents/testing.md) — test structure and async patterns

## Agent Skills

- **Issue tracker** — Issues are tracked as Markdown files in `.scratch/`. See [issue-tracker.md](docs/agents/issue-tracker.md).
- **Triage labels** — Canonical labels (`needs-triage`, `ready-for-agent`, etc.). See [triage-labels.md](docs/agents/triage-labels.md).
- **Domain docs** — Single-context layout (`CONTEXT.md` and `docs/adr/`). See [domain.md](docs/agents/domain.md).
