import { expect, test as setup } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Signs in ONCE through the real form and saves the session, so the flow tests
 * start authenticated instead of logging in seven times.
 *
 * The sign-in goes through the UI rather than the auth API on purpose: the
 * Supabase SSR cookie (`sb-crm-auth-token`) is chunked, and hand-assembling it
 * would test my understanding of its format instead of the app's login. This
 * also means the login form itself is exercised on every authenticated run.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const AUTH_STATE = resolve(HERE, "..", ".auth", "user.json");

setup("sign in and save the session", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  expect(email, "E2E_EMAIL must be set").toBeTruthy();
  expect(password, "E2E_PASSWORD must be set").toBeTruthy();

  await page.goto("/login");
  await page.getByLabel("E-posta").fill(email ?? "");
  await page.getByLabel("Şifre").fill(password ?? "");
  await page.getByRole("button", { name: "Giriş Yap", exact: true }).click();

  await page.waitForURL((url) => !url.pathname.endsWith("/login"), {
    timeout: 30_000,
  });

  // A session that lands somewhere empty is not a session worth reusing.
  // `getByRole` skips elements hidden from the accessibility tree; a plain
  // `locator("h1").first()` picks the print-only header, which is display:none.
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

  await page.context().storageState({ path: AUTH_STATE });
});
