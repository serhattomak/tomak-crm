#!/usr/bin/env node
/**
 * crm-ui-guard.mjs — lint guard against CRM input/color drift.
 *
 * Bans in CRM scope (apps/web + packages/ui):
 *   - native `<select>`            → use SelectField (≤7 fixed opts) or Combobox (dynamic)
 *   - `<input type="number">`      → use NumberInput (packages/ui)
 *   - `<input type="date">`        → use DatePicker / DateRangePicker (packages/ui)
 *   - arbitrary hex fills `bg-[#…]`/`text-[#…]`/… → design tokens
 *   - inline-style hex (`color: "#…"`, `backgroundColor: "#…"`, SVG fill/stroke)
 *                                      → design tokens
 *   - `slate-*`                    → `zinc-*` (dark-mode readable)
 *   - `violet-*` / `fuchsia-*`     → `blue-500` scale (CRM accent)
 *
 * Advisory rules (severity: "warn" — reported, NOT blocking; exit code unaffected).
 * They exist so the migration in ADR-0004 / docs/crm-ui-roadmap.md can be tracked:
 *   - arbitrary text size `text-[13px]` / `text-[9px]` / … → `text-2xs` (11px),
 *                                      `text-3xs` (10px) or the Tailwind scale
 *   - native `<table>`             → @workspace/ui Table primitives
 *   - inline `style={{ … }}`        → Tailwind classes + semantic tokens
 * A warn rule is promoted to "error" (blocking) only once that rule is clean in a
 * `--full` sweep — see ADR-0004 §9. Rules without an explicit `severity` are errors.
 *
 * Explicit exceptions (never scanned, never changed by this guard):
 *   - Store: `apps/ecommerce/**` is NOT in scope (light-only store contract).
 *   - Brand fills: tenant logo/brand overrides via `--store-primary` CSS var
 *     (no hex utilities involved) — untouched.
 *   - `apps/web/lib/email-preview.ts`: keeps `isDark` branching and emits only
 *     token values (`LIGHT_TOKENS`/`DARK_TOKENS` oklch maps bound to
 *     `--email-*` custom properties). oklch token maps are allowed by design;
 *     only `#hex` literals are banned, and the file contains none.
 *   - Data-driven hex (e.g. `colorHex: "#3B82F6"` shift colors) is NOT flagged:
 *     the hex rules only match styling positions (Tailwind arbitrary values,
 *     style props, SVG paint attributes).
 *
 * Run:
 *   npm run guard:crm-ui            # scoped check (Batch 1–3 touched files) — CI gate
 *   npm run guard:crm-ui:full       # full CRM sweep (migration tracker, may list legacy drift)
 *   node scripts/crm-ui-guard.mjs --help
 *
 * Exit codes: 0 clean (advisory warnings do not affect exit code) · 1 error-level
 * violation(s) found · 2 usage/config error.
 * No auto-fix: failures STOP the batch — fix by hand per ADR-0002, never
 * bulk-sed. Shell-less environments: orchestrator must execute the run
 * commands above and paste the log as proof.
 */

// Typed via JSDoc; plain node, zero dependencies. (Intentionally no ts-check
// directive: scripts/ sits outside all workspace tsconfigs, so tsc never
// covers it and it cannot break `turbo typecheck`.)
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const DEFAULT_ALLOWLIST = "scripts/crm-ui-guard.allowlist.json";

/**
 * Batch 1–3 touched files. The CI gate scans exactly this list:
 * every file here was migrated to packages/ui standards, so any hit
 * is a regression.
 * @type {string[]}
 */
const SCOPE = [
  "apps/web/app/(dashboard)/[tenantSlug]/compliance/page.tsx",
  "apps/web/app/(dashboard)/[tenantSlug]/automations/[workflowId]/page.tsx",
  "apps/web/app/(dashboard)/[tenantSlug]/attendance/page.tsx",
  "apps/web/components/phone-input.tsx",
  "packages/ui/src/components/phone-input.tsx",
  "apps/web/components/email/compose-modal.tsx",
  "apps/web/components/email/convert-to-lead-modal.tsx",
  "apps/web/components/email/email-account-modal.tsx",
  "apps/web/app/(dashboard)/[tenantSlug]/organization/page.tsx",
  "apps/web/app/(admin)/admin/tenants/page.tsx",
  "apps/web/app/(admin)/admin/tenants/[tenantId]/page.tsx",
  "apps/web/app/(dashboard)/[tenantSlug]/automations/page.tsx",
  "apps/web/app/(dashboard)/[tenantSlug]/email/page.tsx",
  "apps/web/app/(admin)/layout.tsx",
  "apps/web/app/(auth)/login/page.tsx",
  "apps/web/components/bulk-action-bar.tsx",
  "apps/web/app/page.tsx",
  "apps/web/lib/email-preview.ts",
];

