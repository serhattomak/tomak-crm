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
 * Severity: EVERY rule below is blocking. Rules without an explicit `severity`
 * field are errors (ADR-0004 §9.1); the `warn` layer still exists in the code and
 * is documented in ADR-0004 §9, but it is currently empty.
 *
 * Seven rules were born advisory so the migration could be tracked without a red
 * gate, and each was promoted to `error` once a `--full` sweep came back clean for
 * that rule (ADR-0004 §9.3, Faz 7, 2026-09-16):
 *   - arbitrary text size `text-[13px]` / `text-[9px]` / … → `text-2xs` (11px),
 *                                      `text-3xs` (10px) or the Tailwind scale
 *   - native `<table>`             → @workspace/ui Table primitives
 *   - inline `style={{ … }}`        → Tailwind classes + semantic tokens
 *   - hardcoded card surface        → `bg-card` / `border-border`
 *   - off-scale motion duration / non-token easing → §1.5 values and `ease-crm`
 *   - icon-only button with no accessible name → `aria-label`
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
 *   npm run guard:crm-ui            # the gate: full CRM sweep (see the note below)
 *   npm run guard:crm-ui:full       # identical — kept because ADR-0004/CI name it
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
 * CRM scope. Store (`apps/ecommerce`) is deliberately absent — it does not
 * exist in this repo, and `apps/api` is .NET, not styled here.
 *
 * This used to be split in two: an 18-file `SCOPE` list was the CI gate while
 * `--full` was only a tracker. ADR-0004 §9 retired that list once a full sweep
 * came back clean, so as of Faz 7 the guard has **one scope and one gate**.
 * There is no narrower mode left for a regression to hide in.
 * @type {string[]}
 */
const FULL_ROOTS = ["apps/web", "packages/ui"];
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".turbo",
  "dist",
  "build",
  "coverage",
  "crm-ui-guard.fixtures",
  // Playwright output. Ignored by git, but the guard walks the tree, and a
  // generated artifact must never be able to fail the gate.
  "test-results",
  "playwright-report",
  "blob-report",
  ".playwright",
]);

