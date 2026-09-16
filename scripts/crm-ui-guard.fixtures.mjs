#!/usr/bin/env node
/**
 * crm-ui-guard fixture check — proves the fixture pair proves something.
 *
 * `crm-ui-guard.fixtures/dirty.tsx` used to be described as "every violation
 * class exactly once", and the only thing anyone verified was that it made the
 * guard exit 1. That is not coverage: INPUT_NUMBER silently stopped matching
 * for several phases and the fixture stayed green, because the other rules
 * still failed the file. This check asserts the SET of rule ids instead.
 *
 * Assertions:
 *   1. clean.tsx exits 0            (the guard does not over-match)
 *   2. dirty.tsx exits 1            (the guard does not under-match)
 *   3. every rule the guard declares appears in dirty.tsx's output
 *   4. dirty.tsx's output contains no rule id the guard does not declare
 *
 * Zero dependencies, same as the guard. Exit codes: 0 all good · 1 a failed
 * assertion · 2 usage/config error.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GUARD = resolve(HERE, "crm-ui-guard.mjs");
const CLEAN = resolve(HERE, "crm-ui-guard.fixtures", "clean.tsx");
const DIRTY = resolve(HERE, "crm-ui-guard.fixtures", "dirty.tsx");

/** @param {string} file @returns {{ status: number|null, out: string }} */
function runGuard(file) {
  const r = spawnSync(process.execPath, [GUARD, file], { encoding: "utf8" });
  return { out: `${r.stdout ?? ""}${r.stderr ?? ""}`, status: r.status };
}

/** Rule ids declared by the guard itself — never a hand-written list here. */
function declaredRules() {
  const src = readFileSync(GUARD, "utf8");
  return [...src.matchAll(/id: "([A-Z0-9_]+)"/g)].map((m) => m[1]);
}

/** Rule ids that appear in a report, whether error or advisory. */
function reportedRules(out) {
  return [...new Set([...out.matchAll(/\[([A-Z0-9_]+)\]/g)].map((m) => m[1]))];
}

const declared = declaredRules();
if (declared.length === 0) {
  console.error("error: could not read any rule id from crm-ui-guard.mjs");
  process.exit(2);
}

const failures = [];
const clean = runGuard(CLEAN);
if (clean.status !== 0) {
  failures.push(
    `clean.tsx exited ${clean.status}, expected 0 — the guard is over-matching:\n${clean.out}`
  );
}

const dirty = runGuard(DIRTY);
if (dirty.status !== 1) {
  failures.push(
    `dirty.tsx exited ${dirty.status}, expected 1 — the guard is under-matching:\n${dirty.out}`
  );
}

const seen = reportedRules(dirty.out);
const missing = declared.filter((id) => !seen.includes(id));
const unknown = seen.filter((id) => !declared.includes(id));
if (missing.length > 0) {
  failures.push(`dirty.tsx never triggers: ${missing.join(", ")}`);
}
if (unknown.length > 0) {
  failures.push(`dirty.tsx reports unknown rule id(s): ${unknown.join(", ")}`);
}

if (failures.length > 0) {
  console.error("crm-ui-guard fixtures: FAIL");
  for (const f of failures) {
    console.error(`  - ${f}`);
  }
  process.exit(1);
}

console.log(
  `crm-ui-guard fixtures: PASS — clean exits 0, dirty exits 1, ` +
    `all ${declared.length} rules fire, none unknown`
);
