#!/usr/bin/env node
// Phase 0 — design-token violation guard.
// Counts token-system violations across renderer code and fails if any
// metric EXCEEDS its baseline. Baselines only ratchet down (edit below as
// phases land). Run: node scripts/design/tokens-guard.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src/renderer/src");
const EXCLUDE = [path.join(ROOT, "components/ui")]; // shadcn primitive layer

// Baselines captured on feat/design @ c3413545 (pre-Phase-1).
// Lower these as phases reduce the numbers; CI fails if actual > baseline.
const BASELINE = {
  rawHex: 332,
  rawColor: 201,
  arbitraryPx: 403,
  roundedBig: 175,
  shadowBig: 41,
  shadcnVocab: 0, // Phase 1: shadcn long-form vocab fully removed (banned going forward)
};

const PATTERNS = {
  rawHex: /#[0-9a-fA-F]{3,6}\b/g,
  rawColor:
    /\b(?:bg|text|border)-(?:blue|red|green|purple|yellow|indigo|pink|slate|gray|zinc|neutral|stone|emerald|sky|violet|amber|rose|orange|teal|cyan|lime)-[0-9]{2,3}\b/g,
  arbitraryPx: /\[[0-9]+px\]/g,
  roundedBig: /\brounded-(?:xl|2xl|3xl|4xl|full)\b/g,
  shadowBig: /\bshadow-(?:lg|xl|2xl)\b/g,
  shadcnVocab:
    /(?:bg|text|border|ring|fill|stroke|divide|placeholder|caret|outline|decoration|from|to|via)-(?:foreground|background|muted-foreground|accent-foreground|destructive(?!-foreground))\b/g,
};

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (EXCLUDE.some((x) => p.startsWith(x))) continue;
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (/\.(tsx?|css)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
const totals = Object.fromEntries(Object.keys(PATTERNS).map((k) => [k, 0]));
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  for (const k in PATTERNS) {
    const m = s.match(PATTERNS[k]);
    if (m) totals[k] += m.length;
  }
}

let failed = false;
console.log(`design tokens guard — ${files.length} files scanned\n`);
for (const k of Object.keys(PATTERNS)) {
  const actual = totals[k];
  const base = BASELINE[k];
  const ok = actual <= base;
  if (!ok) failed = true;
  console.log(
    `${ok ? "✓" : "✗"} ${k.padEnd(12)} ${String(actual).padStart(4)} / baseline ${base}${ok ? "" : "  ⬆ REGRESSION"}`,
  );
}
process.exit(failed ? 1 : 0);