/**
 * @typedef {object} Rule
 * @property {string} id
 * @property {string} hint
 * @property {"error" | "warn"} [severity]
 * @property {RegExp} [pattern] used when the rule is a plain text match
 * @property {{ name: string, test: (open: string, body: string) => boolean }} [tag]
 *   used instead of `pattern` for anything that has to look *inside* an
 *   element's attributes. `pattern`-based tag rules must never reach an
 *   attribute with `[^>]*`: see `scanTags`.
 * @property {{ find: (scope: string, literal: string) => { offset: number, token: string } | null }} [className]
 *   used instead of `pattern` for rules about utility classes. `scope` is the union
 *   of the literals that can COEXIST with `literal`: a counterpart in a neighbouring
 *   `cn()` argument counts, a counterpart in the other branch of a conditional does
 *   not. See `classExpressions`.
 *
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
    hint: '<input type="number"> — use NumberInput from packages/ui (para: precision=2 + suffix set to the field\'s own currency, not a hardcoded ₺; adet: precision=0 + showStepper)',
    id: "INPUT_NUMBER",
    tag: {
      name: "input",
      test: (open) =>
        /\btype\s*=\s*(?:"number"|'number'|\{\s*["']number["']\s*\})/.test(
          open
        ),
    },
  },
  {
    hint: '<input type="date"> — use DatePicker (clearable, YYYY-MM-DD, TR locale) or DateRangePicker from packages/ui',
    id: "INPUT_DATE",
    tag: {
      name: "input",
      test: (open) =>
        /\btype\s*=\s*(?:"date"|'date'|\{\s*["']date["']\s*\})/.test(open),
    },
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
    tag: {
      name: "svg|path|circle|rect|line|polyline|polygon",
      test: (open) =>
        /\b(?:fill|stroke)\s*=\s*["']#[0-9a-fA-F]{3,8}["']/.test(open),
    },
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
  },
  {
    hint: "native <table> — use @workspace/ui Table primitives (TableHeader, TableRow, TableCell, …)",
    id: "NATIVE_TABLE",
    pattern: /<table(?=[\s>])/g,
  },
  {
    hint: "icon-only button with no accessible name — add aria-label (or visible text). A button whose only child is an icon is announced as nothing, and it is the most common a11y gap in this codebase",
    id: "A11Y_ICON_BUTTON",
    tag: {
      name: "button",
      test: (open, body) =>
        !/\baria-label=|\baria-labelledby=|\btitle=/.test(open) &&
        /^\s*<[A-Z][A-Za-z0-9]*\b[^>]*\/>\s*$/.test(body),
    },
  },
  {
    hint: "off-scale motion duration — use duration-150 (hover/press/colour), 200 (overlay default) or 250 (wide surfaces) per 1.5",
    id: "MOTION_DURATION",
    pattern:
      /(?<![A-Za-z-])duration-(?:(?!150(?![0-9])|200(?![0-9])|250(?![0-9]))[0-9]+|\[[^\]]+\])/g,
  },
  {
    hint: "non-token easing — use ease-crm (swift-out, overlays) or ease-crm-in-out (symmetric size/position) per 1.5",
    id: "MOTION_EASE",
    pattern: /(?<![A-Za-z-])ease-(?!crm\b)[a-z-]+/g,
  },
  {
    hint: "static inline style object — use Tailwind classes + semantic tokens. Only STATIC-shaped blocks are flagged: values are plain quoted literals with no template interpolation, member access or fallback. style={{}} remains correct for unmeasurable dynamic values (1.4), so a percentage, a transform or a DB-driven colourHex is not a violation",
    id: "INLINE_STYLE_PROP",
    pattern:
      /style=\{\{(?=[^{}]*?:\s*["'][^"'$]*["'])(?![^{}]*\$\{)(?![^{}]*[.?|])/g,
  },
  {
    hint: "light surface with no dark: counterpart in the same branch of the class expression — in dark mode it keeps its light value. Use the token instead: bg-muted (light ~zinc-100, dark ~zinc-800) for surfaces, or bg-border for 1px rules. Gradient stops count too: the rule never saw `from-<c>-50` because it is not a `bg-` class, and the runtime audit cannot read a gradient out of `backgroundColor` — so four cards kept a white gradient in dark mode with both instruments reporting clean. A white ring on a coloured surface and a translucent white art divider are NOT flagged — white is correct there",
    id: "LIGHT_SURFACE_NO_DARK",
    severity: "warn",
    className: {
      find: (scope, literal) => {
        const re = new RegExp(
          "(?<![A-Za-z:\\-])(" +
            "bg-(?:white|zinc-(?:50|100|200))" +
            "|border-zinc-(?:100|200|300)" +
            "|bg-(?:blue|emerald|amber|red|rose|indigo|purple|sky|teal|cyan|violet|orange|yellow|lime|green|pink|fuchsia)-(?:50|100|200)" +
            "|border-(?:blue|emerald|amber|red|rose|indigo|purple|sky|teal|cyan|violet|orange|yellow|lime|green|pink|fuchsia)-(?:100|200|300)" +
            "|(?:from|via|to)-(?:blue|emerald|amber|red|rose|indigo|purple|sky|teal|cyan|violet|orange|yellow|lime|green|pink|fuchsia)-(?:50|100|200)" +
            ")(?![A-Za-z0-9\\-\\/])",
          "g"
        );
        // EVERY match is examined, not just the first.
        //
        // This used to take `re.exec(literal)` and bail if THAT property had a
        // dark: partner anywhere in the expression. So a class expression like
        //   `border border-emerald-200 dark:border-emerald-800 bg-emerald-50 ...`
        // reported nothing: the first match was the correctly-paired border, its
        // `dark:border-` was found, and the unpaired `bg-emerald-50` was never
        // looked at. The runtime audit measured that exact badge at 1.44:1 while
        // this rule sat at zero — a rule narrower than its standard, reporting
        // success.
        //
        // `matchAll` runs on a freshly-built regex, so nothing depends on a
        // previous `lastIndex`.
        //
        // Returning the first UNPAIRED match keeps the one-finding-per-expression
        // contract and removes the masking.
        //
        // The partner is searched in `scope`, not in the whole expression: the
        // branches of a conditional are alternatives, so a partner sitting in the
        // other branch does not cover this one. See `classExpressions`.
        for (const m of literal.matchAll(re)) {
          const prop = m[1].split("-")[0];
          if (new RegExp(`dark:(?:[a-z-]+:)*${prop}-`).test(scope)) {
            continue;
          }
          return { offset: m.index, token: m[1] };
        }
        return null;
      },
    },
  },
  {
    hint: "hardcoded card surface — use bg-card / border-border. The dark: partner must go with it: it sets the same property in the same variant, so the legacy class wins in the compiled CSS and the token never applies (Faz 5.0). Translucent bg-white/90 with backdrop-blur is NOT flagged — that frosted surface is deliberate",
    id: "CARD_SURFACE",
    pattern:
      /(?<![A-Za-z:/-])(?:bg-white(?![\/A-Za-z0-9-])(?=[^"'\n]*dark:bg-zinc-(?:800|900|950))|border-zinc-(?:100|200|300)(?:\/\d+)?(?=[^"'\n]*dark:border-zinc-(?:700|800|900)))/g,
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
 * Locate `<name …>` elements without relying on `[^>]`.
 *
 * `[^>]*` silently fails whenever an attribute contains a `>` — and an arrow
 * function (`onClick={() => router.push(x)}`) or a comparison
 * (`disabled={page >= n}`) is enough to provide one. Measured on 2026-09-16:
 * patterns built on `[^>]` reported 0 while 31 unnamed icon-only buttons and
 * 8 native `<input type="number|date">` were sitting in apps/web, and the
 * fixture's "every violation class exactly once" claim was never checked
 * per-rule, so nothing noticed.
 *
 * This walks the tag counting brace depth and skipping string literals, so a
 * `>` inside `{…}` or `"…"` cannot end the tag early.
 *
 * @param {string} content
 * @param {string} name element name, or a `|`-alternation of names
 *   (e.g. `"svg|path|circle"`) — it is used inside a non-capturing group.
 * @returns {{ index: number, open: string, body: string }[]} `open` is the
 *   opening tag, `body` the inner content (`""` when self-closing or
 *   unterminated).
 */
