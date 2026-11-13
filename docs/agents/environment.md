# Environment and measurement

Measured facts about this machine and this repo, plus the traps that follow from
measuring in it. Everything here was observed, not inferred. Dates are when it was
last confirmed.

The single lesson underneath all of it: **a blind measurement looks identical to a
clean one.** Every rule below exists because something reported "no findings" while
being incapable of finding anything.

## Services

Since 2026-09-17 the whole local environment is **one Docker Compose project**
(`docker-compose.yml`, project `crm-monorepo`). That one project is also what
Docker Desktop groups as a single entry with a single Start/Stop control.
`supabase start` is no longer used; see "Supabase is Compose-managed" below.

| Service | Address | Notes |
|---|---|---|
| Supabase API (Kong) | `127.0.0.1:54321` | The middleware falls back here when env is missing |
| Supabase DB | `127.0.0.1:54322` | `postgres` / `postgres`; container `crm-supabase-db` |
| Supabase Studio | `127.0.0.1:54323` | |
| Mailpit | `127.0.0.1:54324` | |
| Realtime | `127.0.0.1:54325` | Reachable, but the app notifies over SignalR, not this |
| .NET API | `localhost:5000` | CRM data; `next.config.ts` proxies `/api/*` and `/hubs/*` |
| Web | `127.0.0.1:3210` | Playwright's `webServer` builds and starts it |
| RabbitMQ | `5672` / `15672` | same compose project |
| Redis | `6379` | same compose project |

Ports are not reliable as a liveness check: `Test-NetConnection` on `54321` succeeded
while the whole stack was stopped. Check containers, not ports.

Also: **a published port is not a served port, and `docker compose ps` is not a
health check.** Measured 2026-09-17, three separate healthchecks disagreed with
reality in the same stack — see "Supabase is Compose-managed" below. Run
`docker compose ps --format "{{.Name}}|{{.Status}}"` and expect `(healthy)`
everywhere; a bare `Up` on `crm-supabase-rest` is normal (it has no healthcheck).


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
| `project_id = "crm-monorepo"` | `supabase/config.toml` | CLI container/volume names (`supabase_db_crm-monorepo`) |
| `name: crm-monorepo` | `docker-compose.yml` | Compose project name → volume names (`crm-monorepo_rabbitmq_data`) |

**The `name:` pin is now load-bearing in a second way.** The compose file mounts
two volumes by their literal names:

```yaml
  supabase_db_data:
    name: supabase_db_crm-monorepo
  supabase_storage_data:
    name: supabase_storage_crm-monorepo
```

Those are the volumes the Supabase CLI created. They are spelled out precisely so
that the compose stack adopts the CLI's data instead of creating empty twins. The
267 MB database (42 migrations, 119 `public` tables, the `auth.users` row) lives
in `supabase_db_crm-monorepo`; `supabase_storage_crm-monorepo` is genuinely empty
(only an empty `stub/` directory — nothing has ever been uploaded).

This machine used to carry orphaned `supabase_db_crm` and `supabase_storage_crm`
volumes from an earlier attempt, so the failure mode was not hypothetical. Both
were inspected and **deleted 2026-09-17** — `supabase_db_crm` turned out to be a
bare Supabase database with `public_tables = 0` and `auth.users = 0` (the CRM
migrations had never been applied to it), and `supabase_storage_crm` was empty.
Nine further orphaned volumes belong to other projects (hrga, n8n, a stray
`docker_*` set) and were left alone. Verify the live pin with:

```sh
docker volume inspect supabase_db_crm-monorepo --format '{{.Name}} {{.Mountpoint}}'
docker inspect crm-supabase-db --format '{{range .Mounts}}{{.Name}}{{println}}{{end}}'
# expect: supabase_db_crm-monorepo
```

## Supabase is Compose-managed (2026-09-17)

`docker-compose.yml` runs the Supabase services directly:

| Service | Image |
|---|---|
| postgres | `public.ecr.aws/supabase/postgres:17.6.1.165` |
| auth | `public.ecr.aws/supabase/gotrue:v2.195.0` |
| rest | `public.ecr.aws/supabase/postgrest:v16.1` |
| storage | `public.ecr.aws/supabase/storage-api:v1.70.3` |
| realtime | `public.ecr.aws/supabase/realtime:v2.129.3` |
| meta | `public.ecr.aws/supabase/postgres-meta:v0.97.0` |
| studio | `public.ecr.aws/supabase/studio:2026.08.10-sha-5b68af1` |
| kong | `public.ecr.aws/supabase/kong:2.8.1` |
| mailpit | `public.ecr.aws/supabase/mailpit:v1.30.2` |

