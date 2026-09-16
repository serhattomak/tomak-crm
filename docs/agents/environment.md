# Environment and measurement

Measured facts about this machine and this repo, plus the traps that follow from
measuring in it. Everything here was observed, not inferred. Dates are when it was
last confirmed.

The single lesson underneath all of it: **a blind measurement looks identical to a
clean one.** Every rule below exists because something reported "no findings" while
being incapable of finding anything.

## Services

| Service | Address | Notes |
|---|---|---|
| Supabase API | `127.0.0.1:54321` | The middleware falls back here when env is missing |
| Supabase DB | `127.0.0.1:54322` | `postgres` / `postgres` |
| Supabase Studio | `127.0.0.1:54323` | |
| Mailpit | `127.0.0.1:54324` | |
| .NET API | `localhost:5000` | CRM data; `next.config.ts` proxies `/api/*` and `/hubs/*` |
| Web | `127.0.0.1:3210` | Playwright's `webServer` builds and starts it |
| RabbitMQ | `5672` / `15672` | `docker compose up -d` |
| Redis | `6379` | `docker compose up -d` |

Ports are not reliable as a liveness check: `Test-NetConnection` on `54321` succeeded
while the whole stack was stopped. Check containers, not ports.

## Supabase auth schema: two columns, two types

The auth tables do not agree on what a user id is. Measured, not assumed:

| Column | Type |
|---|---|
| `auth.users.id` | `uuid` |
| `auth.sessions.user_id` | `uuid` |
| `auth.refresh_tokens.user_id` | **`character varying`** |

Postgres has no implicit cast between `varchar` and `uuid`, so a statement that joins
`refresh_tokens` to `users` on the id fails with `operator does not exist:
character varying = uuid` and takes the whole transaction down with it. That is exactly
what happened while rotating the dev password: the `UPDATE` succeeded, the
`refresh_tokens` delete failed, and everything rolled back. The fix is a cast, and it
is asymmetric on purpose:

```sql
DELETE FROM auth.refresh_tokens
 WHERE user_id = (SELECT id::text FROM auth.users WHERE email = '...');
DELETE FROM auth.sessions
 WHERE user_id = (SELECT id      FROM auth.users WHERE email = '...');
```

Verify with `SELECT pg_typeof(id) FROM auth.users LIMIT 1` rather than trusting this
table — it was written from one reading of one version of the auth schema.

## Names that must not be renamed

Both of these exist because a service derives its identity from the **directory name**.
The repo was hoisted from `crm-monorepo/` to the workspace root on 2026-09-16, and
without these two pins that rename would have silently pointed both stacks at new,
empty storage while the real data sat on disk under the old name.

| What | Where | Why |
|---|---|---|
| `project_id = "crm-monorepo"` | `supabase/config.toml` | Container and volume names (`supabase_db_crm-monorepo`) |
| `name: crm-monorepo` | `docker-compose.yml` | Volume names (`crm-monorepo_rabbitmq_data`) |

This machine already carries an orphaned `supabase_db_crm` volume from an earlier
attempt, so the failure mode is not hypothetical. Verify with:

```sh
docker inspect supabase_db_crm-monorepo --format '{{range .Mounts}}{{.Name}}{{println}}{{end}}'
# expect: supabase_db_crm-monorepo
```

## Tool limits

- **Supabase CLI is 2.67.1** (2.117.0 is current). `supabase db query` needs 2.79.0+
  and `supabase db advisors` needs 2.81.3+, so **neither exists here**. Use the
  container:
  ```sh
  docker exec supabase_db_crm-monorepo psql -U postgres -d postgres -tAc "select 1"
  ```
- **No `psql` on PATH.** Docker is the way in.
- **`supabase status` proves the config parses, not that the stack works.** Its
  `No such container: supabase_db_crm-monorepo` is evidence that `project_id` resolved
  correctly — which is useful, but it is not a running stack.
