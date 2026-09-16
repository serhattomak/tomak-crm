import { existsSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, type Page, test } from "@playwright/test";

/**
 * Runtime dark-mode audit.
 *
 * The static rule (`LIGHT_SURFACE_NO_DARK`) knows a surface is *tokenised*; it
 * cannot know that it *renders* correctly. This walks the real DOM in the dark
 * theme and measures what is actually painted: elements whose computed
 * background is light while the page is dark, and text whose contrast against
 * its own background is too low.
 *
 * Two things make the result trustworthy, and both were needed:
 *
 *   1. A POSITIVE CONTROL. A detector that reports zero findings is either
 *      looking at a clean page or not looking at all, and those are
 *      indistinguishable from a number. So a known white box is injected first
 *      and the audit must flag it — the same reasoning as the guard's fixtures.
 *   2. Routes come from the FILESYSTEM, not the nav. The nav only renders the
 *      active hub's modules (13 links), so crawling it silently audited a
 *      quarter of the app.
 */

/** Light enough to be wrong on a dark page. zinc-400 is ~0.37; zinc-200 ~0.78. */
const LIGHT_BACKGROUND_LUMINANCE = 0.6;
/** WCAG AA for large text. Anything below this on a dark page is unreadable. */
const MIN_CONTRAST = 3;

const HERE = dirname(fileURLToPath(import.meta.url));
const TENANT_DIR = resolve(HERE, "..", "app", "(dashboard)", "[tenantSlug]");

type Finding = {
  area: number;
  cls: string;
  contrast?: number;
  lum?: number;
  tag: string;
  text: string;
};

/** Every dashboard route that has a page, taken from the app's own structure. */
function dashboardRoutes(): string[] {
  return readdirSync(TENANT_DIR, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(resolve(TENANT_DIR, entry.name, "page.tsx"))
    )
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith("_") && !name.startsWith("["))
    .sort();
}

/**
 * Navigate and let client-side data land.
 *
 * Deliberately NOT `networkidle`: the dashboard holds realtime subscriptions, so
 * "no network for 500ms" can simply never happen and the whole audit hangs. A
 * short settle after `domcontentloaded` is the honest trade for a paint audit.
 */
async function gotoSettled(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
}

/** Set the theme before the app boots, so it renders dark on first paint. */
async function forceDark(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("crm_app_theme_mode", "dark");
  });
}