function scanTags(content, name) {
  /** @type {{ index: number, open: string, body: string }[]} */
  const out = [];
  const re = new RegExp(`<(?:${name})\\b`, "g");
  const closeRe = new RegExp(`</(?:${name})>`);
  /** @type {RegExpExecArray | null} */
  let m;
  while ((m = re.exec(content)) !== null) {
    let i = m.index + m[0].length;
    let depth = 0;
    let selfClosing = false;
    while (i < content.length) {
      const c = content[i];
      if (c === "{") {
        depth++;
      } else if (c === "}") {
        depth--;
      } else if (c === ">" && depth === 0) {
        selfClosing = content[i - 1] === "/";
        break;
      } else if (c === '"' || c === "'" || c === "`") {
        const q = c;
        i++;
        while (i < content.length && content[i] !== q) {
          if (content[i] === "\\") {
            i++;
          }
          i++;
        }
      }
      i++;
    }
    const openEnd = Math.min(i + 1, content.length);
    let body = "";
    if (!selfClosing) {
      const close = closeRe.exec(content.slice(openEnd));
      body = close ? content.slice(openEnd, openEnd + close.index) : "";
    }
    out.push({ body, index: m.index, open: content.slice(m.index, openEnd) });
  }
  return out;
}

/**
 * Branch-aware class-expression parsing.
 *
 * A class expression is not one class set. `className={cond ? "a" : "b"}` and
 * `` className={`base ${cond ? "a" : "b"}`} `` each render ONE of two sets, never
 * both. Reading them as a single union lets a `dark:` partner in one branch cover a
 * light surface that lives alone in the other.
 *
 * Measured on the shipped tree, 2026-09-16: `organization/page.tsx:1243` carries
 * `bg-emerald-50` with no `dark:bg-` in its branch, the sibling branch supplies
 * `dark:bg-zinc-800`, and this rule read zero while the badge paints near-white in
 * dark mode. The runtime audit could not see it either — the audited data had no
 * employee in that state, so the badge never rendered. Two blind instruments, one
 * invisible defect.
 *
 * So every string literal gets a `path` (which branch, at which level) and a
 * `scope`: the union of exactly those literals that can coexist with it. A literal
 * inside a branch loses its siblings; a literal outside every conditional keeps the
 * whole expression.
 *
 * With no conditional present, every path is `[]`, every literal coexists, and
 * `scope` collapses to the union — which IS the previous behaviour, deliberately.
 * 12,145 of the 12,540 expressions in CRM scope contain no alternative, and all
 * 12,145 were verified to produce byte-identical verdicts; only the 395 that do can
 * move. `cn("bg-white", "dark:bg-zinc-900")` still counts as one surface, because
 * `cn` arguments are a union rather than alternatives — the property behind the
 * "4245 candidates / real 30" note, and it is fixture-guarded.
 */