- **`git subtree` is available** at `C:/Program Files/Git/mingw64/libexec/git-core/git-subtree`.
  `git subtree --help` prints nothing (no man page), which looks like absence and is not.
- **`glob` reported "No files found" for files that provably existed**, confirmed by a
  positive control (`**/theme-audit.spec.ts` vs. `node -e` walking the same tree). Treat
  any "not found" from a search tool as unverified until a second method agrees.

## Line endings

`core.autocrlf = true` in this repo, with **no `.gitattributes`**. The working tree is
therefore CRLF while every blob is LF. This is not cosmetic:

- `edit` does not match multi-line content in CRLF files. Edit those with a script that
  uses the file's own EOL and refuses to write when the match count is not exactly one.
- **Comparing a checked-out file against `git show` flags every text file as different.**
  This produced a false "254 files differ" during the repo merge. Compare blob to blob.
- It inflates `npm run check` (Biome flags every line ending), which is why roadmap #18
  cannot be sized before the line-ending config is fixed.
- Within the web app, never run `prettier --write`: the root `.prettierrc` says
  `semi: false` while the code has semicolons. A 55-line change became 431 lines.

## Measurement traps

**Truncating output invents findings.** A class string cut to `text-destru…` misread a
real defect. A `git worktree list` piped through `-First 22` hid its second line and
produced a false "the worktree disappeared" alarm. Print the whole thing, or read the
file it was written to.

**A rule can be wider or narrower than the standard it encodes.** Both are dangerous,
and the narrower one is worse because it *reports success*:

- Wider: a pattern matched comments and dynamic style. The count never reached zero,
  which invited widening the migration instead of fixing the rule.
- Narrower: `[^>]*` cannot cross a `>`, and `onClick={() => f()}` provides one. Four
  rules were blind this way — 31 unlabelled buttons stayed invisible, and a sweep
  recorded as "106 → 0" was actually 137.

**A unified expression lies.** Merging the excluding branches of a ternary makes
"partner exists" appear true and hides a real leak. Read the source, not the summary.

**Exit codes are not coverage.** A fixtures file claiming "every rule once" triggered 9
of 16. The check was only "exit 1", and the other seven carried it. Assert the rule-id
**set**.

**A token that does not exist does nothing, silently.** A class pointing at an undefined
`--destructive-foreground` left a badge at ~1:1 contrast across 31 routes.

**Fixing a surface without its text makes it worse.** Measured: light surfaces 51 → 10
while low contrast went 47 → **83**. Only runtime measurement could see it.

**A stable total hides a swap.** Fixing `text-emerald-500` → `text-emerald-700` corrected
the light theme and broke the dark one (3.50:1). The dark count went 198 → 198, because
three findings appeared while three disappeared — and a total that does not move says
nothing about what moved. Only per-finding inspection caught it. Compare the two runs
item by item, not just their totals.

**Variant-blind comparison deletes what it should keep.** A check asking "does this class
string contain a light `text-zinc-400`?" answered yes for
`hover:text-zinc-400 dark:text-zinc-500`, and then removed the BASE dark token — which was
supplying that element's dark-mode colour, for an element whose light colour was
`text-zinc-600`. Dark went 195 → 234. Compare the same VARIANT: a hover light token pairs
with a `dark:hover:` token, never with a bare `dark:` one.

**Pattern-matching a class string misattributes the cause.** After that migration, four
dark findings "contained" the token that was introduced — and were not caused by it. They
failed at 3.89:1 on `dark:text-zinc-500`, deliberately left in place. A class string can
hold both the fix and the fault; ask which TOKEN lost, not whether the string mentions
something.

**Gradients are invisible to `backgroundColor` — and to the static rule.** A gradient leaves
`backgroundColor` as `rgba(0,0,0,0)`, so a walk upward measured white text against the
near-white page: 1.04:1 on all 31 routes, a false finding. The runtime audit now returns
"unmeasurable" and records the class string, and the static rule never saw it either
because `from-indigo-50` is not a `bg-` class. Four cards carried a light gradient over
`bg-card` with no `dark:` stops for that reason.

