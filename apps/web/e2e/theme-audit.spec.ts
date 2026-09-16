import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, type Page, test } from "@playwright/test";

/**
 * Runtime theme audit — runs in BOTH themes.
 *
 * The static rule (`LIGHT_SURFACE_NO_DARK`) knows a surface is *tokenised*; it
 * cannot know that it *renders* correctly. This walks the real DOM in the theme
 * under test and measures what is actually painted: elements whose computed
 * background is light while the page is dark, and text whose contrast against
 * its own background is too low.
 *
 * The theme comes from the project name, so `--project=dark-mode` and
 * `--project=light-mode` run the same audit. Dark ran alone for a long time and
 * the light theme was never measured at all — which is how `text-muted-foreground` sat at
 * 2.63:1 on white without anyone knowing.
 *
 * One deliberate asymmetry: the LIGHT-SURFACE detector is dark-mode only. It looks
 * for light surfaces while the page is dark, and in the light theme every surface is
 * light, so it would flag the whole screen — including the inverted buttons the
 * project documents as intentional. The CONTRAST detector runs in both themes.
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
/**
 * WCAG AA for NORMAL text (4.5:1).
 *
 * This was 3:1 — the LARGE-text floor — which excused every normal-sized label
 * on every screen. The first number this audit ever reported (21 low-contrast
 * nodes) was measured at the weaker threshold, so it is a floor, not a total.
 */
const MIN_CONTRAST = 4.5;

/**
 * Report-only diagnostic, never an assertion: a route that fails to render (API
 * down, data missing, a crash caught by an error boundary) audits almost nothing
 * and therefore looks perfectly clean. The positive control proves the DETECTOR
 * works; it cannot prove the PAGE had anything to detect.
 */
const STARVED_ROUTE_FLOOR = 50;

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

/**
 * Text whose background is a gradient or an image. Kept with its class string, not as a
 * bare count: when these were 39 anonymous elements, finding out what they were meant
 * reading source files by hand.
 */
type Unmeasurable = { cls: string; tag: string; text: string };

/** One route's slice of the artifact, including how much of it was actually audited. */
type RouteAudit = {
  audited: number;
  contrast: Finding[];
  light: Finding[];
  route: string;
  unmeasurable: Unmeasurable[];
};

/** The JSON-safe shape of a colour parsed out of the canvas. */
type Rgba = { a: number; b: number; g: number; r: number };

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

/** Set the theme before the app boots, so it renders in that theme on first paint. */
async function forceTheme(page: Page, theme: "dark" | "light"): Promise<void> {
  await page.addInitScript((value: string) => {
    localStorage.setItem("crm_app_theme_mode", value);
  }, theme);
}