Dropped as unused, each checked rather than assumed: `edge-runtime` (no
`supabase/functions/` directory), `logflare`/analytics + `vector` (nothing reads
analytics), `supavisor`/pooler (`[db.pooler] enabled = false`).

**Realtime is kept even though nothing uses it.** The web app's realtime is
**SignalR** (`@microsoft/signalr` → `/hubs/crm` → `CrmHub.cs`), not Supabase
Realtime. `grep` for `.channel(` / `.subscribe(` / `removeChannel` returns 0.

Storage, by contrast, **is** load-bearing: `SupabaseStorageService.cs`,
`StorageEndpoints.cs`, `UploadProductImage`, `CvUploadFeatures.cs`, and five
buckets (`product-images`, `crm-public`, `crm-private`, `email-attachments`,
`recruitment-cvs`). Any future "trim the stack" pass must keep `storage-api`.

### Four things that were measured, not guessed

1. **Kong does not interpolate env vars in declarative config.** `nereye`'s and
   W2Wear's `kong.yml` both write `${SUPABASE_ANON_KEY}`; measured here by parsing
   the file and reading the values back from Kong's Admin API, both `${VAR}` and
   `${{ env "VAR" }}` survive as **literal text**. Nobody noticed because no route
   applies the `key-auth` plugin, so those credentials were never validated.
   `docker/supabase/kong.yml` therefore hardcodes the (public, local-dev) keys.

2. **GoTrue must connect as `supabase_auth_admin`, not `postgres`.** `postgres` is
   **not** a superuser on this database (`rolsuper = f`) and holds only USAGE on
   schema `auth`. Running GoTrue as `postgres` dies on its first migration with
   `permission denied for schema auth (SQLSTATE 42501)`. Likewise storage-api needs
   `supabase_storage_admin`.

3. **PostgREST must connect as `postgres`, not the conventional `authenticator`.**
   PostgREST switches roles per request, and here only `postgres` is a member of
   `anon`/`authenticated`/`service_role` — `pg_has_role('authenticator','anon','USAGE')`
   is `false`. Using `authenticator` would fail every request at `SET ROLE`.

4. **Three healthchecks lied about healthy services.** All three are cases of a
   probe that cannot see the thing it claims to check:

   - `meta` — probed with `wget`, which does not exist in that image (exit 127).
     Fixed by probing with `node`, which does.
   - `storage` — probed `http://localhost:5000/status`; storage-api binds to
     `127.0.0.1` only, and inside the container `localhost` resolves to `[::1]`
     first, so it got `Connection refused`. `127.0.0.1` exits 0, `localhost` exits 1.
     **W2Wear's compose still has this fault.**
   - `studio` — the image's own probe fetches `localhost:3000`, but the Next server
     binds to the container hostname (`HOSTNAME` is *unset* in that container;
     `require("os").hostname()` is the value that works). The UI answered 200 on
     `127.0.0.1:54323` from the host the whole time.

   Each was confirmed with a negative control: the corrected probe exits 0 against
   the real endpoint and non-zero against a dead port.

### Migrations still work

`supabase start/stop/status` are retired (the compose stack owns those ports), but
the migration tooling is unaffected — it only needs a connection string:

```sh
npm run db:migrate          # supabase db push  --db-url postgresql://postgres:postgres@127.0.0.1:54322/postgres
npm run db:migrate:status   # supabase migration list --db-url ...
npm run db:psql             # docker exec -it crm-supabase-db psql -U postgres -d postgres
```

Verified 2026-09-17: `migration list --db-url` reports **42 local = 42 remote**,
matching the 42 files in `supabase/migrations/`, from `20260819000001` to
`20260910000003`. `db reset`, `migration up` and `gen types` all accept `--db-url`
on CLI 2.67.1 too.

### Collation version mismatch — found and fixed 2026-09-17

The `postgres` image moved from `17.6.1.064` to `17.6.1.165`, which bundles a
newer glibc, so every `psql` invocation printed:

