import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests for the CRM web app.
 *
 * Scope note: this suite covers the surfaces reachable WITHOUT a session —
 * `/login`, `/register` and the protected-route redirect. Five of the six flows
 * the roadmap names (customer list, customer detail, pipeline, quote, admin)
 * need an authenticated session, which needs a seeded Supabase project; that is
 * recorded as deferred work rather than written here, because a test that cannot
 * run is not a test.
 *
 * Deliberately runnable with no credentials and no Docker: the app's middleware
 * falls back to `http://127.0.0.1:54321` and treats those three surfaces as
 * public, and it behaves identically when Supabase is unreachable — verified by
 * pointing it at a dead port (login 200, protected route 307).
 */
const PORT = 3210;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  reporter: process.env.CI ? "github" : "list",
  retries: process.env.CI ? 1 : 0,
  testDir: "./e2e",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  webServer: {
    // Self-sufficient: a build must exist for `next start`, so build here rather
    // than documenting a two-step dance. ~15s, well inside the timeout.
    command: `npm run build && npm run start -- --port ${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    url: `${BASE_URL}/login`,
  },
});