**A route that renders is not a surface that renders.** The dark-mode audit's
starved-route floor catches a page that failed to load; it cannot catch a *sub-surface*
no data reaches. On 2026-09-16 the `organization` route audited 146 elements while the
employee list was empty, so the Active/OnLeave status badges never mounted — and their
missing dark surface stayed invisible inside a 31-route sweep that reported success.
The **static rule** found them, because a class string exists whether or not rows do.
Neither instrument replaces the other: before trusting either zero, say which one
depends on data.

**A rewritten class string must keep the whitespace it did not touch.** A sweep that
rebuilds a class list token by token has two ways to fuse two classes into one, and both
produce the same silent result: a token that matches no utility, so neither style applies.

- The run of whitespace BEFORE a dropped token belongs to the NEXT token. Removing it
  turned `hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800` into
  `hover:bg-zinc-100dark:hover:bg-zinc-800` in 7 places.
- The run of whitespace at the END of a literal must be re-emitted. Dropping it turned
  `tracking-tight ${…}` into `tracking-tight${…}`, so the DOM carried
  `tracking-tighttext-primary-foreground` — **41 new light findings and 31 new dark ones.**
- A literal that is ONLY whitespace (the `" "` between two interpolations in
  `` `${a} ${b}` ``) has no tokens at all; rebuilding it with none emptied it and glued
  the interpolations together.

**Why three checks missed the first two.** The token-model controls tested the
classifier, which was right. The plan-vs-measurement assertion compared the plan to a
measurement built by the same broken code. A visual before/after sample passed because
every sample happened to end with the removed token — the one position where removing the
preceding separator is correct. And a token-multiset diff, which is the strongest check
this repo had for a sweep, **passed clean: whitespace is not a token.**

**What catches it**
- The **runtime audit** caught the trailing-run bug (41 + 31 findings) — but it cannot see
  a fused `hover:`/`focus:` variant, because a page visit never fires those states.
- A **fusion-signature count** catches both:
  `scripts/`-style count of `/[^\s\`$]\$\{/` (a `${` glued to a preceding non-space) and
  `/\}[^\s\`]/` (a `}` glued to a following non-space), compared before and after.
  4891 before, 4891 after on the final sweep — and it flagged the bug on the first attempt
  across 6 files when the audit alone would have needed a hand-read of the class strings.
- Emit the whitespace that PRECEDES each kept token, re-emit the trailing run, return
  any token-less literal untouched, and assert it. **In a class attribute, whitespace is

**`npm run build` fails while the API is running — it is a file lock, not a compile error.**
`dotnet build` cannot overwrite `apps/api/src/CRM.Api/bin/Debug/net10.0/*.dll`, and a running
`CRM.Api.exe` holds them:

```
error MSB3027: ... CRM.Modules.Orders.dll ... Dosya şunun tarafından kilitlendi: "CRM.Api (23328)"
```

Measured 2026-09-16: 46 "errors" on the api step, 0 actual compile errors, and `web` built
fine in the same run. The trap is that this only surfaces when turbo's cache is invalidated —
for most of a session `api:build` is a cache **hit** and never touches disk, so a green
`npm run build` says nothing about whether the api compiles. A change that touches every
file (adding `.gitattributes`) is what forced it.

Recipe:
```powershell
Stop-Process -Name CRM.Api -Force
npm run build
$dir = "apps\api\src\CRM.Api\bin\Debug\net10.0"
$env:ASPNETCORE_ENVIRONMENT = "Development"; $env:ASPNETCORE_URLS = "http://localhost:5000"
Start-Process -FilePath "$dir\CRM.Api.exe" -WorkingDirectory $dir
```