```
WARNING: database "postgres" has a collation version mismatch
DETAIL: The database was created using collation version 153.120, but the
        operating system provides version 153.121.
```

It was a warning, not an error, but it is not cosmetic: the collation *table*
changed, and indexes on text columns were still sorted by the old one. `REFRESH`
alone would have recorded the new version while leaving those indexes misordered —
which is worse than the warning, because the warning at least tells you.

Done instead, in the order the HINT gives (rebuild, then record):

```sql
REINDEX DATABASE postgres;                       -- 0.3s; 201 collation-sensitive
                                                 -- indexes over 3.4 MB / 21 MB db
ALTER DATABASE postgres   REFRESH COLLATION VERSION;
ALTER DATABASE template1  REFRESH COLLATION VERSION;
```

Verified: `datcollversion` `153.120 → 153.121` for both `postgres` and `template1`,
no warning on a plain `psql`, `invalid_indexes = 0`, and the full functional suite
(8/8) plus row counts unchanged.

Two details worth keeping:

- **`template1` needed `supabase_admin`, not `postgres`** — it failed with
  `ERROR: must be owner of database template1`. `postgres` is not a superuser on
  this database (see the role note above), so any database-level command that
  touches shared objects has to go through `supabase_admin`:
  `docker exec -e PGPASSWORD=postgres crm-supabase-db psql -U supabase_admin -d postgres -c "…"`
- **`template0` has no `datcollversion` and that is correct** — it is the read-only
  pristine template. Do not try to refresh it.



## Docker build cache

Measured 2026-09-17, starting point: **19.54 GB across 306 records**, the single
largest reclaimable pool on this machine after images.

**A build cache prune cannot touch images or volumes.** These are three separate
stores: cache records are the "I already ran this Dockerfile step" memo, nothing
more. Proven rather than asserted — image list, volume list and per-volume sizes
were fingerprinted before and after, and a prune of 15.61 GB changed
`0 images, 0 volumes`. That matters here because two projects must not be
disturbed, and both are safe by construction:

- **W2Wear's models are not in the build cache.** They live in volumes —
  `w2wear-ollama-data` (3.2 GB), `w2wear-tryon-cache` (4.6 GB),
  `w2wear-tryon-models` (1.4 GB), `w2wear-photo-processor-models` (973 MB).
- **W2Wear's Dockerfiles never download a model at build time.** Checked all three
  (`catvton`, `photo-processor`, `avatar-generator`): they only `apt-get`, `pip
  install` and `git clone`. No `snapshot_download`, no `from_pretrained`. So even a
  cold rebuild cannot re-download a model — it would only re-fetch pip packages.
- **yorgan-net-cursor is a `dotnet restore` + `dotnet publish`.** Its cold rebuild
  is minutes, and it downloads no weights.

So the real price of a cache prune is rebuilt layers for whoever next runs
`docker build` — never a lost image, lost volume, or re-downloaded model. Which of
those 306 records still matched a current Dockerfile is unknowable; a record's
`Last used` only advances when a build actually matches it, so an 8-month-old
`Last used` is at least *unused*, not necessarily *invalid*.

### The trap: filters that silently do nothing

**Do not trust `--filter until=` or `--max-used-space=` to bound a cache prune.**

| Command | Reported |
|---|---|
| `docker builder prune --filter until=4320h -f` | `Total: 0B` |
| `docker builder prune --max-used-space=19GB -f --verbose` | `Total: 0B` |
| `docker buildx prune -f` | `Total: 15.61GB` |

Three filtered invocations reported **0B** against a 19.54 GB cache; the unfiltered
`docker buildx prune` then removed 15.61 GB. The two that returned nothing both used
`docker builder`; the one that worked used `docker buildx` — that correlation is the
likely cause but is **untested**, and cannot be tested while the remaining cache is
0 B reclaimable. Re-check when cache accumulates before relying on either form.

The failure direction is the dangerous one: a no-op prune **looks like a successful
targeted sweep** ("nothing needed removing"), which is this file's whole theme.

### Attribution, and what is left

`docker system df -v --format "{{json .BuildCache}}"` carries a `Description` field
naming the source — e.g. `pulled from mcr.microsoft.com/dotnet/sdk:10.0@sha256:…`.
That is the only way to attribute a cache record to a project; `buildx du --verbose`
does not expose it. Use it before any future cache decision.

