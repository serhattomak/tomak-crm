import { expect, test } from "@playwright/test";

/**
 * Unauthenticated smoke tests.
 *
 * Two of these double as copy contracts: the headings and the field labels are
 * asserted as exact strings, and both were set by the Turkish glossary
 * (`crm-ui-standards.md` §1.6). If someone renames "E-posta" back to "Email",
 * this suite fails rather than the change landing quietly.
 *
 * The field lookups use `getByLabel`, which only resolves if the label is
 * programmatically associated with its input. That association was missing on
 * both auth screens — `<label>` with no `htmlFor`, `<input>` with no `id` — and
 * no lint rule or guard could see it, because the icons-only rule looks for a
 * different shape entirely. `getByLabel` is the regression test for it.
 */

test("login renders with named fields", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Tekrar Hoş Geldiniz"
  );
  await expect(page.getByLabel("E-posta")).toBeVisible();
  await expect(page.getByLabel("Şifre")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Giriş Yap", exact: true })
  ).toBeVisible();
});

test("register renders with named fields", async ({ page }) => {
  await page.goto("/register");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Hesap Oluştur"
  );
  await expect(page.getByLabel("Ad Soyad")).toBeVisible();
  await expect(page.getByLabel("E-posta")).toBeVisible();
  await expect(page.getByLabel("Şifre")).toBeVisible();
});

test("a protected route redirects to login", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
});

test("submitting an empty login form does not navigate", async ({ page }) => {
  await page.goto("/login");

  await page.getByRole("button", { name: "Giriş Yap", exact: true }).click();

  await expect(page).toHaveURL(/\/login$/);
});

test("a rejected login stays put and returns the form to a usable state", async ({
  page,
}) => {
  await page.goto("/login");

  await page.getByLabel("E-posta").fill("smoke-test@example.invalid");
  await page.getByLabel("Şifre").fill("not-a-real-password");

  const submit = page.getByRole("button", { name: "Giriş Yap", exact: true });
  await submit.click();

  // The error text comes from Supabase and differs by environment, so assert
  // behaviour instead: no navigation, and the form is interactive again (which
  // proves the round trip finished rather than hanging on the loading state).
  await expect(page).toHaveURL(/\/login$/);
  await expect(submit).toBeEnabled();
});

test("the login page loads without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  expect(errors).toEqual([]);
});
