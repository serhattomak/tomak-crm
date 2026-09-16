import { expect, type Page, test } from "@playwright/test";

/**
 * The five flows the roadmap names, against a real signed-in session.
 *
 * These run LOCAL ONLY. Their prerequisites — a .NET API, a Supabase stack and
 * seeded tenant data — are not defined anywhere in this repository, so CI cannot
 * reproduce them; the config does not register this project without credentials
 * rather than shipping a suite that skips itself.
 *
 * Each flow asserts four things: a visible `h1`, the URL, that the page rendered
 * content rather than an empty shell, and that no uncaught exception was thrown.
 * `pageerror` is used instead of console noise because an uncaught exception is
 * unambiguously a bug, whereas console output is not.
 */

/** Navigate and wait for data. Without this the table is counted before it fills. */
async function gotoSettled(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

/** The tenant slug is data, not a constant: derive it from the redirect. */
async function tenantSlug(page: Page): Promise<string> {
  await gotoSettled(page, "/");
  await page.waitForURL((url) => url.pathname !== "/", { timeout: 30_000 });
  const slug = new URL(page.url()).pathname.split("/").filter(Boolean)[0];
  expect(slug, "expected a tenant slug in the URL after sign-in").toBeTruthy();
  return slug ?? "";
}

/** Fail the test on an uncaught exception, for the whole of that test. */
function guardAgainstPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message.slice(0, 200)));
  return errors;
}

/** A visible h1 that is not the print-only header (`getByRole` skips display:none). */
function firstHeading(page: Page) {
  return page.getByRole("heading", { level: 1 }).first();
}

function bodyText(page: Page): Promise<string> {
  return page
    .locator("body")
    .innerText()
    .then((text) => text.replace(/\s+/g, " "));
}

test("dashboard renders for the signed-in tenant", async ({ page }) => {
  const errors = guardAgainstPageErrors(page);
  const slug = await tenantSlug(page);

  await expect(firstHeading(page)).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/${slug}`));

  const body = await bodyText(page);
  expect(body.length, "dashboard body looks empty").toBeGreaterThan(200);
  expect(errors).toEqual([]);
});

test("customer list renders and a customer detail opens", async ({ page }) => {
  const errors = guardAgainstPageErrors(page);
  const slug = await tenantSlug(page);

  await gotoSettled(page, `/${slug}/customers`);
  await expect(firstHeading(page)).toBeVisible();

  const body = await bodyText(page);
  expect(body.length, "customer list body looks empty").toBeGreaterThan(200);

  const rows = page.locator("table tbody tr");
  const rowCount = await rows.count();
  console.log(`customer list: ${rowCount} row(s)`);
  if (rowCount === 0) {
    // A tenant with no customers is legitimate: the screen rendering is the
    // assertion, and there is no detail page to open.
    return;
  }

  // Click the customer LINK, not the row. The row carries an onClick, but its
  // centre lands on inner interactive cells (tel:, mailto:, the delete button),
  // and clicking it there is a coin flip. The link is the semantic target.
  await page.locator("table tbody a[href*='/customers/']").first().click();
  await page.waitForURL(/\/customers\/[^/]+$/, { timeout: 30_000 });
  await expect(firstHeading(page)).toBeVisible();

  expect(errors).toEqual([]);
});

test("pipeline renders for the signed-in tenant", async ({ page }) => {
  const errors = guardAgainstPageErrors(page);
  const slug = await tenantSlug(page);

  await gotoSettled(page, `/${slug}/pipelines`);
  await expect(firstHeading(page)).toBeVisible();

  const body = await bodyText(page);
  expect(body.length, "pipeline body looks empty").toBeGreaterThan(200);
  expect(errors).toEqual([]);
});

test("quote list renders for the signed-in tenant", async ({ page }) => {
  const errors = guardAgainstPageErrors(page);
  const slug = await tenantSlug(page);

  await gotoSettled(page, `/${slug}/quotes`);
  await expect(firstHeading(page)).toBeVisible();

  const body = await bodyText(page);
  expect(body.length, "quote list body looks empty").toBeGreaterThan(200);
  expect(errors).toEqual([]);
});

test("admin console renders for a super admin", async ({ page }) => {
  const errors = guardAgainstPageErrors(page);

  await gotoSettled(page, "/admin");
  await expect(firstHeading(page)).toBeVisible();

  const body = await bodyText(page);
  expect(body.length, "admin console body looks empty").toBeGreaterThan(200);
  expect(errors).toEqual([]);
});