After the prune: **306 → 53 records, 19.54 GB → 3.933 GB, reclaimable 0 B.** The
remainder is BuildKit's *Shared* cache — layers the existing images still reference,
so it is unreclaimable while those images exist. There is nothing further to win here
until images are deleted.

### Why it grew to 19.54 GB: the limit was 20 GB

The cache did not grow unbounded — it filled a ceiling that was already set.

`C:\Users\Serhat\.docker\daemon.json` (the file Docker Desktop's **Settings → Docker
Engine** editor writes):

```json
{ "builder": { "gc": { "defaultKeepStorage": "10GB", "enabled": true } }, "experimental": false }
```

**Was `20GB`; changed to `10GB` on 2026-09-17.** The 19.54 GB reading was the cache
sitting at that ceiling. `defaultKeepStorage` maps to `Reserved Space` in the policy
below, and it scales the first rule with it — measured across the change:

```
[[worker.oci.gcpolicy]]  keepDuration 48h, filters source.local/exec.cachemount/source.git.checkout
                         Max Used Space: 2.764GiB  ->  1.382GiB   (exactly half)
[[worker.oci.gcpolicy]]  keepDuration 1440h  Reserved Space: 20GiB -> 10GiB
[[worker.oci.gcpolicy]]                       Reserved Space: 20GiB -> 10GiB
[[worker.oci.gcpolicy]]  all = true           Reserved Space: 20GiB -> 10GiB
```

Read the live policy with `docker buildx inspect --bootstrap`. Note that
`Reserved Space` is a **floor** ("keep at least this much"), not a ceiling — it is not
the limit you are looking for; `defaultKeepStorage` is.

**Applying it needs `docker desktop restart`, and that is safe here.** Verified: the
restart issues a new Docker Desktop SessionID (`docker desktop status`), takes seconds,
does not revert `daemon.json`, and every `restart: unless-stopped` container — the whole
crm stack included — comes back on its own. The engine was reachable again ~5s after the
command returned, which is *before* the restart has actually happened; confirm with the
SessionID rather than with `docker info`, or the measurement will say the restart did
nothing. This is the same shape as every other trap in this file: an unchanged reading
that looks like a no-op.

`defaultKeepStorage` is the file's own value and Docker Desktop rewrites `daemon.json`
when its Engine editor is applied, so change it there or expect the GUI to win.


## The Docker disk image (WSL2 VHDX)

Windows reports Docker Desktop's disk as a single file:

```
%LOCALAPPDATA%\Docker\wsl\disk\docker_data.vhdx      (the data disk, mounted at /var/lib)
%LOCALAPPDATA%\Docker\wsl\main\ext4.vhdx             (0.1 GB, the distro itself)
```

Measured 2026-09-17, when Explorer said **88.4 GB**:

| Reading | Value |
|---|---|
| `docker_data.vhdx` file size | 88.25 GB |
| Inside the VM (`df -h /var/lib`) | 1 TB virtual, **58 GB used**, 899 GB free |
| Docker's own accounting | 44.72 images + 11.7 volumes + 3.93 cache + 0.24 containers ≈ 60.6 GB |
| **Real waste** | **~28 GB** |

`df` inside the VM: `/dev/sdf` (later `/dev/sdd`) is the data disk, mounted at `/var/lib`.

### Two separate reasons the file stays big

1. **The VHDX only grows.** It reached 88 GB during peak use (~90 GB of images + cache +
   volumes) and does not shrink when files are deleted.
2. **It was not NTFS-sparse**, so even when blocks *were* freed, Windows had nowhere to
   put them. `/dev/sdd` is also mounted `rw,relatime` **without `discard`**, unlike the
   distro's own disk (`rw,relatime,discard`).

### Measuring what the file really occupies

`(Get-Item $f).Length` is the *logical* size and overstates it once the file is sparse.
Explorer's **Size** is logical; **Size on disk** is allocated. For the allocated figure,
sum the ranges:

```powershell
fsutil sparse queryrange "C:\Users\Serhat\AppData\Local\Docker\wsl\disk\docker_data.vhdx"
```

Parse `Offset: 0x… Length: 0x…` and add the lengths. Measured after the fix: logical
62.97 GiB, **allocated 61.54 GiB**, sparse holes 1.43 GiB. Watch *size on disk*, not size.

