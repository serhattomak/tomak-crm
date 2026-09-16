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
 *                  quotes, admin. Plus `dark-mode.spec.ts`, which audits rendered
 *                  surfaces in the dark theme — the one thing a static rule
 *                  cannot check, since a rule knows a surface is tokenised, not
 *                  that it renders correctly.
 *
 * The authenticated projects are only REGISTERED when credentials exist, so
 * `npm run test:e2e` still passes with just the smoke suite — no `.skip`, no
 * no-op green. They cannot run in CI at all: their prerequisites are a .NET API,
 * a Supabase stack and seeded tenant data, none of which this repository
 * defines. That is a hard constraint, not a preference.
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
            testMatch: /dark-mode\.spec\.ts/,
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