/** Skip a quoted string starting at `i`; returns the index just past its close. */
function skipQuotedString(src, i, to) {
  const quote = src[i];
  let j = i + 1;
  while (j < to && src[j] !== quote) {
    if (src[j] === "\\") j++;
    j++;
  }
  return Math.min(j + 1, to);
}

/**
 * Skip a whole template literal starting at `i`; returns the index just past its
 * close. `${…}` is skipped via its matching brace, so a `}` inside an interpolation
 * cannot end the template early.
 */
function skipTemplateLiteral(src, i, to) {
  let j = i + 1;
  while (j < to) {
    const c = src[j];
    if (c === "\\") {
      j += 2;
      continue;
    }
    if (c === "`") return j + 1;
    if (c === "$" && src[j + 1] === "{") {
      j = matchingDelimiter(src, j + 1, to) + 1;
      continue;
    }
    j++;
  }
  return to;
}

/** `src[i]` is `(`/`[`/`{`; returns the index of its match, else `to - 1`. */
function matchingDelimiter(src, i, to) {
  const open = src[i];
  const close = open === "(" ? ")" : open === "[" ? "]" : "}";
  let depth = 0;
  let j = i;
  while (j < to) {
    const c = src[j];
    if (c === '"' || c === "'") {
      j = skipQuotedString(src, j, to);
      continue;
    }
    if (c === "`") {
      j = skipTemplateLiteral(src, j, to);
      continue;
    }
    if (c === "/" && src[j + 1] === "/") {
      while (j < to && src[j] !== "\n") j++;
      continue;
    }
    if (c === "/" && src[j + 1] === "*") {
      j += 2;
      while (j < to && !(src[j] === "*" && src[j + 1] === "/")) j++;
      j += 2;
      continue;
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return j;
    }
    j++;
  }
  return to - 1;
}

/**
 * The string literals of a template, split around its `${…}` interpolations.
 *
 * A template used to arrive as ONE literal whose text contained the interpolation
 * source — quotes, `?`, `:` and all. The branches were therefore inseparable, which
 * is the bug this whole module exists to close.
 */
function tokenizeTemplate(src, i, to, tokens) {
  let j = i + 1;
  let chunk = j;
  while (j < to) {
    const c = src[j];
    if (c === "\\") {
      j += 2;
      continue;
    }
    if (c === "`") {
      tokens.push({
        contentFrom: chunk,
        contentTo: j,
        from: chunk,
        kind: "str",
        template: true,
        to: j,
      });
      return j + 1;
    }
    if (c === "$" && src[j + 1] === "{") {
      tokens.push({
        contentFrom: chunk,
        contentTo: j,
        from: chunk,
        kind: "str",
        template: true,
        to: j,
      });
      const close = matchingDelimiter(src, j + 1, to);
      tokens.push({
        from: j + 1,
        innerFrom: j + 2,
        innerTo: close,
        kind: "group",
        open: "{",
        to: close + 1,
      });
      j = close + 1;
      chunk = j;
      continue;
    }
    j++;
  }
  tokens.push({
    contentFrom: chunk,
    contentTo: to,
    from: chunk,
    kind: "str",
    template: true,
    to,
  });
  return to;
}