### The fix, and the trap in it

```powershell
docker desktop stop
wsl --shutdown
# diskpart: select vdisk file="…\docker_data.vhdx"
#           attach vdisk readonly
#           compact vdisk
#           detach vdisk
fsutil sparse setflag "…\docker_data.vhdx"     # needs the file NOT in use
docker desktop start
docker compose up -d                            # see the trap below
```

Result: 88.25 GB → 62.97 GiB logical, C: free 156.76 → 190.84 GB. **~25 GB recovered.**
`fsutil sparse setflag` frees nothing by itself — it only lets *future* frees be returned,
so it is a follow-up to the compaction, not a substitute.

**Trap: `wsl --shutdown` breaks the restart policy.** After `docker desktop restart` the
whole stack came back on its own. After `wsl --shutdown` **nothing did** — 67 containers
all `Exited`, 0 running — because the VM was killed rather than shut down cleanly, so
`restart: unless-stopped` never fired. The stack had to be started by hand. If a procedure
touches WSL, do not expect the one-click story to cover it.

### Things that did not work

- `docker run --privileged --pid=host docker/desktop-reclaim-space` — the documented
  reclamation container. Pulled and ran in 3.4s, changed nothing (file size and C: free
  both identical).
- `fstrim -v /var/lib` on its own — reported **1.1 MiB**, because ext4 believed its free
  blocks were already discarded. It is only informative after something has *just* been
  deleted: with a 2 GB file written and removed, the same command reported **2.9 GiB
  trimmed**. A trim with nothing newly freed proves nothing.

`docker desktop enable` exposes only `model-runner`, so there is no CLI switch for the
managed-VHD behaviour the 4.34 release notes describe.

## Tool limits

- **Supabase CLI is 2.67.1** (2.117.0 is current). `supabase db query` needs 2.79.0+
  and `supabase db advisors` needs 2.81.3+, so **neither exists here**. Use the
  container:
  ```sh
  docker exec crm-supabase-db psql -U postgres -d postgres -tAc "select 1"
  ```
- **No `psql` on PATH.** Docker is the way in. `npm run db:psql` opens a shell.
- **A `node -e` one-liner cannot be passed through PowerShell here.** Measured
  repeatedly on 2026-09-17: nested double quotes survive as `Syntax error: "("
  unexpected`, and a file written from PowerShell arrives with a CR that `sh`
  reports as `sh: 2: : not found`. Write a real script file and pipe it —
  `Get-Content -Raw script.sh | docker exec -i <container> sh` — or `docker cp`
  the file in and run it. This applies to healthcheck authoring too: validate the
  probe by running it, then let Docker reproduce it.
- **`docker compose up -d` writes its progress to stderr, and `2>&1` in PowerShell
  turns that into `NativeCommandError` — which makes the reported exit code lie.**
  Measured 2026-09-17: `docker compose up -d` echoed "exit 1" three times while
  every container was healthy and nothing had restarted. The real code, with
  stderr suppressed, is **0** — and `docker compose up -d --wait` is also 0. Never
  conclude a compose command failed from the exit status alone; check
  `--wait` and `docker inspect --format '{{.RestartCount}}'` as well.
- **`supabase status` is retired here** — the stack is Compose-managed, so it no
  longer describes anything. `docker compose ps` is the status command now.
- **Do not read `docker compose ps` as proof a service works.** Three healthchecks
  in this stack reported `(unhealthy)` for services that were serving traffic.
- **Dotted label keys break `--format` templates.** `docker inspect --format
  '{{index .Config.Labels "com.docker.compose.project"}}'` fails with
  `function "com" not defined`. Read `{{json .Config.Labels}}` and parse it
  (Node is easiest) instead.
- **`git subtree` is available** at `C:/Program Files/Git/mingw64/libexec/git-core/git-subtree`.
  `git subtree --help` prints nothing (no man page), which looks like absence and is not.
- **`glob` reported "No files found" for files that provably existed**, confirmed by a
  positive control (`**/theme-audit.spec.ts` vs. `node -e` walking the same tree). Treat
  any "not found" from a search tool as unverified until a second method agrees.

