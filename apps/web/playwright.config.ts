import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests for the CRM web app.
 *
 * Two suites, and the split is not cosmetic:
 *
 *   smoke          `/login`, `/register` and the protected-route redirect. Needs
 *                  no credentials, no Docker and no database — the middleware
 *                  falls back to `http://127.0.0.1:54321` and treats those
 *                  surfaces as public, and behaves identically when Supabase is
 *                  unreachable (verified against a dead port: 200 and 307). This
 *                  is the CI gate.
 *
 *   authenticated  the real flows: dashboard, customer list and detail, pipeline,
 *                  quotes, admin. Plus `theme-audit.spec.ts`, which audits rendered
 *                  surfaces in whichever theme the project selects — the one thing a
 *                  static rule cannot check, since a rule knows a surface is
 *                  tokenised, not that it renders correctly.
 *
 * The authenticated projects are only REGISTERED when credentials exist, so
 * `npm run test:e2e` still passes with just the smoke suite — no `.skip`, no
 * no-op green.
 *
 * They do not run in CI today, but NOT because the schema is undefined. The
 * schema IS tracked: `supabase/migrations/` holds 42 versioned migrations. What
 * is missing is a committed seed — the dev user needs a password, so
 * `supabase/seed.sql` is gitignored and `seed.sql.example` is the template —
 * plus the .NET API's own database. Wire those together and these suites can run
 * in CI like any other.
 *
 * (An earlier version of this comment claimed the prerequisites were "none of
 * which this repository defines". That was wrong, and it came from looking at the
 * OTHER repo's near-empty `supabase/` directory.)
 *
 * Credentials: `E2E_EMAIL` / `E2E_PASSWORD`, from the environment or from
 * `apps/web/.env.test.local` (gitignored). Nothing here is committed.
 */
const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Minimal `.env.test.local` reader — zero dependencies, same spirit as the
 * guard. Real environment variables always win, so `E2E_EMAIL=… npm run
 * test:e2e` overrides the file.
 */
function loadEnvFile(file: string): void {
  if (!existsSync(file)) {
    return;
  }
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    const key = match?.[1];
    if (!key || process.env[key] !== undefined) {
      continue;
    }
    const rawValue = match?.[2] ?? "";
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(resolve(HERE, ".env.test.local"));

const PORT = 3210;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const AUTH_STATE = ".auth/user.json";

const hasCredentials = Boolean(
  process.env.E2E_EMAIL && process.env.E2E_PASSWORD
);
if (hasCredentials) {
  mkdirSync(resolve(HERE, ".auth"), { recursive: true });
}

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  projects: [
    {
      name: "smoke",
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    ...(hasCredentials
      ? [
          {
            name: "setup",
            testMatch: /global\.setup\.ts/,
          },
          {
            dependencies: ["setup"],
            name: "authenticated",
            testMatch: /authenticated\.spec\.ts/,
            use: {
              ...devices["Desktop Chrome"],
              storageState: AUTH_STATE,
            },
          },
          {
            dependencies: ["setup"],
            name: "dark-mode",
            testMatch: /theme-audit\.spec\.ts/,
            use: {
              ...devices["Desktop Chrome"],
              storageState: AUTH_STATE,
            },
          },
          {
            // Same spec, same routes, same detectors — the PROJECT NAME picks the
            // theme. Dark ran alone for a long time, so the light theme had never
            // been measured at all; `text-muted-foreground` sitting at 2.63:1 on white is
            // what that blind spot looked like.
            dependencies: ["setup"],
            name: "light-mode",
            testMatch: /theme-audit\.spec\.ts/,
            use: {
              ...devices["Desktop Chrome"],
              storageState: AUTH_STATE,
            },
          },
        ]
      : []),
  ],
  reporter: process.env.CI ? "github" : "list",
  retries: process.env.CI ? 1 : 0,
  testDir: "./e2e",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  webServer: {
    // Self-sufficient: `next start` needs a build, so build here rather than
    // documenting a two-step dance.
    command: `npm run build && npm run start -- --port ${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    url: `${BASE_URL}/login`,
  },
});