/**
 * Tokenize a class expression. Tokens tile the range in order:
 *   `str`   a string literal's CONTENT (quotes excluded)
 *   `group` a nested `(…)`/`[…]`/`{…}`, or a template's `${…}`
 *   `code`  everything else — identifiers, operators, whitespace
 *
 * Tiling is the safety property: a tokenizer that drops or reorders characters
 * cannot lose a class name silently.
 *
 * @returns {{ kind: "str"|"code"|"group", from: number, to: number, contentFrom?: number, contentTo?: number, innerFrom?: number, innerTo?: number }[]}
 */
function tokenizeClassExpression(src, from, to) {
  const tokens = [];
  let i = from;
  while (i < to) {
    const c = src[i];
    if (c === '"' || c === "'") {
      const end = skipQuotedString(src, i, to);
      tokens.push({
        contentFrom: i + 1,
        contentTo: Math.min(end - 1, to),
        from: i,
        kind: "str",
        to: end,
      });
      i = end;
    } else if (c === "`") {
      i = tokenizeTemplate(src, i, to, tokens);
    } else if (c === "(" || c === "[" || c === "{") {
      const close = matchingDelimiter(src, i, to);
      tokens.push({
        from: i,
        innerFrom: i + 1,
        innerTo: close,
        kind: "group",
        open: c,
        to: close + 1,
      });
      i = close + 1;
    } else if (c === ")" || c === "]" || c === "}") {
      tokens.push({ from: i, kind: "code", to: i + 1 });
      i++;
    } else {
      let j = i;
      while (j < to && !"\"'`([{)]}".includes(src[j])) j++;
      tokens.push({ from: i, kind: "code", to: j });
      i = j;
    }
  }
  return tokens;
}

/**
 * Locate the FIRST conditional at this nesting level.
 *
 * Only `code` tokens are inspected: a `?` inside a string or a nested group is not
 * at this level, and `?.` / `??` are not conditionals. The match is the first `:`
 * that balances the `?`, which is correct for both `a ? b : c` and the
 * right-associative `a ? b : c ? d : e`.
 *
 * @returns {{ questionTok: number, questionChar: number, colonTok: number, colonChar: number } | null}
 */
function findConditionalAt(src, tokens) {
  const isQuestion = (j) =>
    src[j] === "?" && src[j + 1] !== "." && src[j + 1] !== "?";
  for (let t = 0; t < tokens.length; t++) {
    const tok = tokens[t];
    if (tok.kind !== "code") continue;
    for (let k = tok.from; k < tok.to; k++) {
      if (!isQuestion(k)) continue;
      let depth = 1;
      for (let u = t; u < tokens.length; u++) {
        const inner = tokens[u];
        if (inner.kind !== "code") continue;
        for (let m = u === t ? k + 1 : inner.from; m < inner.to; m++) {
          if (isQuestion(m)) depth++;
          else if (src[m] === "?") continue;
          else if (src[m] === ":") {
            depth--;
            if (depth === 0) {
              return {
                colonChar: m,
                colonTok: u,
                questionChar: k,
                questionTok: t,
              };
            }
          } else if (src[m] === "," && depth === 1) {
            return null;
          }
        }
      }
      return null;
    }
  }
  return null;
}

/**
 * Cut a token list at the first top-level comma in a `code` token, so the tail of
 * `cn(cond ? "a" : "b", "shared")` is not swallowed by the false branch.
 * @returns {[object[], object[]]} `[before, after]`; `after` is empty when no comma.
 */
function cutTokensAtComma(src, tokens) {
  for (let t = 0; t < tokens.length; t++) {
    const tok = tokens[t];
    if (tok.kind !== "code") continue;
    for (let k = tok.from; k < tok.to; k++) {
      if (src[k] !== ",") continue;
      const head = { from: tok.from, kind: "code", to: k };
      const tail = { from: k + 1, kind: "code", to: tok.to };
      return [
        [...tokens.slice(0, t), head].filter((x) => x.to > x.from),
        [tail, ...tokens.slice(t + 1)].filter((x) => x.to > x.from),
      ];
    }
  }
  return [tokens, []];
}