**A directory walk that climbs the wrong number of levels reads other projects.** A sizing
script of 2026-09-16 resolved the repo root by joining `..` four times from
`.tmp/sessions/<slug>/`; the correct number is three. It therefore walked `D:\serhatdev` and
scanned **13,067 files across five unrelated projects** — `imanvakti-expo`, `joint/jointvault`,
`yorgan-monorepo`, `YorganWeb`.

It only read, so nothing was damaged. It would have been a write had the same root fed a
sweep, and the sweep would have looked correct: the guard's own filters (extension, skip
dirs) pass on any project.

Two rules follow. **Assert the root before walking** — check that `package.json` and the
expected workspace directory are there, and fail loudly otherwise. And **print the
by-directory breakdown of anything you count**: the six-line table is what exposed this, and
a bare total (37) would have looked perfectly plausible.

## Line endings

`core.autocrlf = true` **and** (since `f0e594b`) `.gitattributes` with `* text=auto eol=lf`.
The pin is what the tree depends on — autocrlf alone checks out CRLF while every blob is LF.
Measured after the pin: **0 CRLF, 483 LF, 0 mixed.**

- `edit` does not match multi-line content in CRLF files. Edit those with a script that
  uses the file's own EOL and refuses to write when the match count is not exactly one.
- **Comparing a checked-out file against `git show` flags every text file as different.**
  This produced a false "254 files differ" during the repo merge. Compare blob to blob.
- It inflated `npm run check` (Biome flags every line ending), which is why roadmap #18 could
  not be sized first. **Sized 2026-09-16:** the CRLF share was **44 diagnostics, 0.8%**; the
  rest was real.
- ~~Never run `prettier --write` in the web app~~ — **resolved 2026-09-16**: Prettier is no
  longer in this repo. `.prettierrc` said `semi: false` while the code has semicolons, so
  running it turned a 55-line change into 431 lines. Biome is now the one formatter.

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
used to point at `:5187` while the app, `next.config.ts` and every doc here assume `:5000`.
**Fixed 2026-11-13:** launchSettings now points at `:5000`, so a plain `dotnet run` matches
the Next proxy. The old failure shape was silent: login talks to Supabase directly and works,
then the first API call — creating a workspace, for example — returns **500** from the Next
proxy because nothing is listening on `:5000`. `npm run dev:api` always passed `--urls`;
plain `dotnet run` did not.
Verify with `/health` returning 200 and a `masstransit-bus` block.
  content.**

## Verification rules

1. **Every detector gets a positive control.** Inject a known defect; if the detector
   does not flag it, its zero findings mean nothing. The dark-mode audit requires two.
2. **Every measurement gets a second method.** Blob vs. working tree, `grep` vs. Node,
   line count vs. name set. A lockfile diff of 1618 lines looked alarming and lost
   **zero** packages; the line count was churn, the name set was the fact.

**A `toast()` call is silent where no `<Toaster>` is mounted.** Measured 2026-09-16: sonner
is the app-wide toast mechanism — **17 files import it**. `<Toaster>` was mounted in exactly
two layouts, `app/(admin)/layout.tsx` and `app/(dashboard)/layout.tsx`, and not for `(auth)`,
so `toast(...)` in `app/(auth)/login/page.tsx` would render nothing at all. That is the same
failure shape as an undefined token: no error, no output, and only a hand-check finds it.
Before replacing an `alert()` with a `toast()`, confirm the route's layout tree mounts one.