The two environment variables are **not optional**: the exe started bare answers `/health`
with **401**, because `launchSettings.json` carries `ASPNETCORE_ENVIRONMENT=Development` and a
`dotnet run` that nobody remembers using. `ASPNETCORE_URLS` is needed too — launchSettings
points at `:5187` while the app, `next.config.ts` and every doc here assume `:5000`.
Verify with `/health` returning 200 and a `masstransit-bus` block.
  content.**

## Verification rules

1. **Every detector gets a positive control.** Inject a known defect; if the detector
   does not flag it, its zero findings mean nothing. The dark-mode audit requires two.
2. **Every measurement gets a second method.** Blob vs. working tree, `grep` vs. Node,
   line count vs. name set. A lockfile diff of 1618 lines looked alarming and lost
   **zero** packages; the line count was churn, the name set was the fact.

**A `toast()` call is silent where no `<Toaster>` is mounted.** Measured 2026-09-16: sonner
is the app-wide toast mechanism — **17 files import it** and `<Toaster>` is mounted in exactly
two layouts, `app/(admin)/layout.tsx` and `app/(dashboard)/layout.tsx`. It is **not** in
`app/(auth)/layout.tsx`, so `toast(...)` in `app/(auth)/login/page.tsx` would render nothing
at all. That is the same failure shape as an undefined token: no error, no output, and only a
hand-check finds it. Before replacing an `alert()` with a `toast()`, confirm the route's layout
tree mounts one.

Also measured in the same pass: **the `**` glob was blind again.** A
`Select-String -Path "apps/web/**/*.tsx"` found **0** sonner imports; a plain `readdirSync` walk
of the same tree found **17**, plus the two layout mounts. This is the second time in this
repo that a search tool returned a confident zero that a second method contradicted — the
first is recorded under "Tool limits". Present the glob's zero only with a walk behind it.
3. **Compare like with like.** Regexes cannot count what they cannot see: three
   matching *lines* held four references.
4. **Read the diff.** Class strings are checked by neither `tsc` nor the guard, and
   after `git status` is not the same as before it.
5. **Fail is stop.** No automatic fixes, no bulk `sed`. Report, propose, get approval.
6. **Counts are read from artifacts, not from logs.** The dark-mode audit now writes
   `test-results/<theme>-mode-audit.json`, because a log that printed eight findings per
   route made a ceiling look like a total.
7. **Verify a fix with the instrument that CAN see it.** A gradient fix cannot be checked
   by a text-contrast audit, so it was checked in the COMPILED CSS — that is where the
   collision rule is decided, since the later declaration wins. Choosing the wrong
   instrument for the evidence turns a verified change into a hopeful one.
8. **Put the guard inside the tool, before the write.** A 545-occurrence sweep only went
   ahead because the script refused unless (a) the plan replaced exactly as many as were
   measured, (b) no carriage return changed, and (c) the dark-token population was
   identical. Three of its own bugs were caught by those checks before a single byte was
   written. A dry run is not a formality.
9. **A measurement method answers only the question it asks.** `git grep -c` counts LINES,
   so a 545-occurrence change looked like 536; a substring count of `text-zinc-400` also
   matched inside `dark:text-zinc-400`, doubling the real total. State the unit.

## Shell

- **PowerShell 5.1 reads `.ps1` as ANSI** unless there is a BOM. Non-ASCII characters
  mangle silently. Write scripts in Node.
- **`$ErrorActionPreference = "Stop"` plus `Write-Error` closes the window on failure**,
  so the error is printed and unreadable. A script that hides its own failure reports
  nothing: capture stdout, stderr and the exit code, log them, and wait before exiting.
- **Never write repo files with `Set-Content`** (mojibake). Use `edit`/`write`, or a Node
  script with explicit UTF-8.
- **Inline `node -e` breaks on quoting here**, repeatedly. Write a script file.
- **Git writes are never parallel** — `index.lock` collides and a commit's message ends
  up describing a different file than its content. Long messages go in a file with
  `git commit -F`.