/**
 * Assign every string literal a `path`: the branch it sits in at each conditional
 * level. Shared text keeps the path it had; each branch extends it.
 *
 * The `?` and the `:` are dropped at every split. Leaving them in let the split
 * re-find its own operator inside a branch and recurse until the stack blew —
 * `RangeError` at a frame three calls away from the mistake.
 *
 * The `depth` cap falls back to "no conditional here" rather than hanging or
 * dropping literals: a pathological expression under-reports, it never invents or
 * loses a finding.
 */
function assignExpressionPaths(src, tokens, path, literals, depth = 0) {
  const cond = depth > 60 ? null : findConditionalAt(src, tokens);
  if (!cond) {
    for (const tok of tokens) {
      if (tok.kind === "str") {
        const text = src.slice(tok.contentFrom, tok.contentTo);
        if (text.length > 0)
          literals.push({ base: tok.contentFrom, path, text });
      } else if (tok.kind === "group") {
        assignExpressionPaths(
          src,
          tokenizeClassExpression(src, tok.innerFrom, tok.innerTo),
          path,
          literals,
          depth + 1
        );
      }
    }
    return;
  }

  const qTok = tokens[cond.questionTok];
  const cTok = tokens[cond.colonTok];
  const sameToken = cond.questionTok === cond.colonTok;
  const code = (from, to) => (to > from ? { from, kind: "code", to } : null);

  const before = tokens.slice(0, cond.questionTok);
  const beforeTail = code(qTok.from, cond.questionChar);
  if (beforeTail) before.push(beforeTail);

  const yes = [];
  const yesHead = code(
    cond.questionChar + 1,
    sameToken ? cond.colonChar : qTok.to
  );
  if (yesHead) yes.push(yesHead);
  if (!sameToken)
    yes.push(...tokens.slice(cond.questionTok + 1, cond.colonTok));
  const yesTail = sameToken ? null : code(cTok.from, cond.colonChar);
  if (yesTail) yes.push(yesTail);

  const no = [];
  const noHead = code(cond.colonChar + 1, cTok.to);
  if (noHead) no.push(noHead);
  no.push(...tokens.slice(cond.colonTok + 1));

  const [falseBranch, after] = cutTokensAtComma(src, no);

  assignExpressionPaths(src, before, path, literals, depth + 1);
  assignExpressionPaths(src, yes, [...path, 0], literals, depth + 1);
  assignExpressionPaths(src, falseBranch, [...path, 1], literals, depth + 1);
  if (after.length > 0) {
    assignExpressionPaths(src, after, path, literals, depth + 1);
  }
}

/**
 * The union of every literal that can coexist with `literal`.
 *
 * Two literals coexist when they never sit in different branches of the same
 * conditional. `-1` means "no branch at this level" at a shorter path, so a literal
 * outside every conditional coexists with all of them and keeps the whole
 * expression — that is what makes an alternative-free expression behave exactly as
 * it did before.
 */
function sharedScope(literal, literals) {
  return literals
    .filter((other) => {
      const levels = Math.max(literal.path.length, other.path.length);
      for (let k = 0; k < levels; k++) {
        const a = literal.path[k] ?? -1;
        const b = other.path[k] ?? -1;
        if (a !== -1 && b !== -1 && a !== b) return false;
      }
      return true;
    })
    .map((other) => other.text)
    .join(" ");
}

/**
 * Every `className` expression in a file, as `{ index, literals }`, where each
 * literal carries its absolute `base`, its `text`, its `path` and its `scope`.
 *
 * Tailwind resolves a class *expression*, not one string at a time — so
 * `cn("bg-white", "dark:bg-zinc-900")` is one themed surface, not a missing
 * partner. Checking literal by literal reported 4245 candidates where the truth
 * was 30; the expression is the unit, and `scope` is where that is enforced while
 * still telling one branch of a conditional from another.
 *
 * @param {string} src
 * @returns {{ index: number, literals: { base: number, path: number[], scope: string, text: string }[] }[]}
 */