**Corrected later the same day** (roadmap #23): `app/(auth)/layout.tsx` **did not exist at
all** — `(auth)/` held only `login/page.tsx` and `register/page.tsx`. The gap was a **missing
file**, not a missing line, and the paragraph above named a mount that was never there. The
conclusion held and was in fact stronger: nothing would have rendered, and no layout was even
available to put the Toaster in. The file now exists and mounts one, so the count is **three**.
Also measured: **no guard rule covers `alert()`** — 17 rule IDs enumerated, `grep alert
scripts/` returns 0 — so neither this fix nor its reintroduction is gated, and a green
`guard:crm-ui` says nothing about it.

**An in-page toast is invisible behind an open modal, and an equal `z-index` does not save
it.** Measured 2026-09-16: the hand-written toasts are `fixed … z-50`
(`vehicles/page.tsx:504`, `calendar/page.tsx:766`) while `DialogOverlay` and `DialogContent`
are also `z-50` (`packages/ui/src/components/dialog.tsx:42,64`) and are **portaled to
`document.body`**. An equal `z-index` is broken by DOM order, and the portal is appended last,
so the modal paints over the toast — a validation message nobody can read, sitting under a
`bg-black/30` + `backdrop-blur-sm` scrim. Sonner's toaster is `z-index: 999999999` in its
compiled CSS, so `toast()` **is** visible above an open dialog where a helper owning its own
`div` is not. This is why #23's ten `alert()` calls went to sonner rather than to the pages'
existing helper — and why that helper's own successes looked fine: they fire after the dialog
closes.

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
10. **After a mechanical transform, run the formatter and assert it is a no-op.** Four commits
   of print-route work used slice-and-shift scripts and checked guard, fixtures, typecheck,
   lint and build each time — **none of which include Biome**. The drift sat unnoticed until an
   unrelated sweep happened to run `npm run format` and Biome reported "Fixed 6 files".
   Shifting a block eight spaces left changes which lines fit, so the formatter reflows the JSX
   the script produced. One line, and it belongs beside the other gates.
11. **A script that writes is not a script that verifies.** A rewiring script removed a
   function with naive brace counting, which stops at the `}` of a destructuring pattern in
   `function F({ a, b }: Props) {` and leaves the body orphaned; it wrote the file anyway. What
   caught it was a **residual count** — the function still appeared once — and a removal size
   that contradicted the expected 76 lines. Restore first, then fix the tool, then re-run.
12. **Refuse-to-guess beats best-effort in a sweep.** The Hallmark removal required each file
   to pass four preconditions and would have *skipped and reported* any that failed rather than
   half-edit it. All 28 passed, so the strictness cost nothing; had one not, the alternative
   was a silent partial delete next to real code.

## Shell

- **PowerShell 5.1 reads `.ps1` as ANSI** unless there is a BOM. Non-ASCII characters
  mangle silently. Write scripts in Node.
- **`$ErrorActionPreference = "Stop"` plus `Write-Error` closes the window on failure**,
  so the error is printed and unreadable. A script that hides its own failure reports
  nothing: capture stdout, stderr and the exit code, log them, and wait before exiting.
- **Never write files with `Set-Content`** (mojibake). Use `edit`/`write`, or a Node script
  with explicit UTF-8. This is not repo-specific: `... | Set-Content -Encoding utf8 -NoNewline`
  in PowerShell 5.1 **double-encoded an already-UTF-8 file**, turning `SONUÇ` into `SONUÃ‡`,
  on a throwaway script where it was harmless. It would have been silent corruption on a source
  file, and nothing would have failed.
- **`-LiteralPath` for any path containing `[` or `]`.** PowerShell reads `[tenantSlug]` as a
  glob character class, so `Test-Path`/`Select-String -Path` on a route path returns **nothing,
  without error** — a five-line loop once printed an empty table and looked like "no matches".
  Use `-LiteralPath`, or glob-free Node.
- **`execFileSync("npx", …)` raises `ENOENT` on Windows** — `npx` is a `.cmd` shim and
  `spawn`/`execFile` do not resolve it. Call the tool's real binary, or go through the shell.
- **Check whether a tool caps its own output before reading a breakdown from it.** Biome's
  `check` prints 20 diagnostics and then "Diagnostics not shown: 5629". The total on the last
  line was right; the per-rule table built from the visible ones described 0.3% of the tree and
  read as though the rest were something else. Re-run with `--max-diagnostics=none`.
- **The guard reads `className` expressions and JSX attributes. It cannot see a colour written
  as a hex inside a plain JS template literal.** `quotes/page.tsx` built a whole A4 document as
  an HTML string and carried **69 inline hexes, 53 of them the banned slate scale**; the SLATE
  rule reported nothing, because there is no `slate-<tone>` utility to match. When a renderer
  emits HTML/CSS as strings, treat it as **outside every instrument here** and read it by hand.
  Related, and measured: the same blindness applies to a plugin's palette — if
  `@tailwindcss/typography` were installed, `prose-slate` would activate a slate palette the
  SLATE rule cannot match (`text-slate-500` is caught; `prose-slate` is not).
- **Inline `node -e` breaks on quoting here**, repeatedly. Write a script file.
- **Git writes are never parallel** — `index.lock` collides and a commit's message ends
  up describing a different file than its content. Long messages go in a file with
  `git commit -F`.