/** Full-sweep roots for `--full`. Store (`apps/ecommerce`) is deliberately absent. */
const FULL_ROOTS = ["apps/web", "packages/ui"];
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".turbo",
  "dist",
  "build",
  "coverage",
  "crm-ui-guard.fixtures",
]);

/**
 * @typedef {{ id: string, pattern: RegExp, hint: string, severity?: "error" | "warn" }} Rule
 * NOTE: SLATE uses a `(?<![A-Za-z])` lookbehind so `translate-x-*`
 * utilities never match.
 * @type {Rule[]}
 */
const RULES = [
  {
    hint: "native <select> — use SelectField (≤7 fixed opts) or Combobox (dynamic) from packages/ui",
    id: "NATIVE_SELECT",
    pattern: /<select(?=[\s>])/g,
  },
  {
    hint: '<input type="number"> — use NumberInput from packages/ui (para: precision=2 suffix ₺; adet: precision=0 stepper)',
    id: "INPUT_NUMBER",
    pattern:
      /<input\b[^>]*?\btype\s*=\s*(?:"number"|'number'|\{\s*["']number["']\s*\})/gs,
  },
  {
    hint: '<input type="date"> — use DatePicker (clearable, YYYY-MM-DD, TR locale) or DateRangePicker from packages/ui',
    id: "INPUT_DATE",
    pattern:
      /<input\b[^>]*?\btype\s*=\s*(?:"date"|'date'|\{\s*["']date["']\s*\})/gs,
  },
  {
    hint: "arbitrary hex fill (bg-[#…]/text-[#…]/…) — use design tokens (bg-muted, text-zinc-*, …)",
    id: "ARBITRARY_HEX",
    pattern:
      /(?:bg|text|border|ring|from|via|to|fill|stroke|outline|decoration|accent|caret|divide|placeholder)-\[#/g,
  },
  {
    hint: 'inline-style hex (color/backgroundColor/borderColor: "#…") — use design tokens with dark: variants',
    id: "INLINE_HEX_STYLE",
    pattern:
      /(?<![A-Za-z0-9_-])(?:backgroundColor|background|borderColor|color|fill|stroke)\s*:\s*["']#[0-9a-fA-F]{3,8}["']/g,
  },
  {
    hint: 'SVG paint hex (fill="#…"/stroke="#…") — use currentColor or design tokens',
    id: "SVG_PAINT_HEX",
    pattern:
      /<(?:svg|path|circle|rect|line|polyline|polygon)\b[^>]*?\b(?:fill|stroke)\s*=\s*["']#[0-9a-fA-F]{3,8}["']/gs,
  },
  {
    hint: "slate-* — use zinc-* (dark-mode readable)",
    id: "SLATE",
    pattern:
      /(?<![A-Za-z])slate-(?:50|100|200|300|400|500|600|700|800|900|950)\b/g,
  },
  {
    hint: "violet-* — use blue-500 scale (CRM accent)",
    id: "VIOLET",
    pattern:
      /(?<![A-Za-z])violet-(?:50|100|200|300|400|500|600|700|800|900|950)\b/g,
  },
  {
    hint: "fuchsia-* — use blue-500 scale (CRM accent; brand gradients stay in store theme vars only)",
    id: "FUCHSIA",
    pattern:
      /(?<![A-Za-z])fuchsia-(?:50|100|200|300|400|500|600|700|800|900|950)\b/g,
  },
  {
    hint: "arbitrary text size — use text-2xs (11px) / text-3xs (10px) or the Tailwind scale (text-xs, text-sm, …)",
    id: "ARBITRARY_TEXT_SIZE",
    pattern: /text-\[[0-9]*\.?[0-9]+(?:px|rem|em)\]/g,
    severity: "warn",
  },
  {
    hint: "native <table> — use @workspace/ui Table primitives (TableHeader, TableRow, TableCell, …)",
    id: "NATIVE_TABLE",
    pattern: /<table(?=[\s>])/g,
    severity: "warn",
  },
  {
    hint: "static inline style object — use Tailwind classes + semantic tokens. Only STATIC-shaped blocks are flagged: values are plain quoted literals with no template interpolation, member access or fallback. style={{}} remains correct for unmeasurable dynamic values (1.4), so a percentage, a transform or a DB-driven colourHex is not a violation",
    id: "INLINE_STYLE_PROP",
    pattern:
      /style=\{\{(?=[^{}]*?:\s*["'][^"'$]*["'])(?![^{}]*\$\{)(?![^{}]*[.?|])/g,
    severity: "warn",
  },
  {
    hint: "hardcoded card surface — use bg-card / border-border. The dark: partner must go with it: it sets the same property in the same variant, so the legacy class wins in the compiled CSS and the token never applies (Faz 5.0). Translucent bg-white/90 with backdrop-blur is NOT flagged — that frosted surface is deliberate",
    id: "CARD_SURFACE",
    pattern:
      /(?<![A-Za-z:/-])(?:bg-white(?![\/A-Za-z0-9-])(?=[^"'\n]*dark:bg-zinc-(?:800|900|950))|border-zinc-(?:100|200|300)(?:\/\d+)?(?=[^"'\n]*dark:border-zinc-(?:700|800|900)))/g,
    severity: "warn",
  },
];

/**
 * @typedef {{ file: string, rule: string, reason: string }} AllowEntry
 * @param {string} allowlistPath
 * @returns {AllowEntry[]}
 */
function loadAllowlist(allowlistPath) {
  const abs = resolve(REPO_ROOT, allowlistPath);
  if (!existsSync(abs)) {
    return [];
  }
  /** @type {unknown} */
  const raw = readFileSync(abs, "utf8");
  /** @type {{ entries?: AllowEntry[] }} */
  const parsed = JSON.parse(String(raw));
  if (!Array.isArray(parsed.entries)) {
    throw new Error(
      `allowlist ${allowlistPath} must contain an "entries" array`
    );
  }
  return parsed.entries;
}

/**
 * @param {string} dir
 * @param {string[]} out
 * @returns {string[]}
 */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) {
      continue;
    }
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) {
      walk(abs, out);
    } else if (/\.(tsx?|jsx)$/.test(name) && !/\.d\.(ts|tsx)$/.test(name)) {
      out.push(abs);
    }
  }
  return out;
}

/**
 * @param {number} index
 * @param {string} content
 * @returns {number}
 */
function lineOf(index, content) {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (content[i] === "\n") {
      line++;
    }
  }
  return line;
}

/**
 * @param {string} rel
 * @param {string} ruleId
 * @param {AllowEntry[]} allowlist
 * @returns {AllowEntry | undefined}
 */
function allowed(rel, ruleId, allowlist) {
  return allowlist.find(
    (e) => e.file === rel && (e.rule === ruleId || e.rule === "*")
  );
}

/**
 * @param {string} abs
 * @param {AllowEntry[]} allowlist
 * @returns {{ violations: { file: string, line: number, rule: string, hint: string, excerpt: string, severity: "error" | "warn" }[], suppressed: number }}
 */
function scanFile(abs, allowlist) {
  const rel = relative(REPO_ROOT, abs).replace(/\\/g, "/");
  const content = readFileSync(abs, "utf8");
  const lines = content.split("\n");
  const violations = [];
  let suppressed = 0;
  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    /** @type {RegExpExecArray | null} */
    let m;
    while ((m = rule.pattern.exec(content)) !== null) {
      if (m[0].length === 0) {
        rule.pattern.lastIndex++;
        continue;
      }
      if (allowed(rel, rule.id, allowlist)) {
        suppressed++;
        continue;
      }
      const line = lineOf(m.index, content);
      violations.push({
        excerpt: (lines[line - 1] ?? "").trim().slice(0, 160),
        file: rel,
        hint: rule.hint,
        line,
        rule: rule.id,
        severity: rule.severity ?? "error",
      });
      // Guard against zero-width loops on `s`-flag patterns.
      if (rule.pattern.lastIndex === m.index) {
        rule.pattern.lastIndex++;
      }
    }
  }
  return { suppressed, violations };
}

function printHelp() {
  console.log(`crm-ui-guard — forbid native inputs + off-palette colors in CRM scope

usage:
  node scripts/crm-ui-guard.mjs [options] [path...]

options:
  --full                  scan all of apps/web + packages/ui (Store excluded by design)
  --allowlist <file>      allowlist JSON (default: ${DEFAULT_ALLOWLIST})
  --help                  this text

  no path + no --full     scan the Batch 1–3 SCOPE list (CI gate).

severity:
  error (default)   blocking — affects the exit code
  warn              advisory — printed but never fails the run; a warn rule is
                    promoted to error only once a --full sweep is clean for it.

note:
  The scoped SCOPE list is the live regression gate and stays in place until a
  clean --full sweep (ADR-0004 §9), at which point it is retired.

examples:
  node scripts/crm-ui-guard.mjs
  node scripts/crm-ui-guard.mjs --full
  node scripts/crm-ui-guard.mjs scripts/crm-ui-guard.fixtures/dirty.tsx
`);
}

/** @param {string[]} argv */
function main(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return 0;
  }
  const full = argv.includes("--full");
  const ai = argv.indexOf("--allowlist");
  const allowlistPath = ai === -1 ? DEFAULT_ALLOWLIST : (argv[ai + 1] ?? "");
  if (ai !== -1 && !argv[ai + 1]) {
    console.error("error: --allowlist requires a file argument");
    return 2;
  }
  const positionals = argv.filter((a, i) => {
    if (a.startsWith("--")) {
      return false;
    }
    if (ai !== -1 && i === ai + 1) {
      return false;
    }
    return true;
  });

  let allowlist = [];
  try {
    allowlist = loadAllowlist(allowlistPath);
  } catch (/** @type {unknown} */ err) {
    console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
    return 2;
  }

  /** @type {string[]} */
  let files = [];
  if (positionals.length > 0) {
    for (const p of positionals) {
      const abs = resolve(REPO_ROOT, p);
      if (!existsSync(abs)) {
        console.error(`error: path not found: ${p}`);
        return 2;
      }
      if (statSync(abs).isDirectory()) {
        walk(abs, files);
      } else {
        files.push(abs);
      }
    }
  } else if (full) {
    for (const root of FULL_ROOTS) {
      files = walk(resolve(REPO_ROOT, root), files);
    }
  } else {
    for (const rel of SCOPE) {
      const abs = resolve(REPO_ROOT, rel);
      if (!existsSync(abs)) {
        console.warn(`warn: scope file missing (skipped): ${rel}`);
        continue;
      }
      files.push(abs);
    }
  }

  /** @type {{ file: string, line: number, rule: string, hint: string, excerpt: string, severity: "error" | "warn" }[]} */
  const all = [];
  let suppressed = 0;
  if (files.length === 0) {
    console.error(
      "error: no files scanned (empty scope or directory fully skipped)"
    );
    return 2;
  }
  for (const f of files) {
    const { suppressed: s, violations } = scanFile(f, allowlist);
    suppressed += s;
    all.push(...violations);
  }
  all.sort((a, b) =>
    a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line
  );

  const errors = all.filter((v) => v.severity !== "warn");
  const warnings = all.filter((v) => v.severity === "warn");

  if (errors.length > 0) {
    for (const v of errors) {
      console.log(
        `${v.file}:${v.line}: [${v.rule}] ${v.hint}\n    → ${v.excerpt}`
      );
    }
  }

  if (warnings.length > 0) {
    /** @type {Map<string, typeof warnings>} */
    const byRule = new Map();
    for (const w of warnings) {
      const bucket = byRule.get(w.rule);
      if (bucket) {
        bucket.push(w);
      } else {
        byRule.set(w.rule, [w]);
      }
    }
    console.log(
      `\n--- advisory: ${warnings.length} warning(s) — NOT blocking (tracked by ADR-0004 / docs/crm-ui-roadmap.md) ---`
    );
    const ordered = [...byRule.entries()].sort(
      (a, b) => b[1].length - a[1].length
    );
    for (const [rule, list] of ordered) {
      console.log(`  [${rule}] ${list.length} hit(s) — ${list[0].hint}`);
      for (const w of list.slice(0, 5)) {
        console.log(`    ${w.file}:${w.line}: ${w.excerpt}`);
      }
      if (list.length > 5) {
        console.log(`    … ${list.length - 5} more`);
      }
    }
  }

  console.log(
    `\ncrm-ui-guard: ${errors.length} error(s) in ${files.length} file(s)` +
      (warnings.length > 0
        ? ` · ${warnings.length} advisory warning(s)`
        : "") +
      (suppressed > 0 ? ` (${suppressed} suppressed by allowlist)` : "") +
      (errors.length > 0
        ? " — FAIL (no auto-fix; fix by hand per ADR-0002)"
        : " — PASS")
  );
  return errors.length > 0 ? 1 : 0;
}

process.exit(main(process.argv.slice(2)));