function classExpressions(src) {
  const groups = [];
  const re = /className\s*=\s*/g;
  /** @type {RegExpExecArray | null} */
  let m;
  while ((m = re.exec(src)) !== null) {
    let i = m.index + m[0].length;
    /** @type {{ base: number, path: number[], scope: string, text: string }[]} */
    const literals = [];
    if (src[i] === '"' || src[i] === "'" || src[i] === "`") {
      const q = src[i];
      const start = ++i;
      while (i < src.length && src[i] !== q) {
        if (src[i] === "\\") i++;
        i++;
      }
      const text = src.slice(start, i);
      if (text.length > 0)
        literals.push({ base: start, path: [], scope: text, text });
    } else if (src[i] === "{") {
      const open = i;
      let depth = 0;
      while (i < src.length) {
        const c = src[i];
        if (c === "{") depth++;
        else if (c === "}") {
          depth--;
          if (depth === 0) break;
        } else if (c === '"' || c === "'") {
          i = skipQuotedString(src, i, src.length);
          continue;
        } else if (c === "`") {
          i = skipTemplateLiteral(src, i, src.length);
          continue;
        }
        i++;
      }
      assignExpressionPaths(
        src,
        tokenizeClassExpression(src, open + 1, i),
        [],
        literals
      );
      for (const literal of literals) {
        literal.scope = sharedScope(literal, literals);
      }
    } else {
      continue;
    }
    groups.push({ index: m.index, literals });
  }
  return groups;
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
    /** @type {number[]} */
    const hitIndexes = [];
    if (rule.tag) {
      for (const el of scanTags(content, rule.tag.name)) {
        if (rule.tag.test(el.open, el.body)) {
          hitIndexes.push(el.index);
        }
      }
    } else if (rule.className) {
      for (const group of classExpressions(content)) {
        for (const literal of group.literals) {
          const hit = rule.className.find(literal.scope, literal.text);
          if (hit) {
            hitIndexes.push(literal.base + hit.offset);
          }
        }
      }
    } else if (rule.pattern) {
      rule.pattern.lastIndex = 0;
      /** @type {RegExpExecArray | null} */
      let m;
      while ((m = rule.pattern.exec(content)) !== null) {
        if (m[0].length === 0) {
          rule.pattern.lastIndex++;
          continue;
        }
        hitIndexes.push(m.index);
        // Guard against zero-width loops on `s`-flag patterns.
        if (rule.pattern.lastIndex === m.index) {
          rule.pattern.lastIndex++;
        }
      }
    }
    for (const index of hitIndexes) {
      if (allowed(rel, rule.id, allowlist)) {
        suppressed++;
        continue;
      }
      const line = lineOf(index, content);
      violations.push({
        excerpt: (lines[line - 1] ?? "").trim().slice(0, 160),
        file: rel,
        hint: rule.hint,
        line,
        rule: rule.id,
        severity: rule.severity ?? "error",
      });
    }
  }
  return { suppressed, violations };
}

function printHelp() {
  console.log(`crm-ui-guard — forbid native inputs + off-palette colors in CRM scope

usage:
  node scripts/crm-ui-guard.mjs [options] [path...]

options:
  --full                  accepted, and now identical to the default (see note)
  --allowlist <file>      allowlist JSON (default: ${DEFAULT_ALLOWLIST})
  --help                  this text

  no path                 scan all of apps/web + packages/ui (Store excluded by design).

severity:
  error (default)   blocking — affects the exit code
  warn              advisory — printed but never fails the run; a warn rule is
                    promoted to error only once a --full sweep is clean for it.

note:
  There is one scope and one gate. The 18-file SCOPE list that used to be the CI
  gate was retired in Faz 7, once a full sweep reached 0 errors and 0 warnings
  (ADR-0004 §9), so "guard:crm-ui" and "guard:crm-ui:full" run the same scan.

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
  } else {
    // No positionals → all of CRM scope. `--full` is still accepted and means
    // exactly this; it survives because ADR-0004, the roadmap and CI all spell
    // it out, but it is no longer a distinct mode.
    for (const root of FULL_ROOTS) {
      files = walk(resolve(REPO_ROOT, root), files);
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
      (warnings.length > 0 ? ` · ${warnings.length} advisory warning(s)` : "") +
      (suppressed > 0 ? ` (${suppressed} suppressed by allowlist)` : "") +
      (errors.length > 0
        ? " — FAIL (no auto-fix; fix by hand per ADR-0002)"
        : " — PASS")
  );
  return errors.length > 0 ? 1 : 0;
}

process.exit(main(process.argv.slice(2)));