function auditPage(page: Page, luminance: number, minContrast: number) {
  return page.evaluate(
    ({ threshold, contrastFloor }: { threshold: number; contrastFloor: number }) => {
      /**
       * Resolve ANY CSS colour to sRGB by painting it and reading the pixel.
       *
       * A regex over `rgb()`/`rgba()` is not enough and fails silently: this
       * app's theme tokens are `oklch`, and Chromium computes those as `lab(…)`.
       * The first version of this audit parsed `lab(…)` as `null` and fell back
       * to WHITE — so every tokenised dark background was treated as a light one
       * and the audit happily reported "0 findings". The canvas is format
       * agnostic and cannot make that mistake.
       */
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const resolve = (cssColor: string) => {
        if (!ctx) {
          return null;
        }
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = "#000";
        ctx.fillStyle = cssColor;
        ctx.fillRect(0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        return {
          a: (data[3] ?? 0) / 255,
          b: data[2] ?? 0,
          g: data[1] ?? 0,
          r: data[0] ?? 0,
        };
      };
      const parse = (raw: string) => {
        if (!raw || raw === "transparent") {
          return null;
        }
        return resolve(raw);
      };
      const channel = (v: number) => {
        const s = v / 255;
        return s <= 0.039_28 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      const luminanceOf = (c: { r: number; g: number; b: number }) =>
        0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
      const contrastOf = (a: number, b: number) =>
        (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

      const lightSurfaces: Finding[] = [];
      const lowContrast: Finding[] = [];

      /**
       * The background a text node ACTUALLY sits on. Most text has a
       * transparent background and inherits the page's, so measuring only
       * elements with their own opaque background would skip nearly all of it —
       * which is exactly the blind spot that made the first version of this
       * audit report "0 low-contrast" while measuring almost nothing.
       */
      const effectiveBackground = (start: Element | null) => {
        let node: Element | null = start;
        while (node) {
          const c = parse(getComputedStyle(node).backgroundColor);
          if (c && c.a >= 0.5) {
            return c;
          }
          node = node.parentElement;
        }
        return parse(getComputedStyle(document.body).backgroundColor) ?? {
          a: 1,
          b: 255,
          g: 255,
          r: 255,
        };
      };

      for (const el of document.body.querySelectorAll("*")) {
        const rect = el.getBoundingClientRect();
        if (rect.width < 8 || rect.height < 8) {
          continue;
        }
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") {
          continue;
        }
        const cls = (el.getAttribute("class") ?? "").slice(0, 110);
        const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 48);
        const bg = parse(cs.backgroundColor);

        if (bg && bg.a >= 0.5 && luminanceOf(bg) > threshold) {
          lightSurfaces.push({
            area: Math.round(rect.width * rect.height),
            cls,
            lum: Number(luminanceOf(bg).toFixed(3)),
            tag: el.tagName.toLowerCase(),
            text,
          });
        }

        // Contrast, only for elements that hold text DIRECTLY, so a container
        // is not measured once per descendant.
        const hasDirectText = [...el.childNodes].some(
          (node) => node.nodeType === 3 && (node.textContent ?? "").trim().length > 0
        );
        if (!hasDirectText) {
          continue;
        }
        const fg = parse(cs.color);
        if (!fg || fg.a < 0.5) {
          continue;
        }
        // Contrast. The walk starts at the element ITSELF: an element with its
        // own opaque background is what its text sits on. Starting at the parent
        // (as the first version did) skipped that background and compared the
        // text against an ancestor instead — which is how the user avatar was
        // reported at 1.08:1 on all 31 routes when it is actually ~5:1.
        const bgForText = effectiveBackground(el);
        const ratio = contrastOf(luminanceOf(fg), luminanceOf(bgForText));
        if (ratio < contrastFloor) {
          lowContrast.push({
            area: Math.round(rect.width * rect.height),
            cls,
            contrast: Number(ratio.toFixed(2)),
            tag: el.tagName.toLowerCase(),
            text,
          });
        }
      }
      return { isDark: document.documentElement.classList.contains("dark"), lightSurfaces, lowContrast };
    },
    { contrastFloor: minContrast, threshold: luminance }
  );
}

test("dark mode: audit every reachable screen", async ({ page }) => {
  // 31 routes, each with a paint settle — well past the default per-test budget.
  test.setTimeout(600_000);
  await forceDark(page);

  await gotoSettled(page, "/");
  await page.waitForURL((url) => url.pathname !== "/", { timeout: 30_000 });
  const slug = new URL(page.url()).pathname.split("/").filter(Boolean)[0];
  expect(slug, "expected a tenant slug after sign-in").toBeTruthy();

  // ---- POSITIVE CONTROL: prove the detector can see BOTH defects ----------
  await page.evaluate(() => {
    const light = document.createElement("div");
    light.className = "__audit_control_light";
    light.style.cssText =
      "position:fixed;left:0;top:0;width:120px;height:40px;background:#ffffff;z-index:9999";
    document.body.append(light);

    // Nearly invisible text: dark grey on the dark page, well under 3:1.
    const dim = document.createElement("p");
    dim.className = "__audit_control_contrast";
    dim.style.cssText =
      "position:fixed;left:0;top:60px;width:200px;height:40px;color:#2a2a2e;font-size:14px;z-index:9999";
    dim.textContent = "control text that should be unreadable";
    document.body.append(dim);
  });
  const control = await auditPage(page, LIGHT_BACKGROUND_LUMINANCE, MIN_CONTRAST);
  const diagnostic = await page.evaluate(() => {
    const el = document.querySelector(".__audit_control_contrast");
    if (!el) {
      return "control element missing";
    }
    const cs = getComputedStyle(el);
    return {
      bodyBg: getComputedStyle(document.body).backgroundColor,
      childNodes: el.childNodes.length,
      color: cs.color,
      display: cs.display,
      htmlBg: getComputedStyle(document.documentElement).backgroundColor,
      rect: `${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`,
      visibility: cs.visibility,
    };
  });
  console.log("CONTROL DIAGNOSTIC:", JSON.stringify(diagnostic));
  console.log("CONTROL lowContrast findings:", control.lowContrast.length);
  await page.evaluate(() => {
    document.querySelector(".__audit_control_light")?.remove();
    document.querySelector(".__audit_control_contrast")?.remove();
  });
  expect(control.isDark, "the dark theme must be active").toBe(true);
  expect(
    control.lightSurfaces.some((f) => f.cls.includes("__audit_control_light")),
    "the detector failed to flag a known white box — its zero findings mean nothing"
  ).toBe(true);
  expect(
    control.lowContrast.some((f) => f.cls.includes("__audit_control_contrast")),
    "the detector failed to flag known unreadable text — its zero findings mean nothing"
  ).toBe(true);
  console.log("dark-mode audit: positive controls OK (white box + unreadable text both flagged)");

  // ---- the routes --------------------------------------------------------
  const routes = ["", ...dashboardRoutes().map((name) => `/${name}`)];
  console.log(`dark-mode audit: ${routes.length} route(s) from the app structure`);

  const report: Array<{ route: string; light: Finding[]; contrast: Finding[] }> = [];
  for (const route of routes) {
    await gotoSettled(page, `/${slug}${route}`);
    const { lightSurfaces, lowContrast } = await auditPage(
      page,
      LIGHT_BACKGROUND_LUMINANCE,
      MIN_CONTRAST
    );
    if (lightSurfaces.length > 0 || lowContrast.length > 0) {
      report.push({ contrast: lowContrast, light: lightSurfaces, route });
    }
  }

  const totalLight = report.reduce((n, r) => n + r.light.length, 0);
  const totalContrast = report.reduce((n, r) => n + r.contrast.length, 0);
  console.log(
    `dark-mode audit: ${report.length}/${routes.length} route(s) with findings — ` +
      `${totalLight} light surface(s), ${totalContrast} low-contrast node(s)`
  );
  for (const entry of report) {
    console.log(`  ${entry.route || "/(dashboard)"}`);
    for (const f of entry.light.slice(0, 8)) {
      console.log(
        `     LIGHT lum=${f.lum} area=${f.area} <${f.tag}> "${f.text}" :: ${f.cls.slice(0, 85)}`
      );
    }
    for (const f of entry.contrast.slice(0, 8)) {
      console.log(
        `     CONTRAST ${f.contrast}:1 <${f.tag}> "${f.text}" :: ${f.cls.slice(0, 85)}`
      );
    }
  }
});