function auditPage(
  page: Page,
  luminance: number,
  minContrast: number,
  checkSurfaces: boolean
) {
  return page.evaluate(
    ({
      checkSurfaces,
      contrastFloor,
      threshold,
    }: {
      checkSurfaces: boolean;
      contrastFloor: number;
      threshold: number;
    }) => {
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
      /** Elements that passed the size + visibility filter — the audit's actual reach. */
      let audited = 0;
      /** Elements whose background is an image/gradient — text contrast is unknowable there. */
      const unmeasurable: Unmeasurable[] = [];

      /**
       * The background a text node ACTUALLY sits on. Most text has a
       * transparent background and inherits the page's, so measuring only
       * elements with their own opaque background would skip nearly all of it —
       * which is exactly the blind spot that made the first version of this
       * audit report "0 low-contrast" while measuring almost nothing.
       */
      /**
       * The colour a text node actually sits on, or a verdict that it cannot be known.
       *
       * A gradient (or any background image) paints OVER the background colour, and
       * `backgroundColor` is `rgba(0,0,0,0)` for it. Walking past such an element
       * measures the text against an ancestor it does not sit on: a white letter on a
       * blue-to-indigo gradient was reported at 1.04:1 on all 31 routes. Reporting
       * "cannot measure" is honest; reporting a number there is not.
       */
      const effectiveBackground = (
        start: Element | null
      ): { color: Rgba } | { unmeasurable: true } => {
        let node: Element | null = start;
        while (node) {
          const cs = getComputedStyle(node);
          if (cs.backgroundImage !== "none") {
            return { unmeasurable: true };
          }
          const c = parse(cs.backgroundColor);
          if (c && c.a >= 0.5) {
            return { color: c };
          }
          node = node.parentElement;
        }
        const body = parse(getComputedStyle(document.body).backgroundColor);
        return body
          ? { color: body }
          : { color: { a: 1, b: 255, g: 255, r: 255 } };
      };

      for (const el of document.body.querySelectorAll("*")) {
        const rect = el.getBoundingClientRect();
        if (rect.width < 8 || rect.height < 8) {
          continue;
        }
        const cs = getComputedStyle(el);
        if (
          cs.visibility === "hidden" ||
          cs.display === "none" ||
          cs.opacity === "0"
        ) {
          continue;
        }
        audited += 1;
        // NOT truncated. A clipped class string once misread a finding
        // (`text-destructive-foreground` printed as `text-destru…`), and this
        // audit clipped twice: at 110 characters here and 85 again at print time.
        const cls = el.getAttribute("class") ?? "";
        const text = (el.textContent ?? "").trim().replace(/\s+/g, " ");
        const bg = parse(cs.backgroundColor);

        if (checkSurfaces && bg && bg.a >= 0.5 && luminanceOf(bg) > threshold) {
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
          (node) =>
            node.nodeType === 3 && (node.textContent ?? "").trim().length > 0
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
        const resolved = effectiveBackground(el);
        if ("unmeasurable" in resolved) {
          unmeasurable.push({ cls, tag: el.tagName.toLowerCase(), text });
          continue;
        }
        const ratio = contrastOf(luminanceOf(fg), luminanceOf(resolved.color));
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
      return {
        audited,
        isDark: document.documentElement.classList.contains("dark"),
        lightSurfaces,
        lowContrast,
        unmeasurable,
      };
    },
    { checkSurfaces, contrastFloor: minContrast, threshold: luminance }
  );
}

test("audit every reachable screen in the project's theme", async ({
  page,
}) => {
  // 31 routes, each with a paint settle — well past the default per-test budget.
  test.setTimeout(600_000);

  // The project name IS the theme selector. One spec, two projects, no env plumbing
  // and no duplicated audit.
  const theme = test.info().project.name === "light-mode" ? "light" : "dark";

  // The surface detector is DIRECTIONAL: it finds LIGHT surfaces while the page is
  // dark, which is a defect. In the light theme every surface is light, so running it
  // there would flag the whole page — including the inverted buttons the project
  // documents as intentional. Dark only.
  const checkSurfaces = theme === "dark";

  // Near-black on a dark page, near-white on a light one. The control must be
  // unreadable IN THE THEME UNDER TEST or it proves nothing.
  const controlTextColor = theme === "dark" ? "#2a2a2e" : "#fafafa";

  await forceTheme(page, theme);

  await gotoSettled(page, "/");
  await page.waitForURL((url) => url.pathname !== "/", { timeout: 30_000 });
  const slug = new URL(page.url()).pathname.split("/").filter(Boolean)[0];
  expect(slug, "expected a tenant slug after sign-in").toBeTruthy();

  // ---- POSITIVE CONTROL: prove the detector can see BOTH defects ----------
  await page.evaluate(
    ({ surfaceControl, textColor }) => {
      if (surfaceControl) {
        const light = document.createElement("div");
        light.className = "__audit_control_light";
        light.style.cssText =
          "position:fixed;left:0;top:0;width:120px;height:40px;background:#ffffff;z-index:9999";
        document.body.append(light);
      }

      // Nearly invisible text: near-black on a dark page, near-white on a light one.
      const dim = document.createElement("p");
      dim.className = "__audit_control_contrast";
      dim.style.cssText = `position:fixed;left:0;top:60px;width:200px;height:40px;color:${textColor};font-size:14px;z-index:9999`;
      dim.textContent = "control text that should be unreadable";
      document.body.append(dim);
    },
    { surfaceControl: checkSurfaces, textColor: controlTextColor }
  );
  const control = await auditPage(
    page,
    LIGHT_BACKGROUND_LUMINANCE,
    MIN_CONTRAST,
    checkSurfaces
  );
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
  expect(control.isDark, `the ${theme} theme must be active`).toBe(
    theme === "dark"
  );
  if (checkSurfaces) {
    expect(
      control.lightSurfaces.some((f) =>
        f.cls.includes("__audit_control_light")
      ),
      "the detector failed to flag a known white box — its zero findings mean nothing"
    ).toBe(true);
  }
  expect(
    control.lowContrast.some((f) => f.cls.includes("__audit_control_contrast")),
    "the detector failed to flag known unreadable text — its zero findings mean nothing"
  ).toBe(true);
  console.log(
    `${theme}-mode audit: positive controls OK ` +
      `(${checkSurfaces ? "white box + " : ""}unreadable text flagged)`
  );

  // ---- the routes --------------------------------------------------------
  const routes = ["", ...dashboardRoutes().map((name) => `/${name}`)];
  console.log(
    `${theme}-mode audit: ${routes.length} route(s) from the app structure`
  );

  const report: RouteAudit[] = [];
  for (const route of routes) {
    await gotoSettled(page, `/${slug}${route}`);
    const { audited, lightSurfaces, lowContrast, unmeasurable } =
      await auditPage(
        page,
        LIGHT_BACKGROUND_LUMINANCE,
        MIN_CONTRAST,
        checkSurfaces
      );
    report.push({
      audited,
      contrast: lowContrast,
      light: lightSurfaces,
      route,
      unmeasurable,
    });
  }

  const totalLight = report.reduce((n, r) => n + r.light.length, 0);
  const totalContrast = report.reduce((n, r) => n + r.contrast.length, 0);
  const withFindings = report.filter(
    (r) => r.light.length > 0 || r.contrast.length > 0
  ).length;
  const starved = report.filter((r) => r.audited < STARVED_ROUTE_FLOOR);

  /**
   * The counts are read from THIS file, never from the log.
   *
   * The previous version printed at most 8 findings per route, so a route with
   * nine nodes of one kind under-reported and the total read like a fact when it
   * was a ceiling. `test-results/` is gitignored, so this never dirties the tree.
   */
  const artifactPath = resolve(
    HERE,
    "..",
    "test-results",
    `${theme}-mode-audit.json`
  );
  mkdirSync(dirname(artifactPath), { recursive: true });
  writeFileSync(
    artifactPath,
    `${JSON.stringify(
      {
        auditedElements: report.reduce((n, r) => n + r.audited, 0),
        generatedAt: new Date().toISOString(),
        lightSurfaceThreshold: LIGHT_BACKGROUND_LUMINANCE,
        minContrast: MIN_CONTRAST,
        theme,
        routes: report,
        starvedRouteFloor: STARVED_ROUTE_FLOOR,
        starvedRoutes: starved.map((r) => ({
          audited: r.audited,
          route: r.route,
        })),
        totals: {
          lightSurfaces: totalLight,
          lowContrast: totalContrast,
          unmeasurableElements: report.reduce(
            (n, r) => n + r.unmeasurable.length,
            0
          ),
          routes: routes.length,
          routesWithFindings: withFindings,
        },
      },
      null,
      2
    )}\n`
  );

  console.log(
    `${theme}-mode audit: ${withFindings}/${routes.length} route(s) with findings — ` +
      `${totalLight} light surface(s), ${totalContrast} low-contrast node(s) ` +
      `at ${MIN_CONTRAST}:1 — ${report.reduce((n, r) => n + r.unmeasurable.length, 0)} element(s) ` +
      `unmeasurable (gradient/image background) — artifact: ${artifactPath}`
  );
  if (starved.length > 0) {
    console.log(
      `${theme}-mode audit: WARNING — ${starved.length} route(s) audited fewer than ` +
        `${STARVED_ROUTE_FLOOR} element(s); a page that rendered nothing also reports clean:`
    );
    for (const r of starved) {
      console.log(`  ${r.route || "/(dashboard)"}: ${r.audited} element(s)`);
    }
  }
  for (const entry of report) {
    if (entry.light.length === 0 && entry.contrast.length === 0) {
      continue;
    }
    console.log(
      `  ${entry.route || "/(dashboard)"} — audited ${entry.audited} element(s)`
    );
    for (const f of entry.light) {
      console.log(
        `     LIGHT lum=${f.lum} area=${f.area} <${f.tag}> "${f.text}" :: ${f.cls}`
      );
    }
    for (const f of entry.contrast) {
      console.log(
        `     CONTRAST ${f.contrast}:1 <${f.tag}> "${f.text}" :: ${f.cls}`
      );
    }
  }
});
