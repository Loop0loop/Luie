#!/usr/bin/env node
// Phase 1 — token-vocabulary unification codemod (D1: keep Luie vocab).
// Rewrites shadcn long-form utility classes to their Luie short-form
// equivalents. Every mapping resolves to the SAME CSS variable via the
// @theme bridge in global.tokens.css, so this is a zero-visual-change rename.
//
// Excluded: components/ui/* (shadcn primitive layer) and the surface/card/
// popover tokens (which have a @theme vs tailwind.config double-definition).
//
// Run: node scripts/design/unify-token-vocab.mjs           (apply)
//      node scripts/design/unify-token-vocab.mjs --dry      (preview only)
import fs from "node:fs";
import path from "node:path";

const DRY = process.argv.includes("--dry");
const ROOT = path.resolve("src/renderer/src");
const EXCLUDE = [path.join(ROOT, "components/ui")];

// Utility prefixes that carry a color token (variants like hover:/dark:/group-hover:
// sit before these and are preserved automatically; opacity suffixes like /50 too).
const PREFIX = "(?:bg|text|border|ring|fill|stroke|divide|placeholder|caret|outline|decoration|from|to|via)";

// [oldToken, newToken] — order matters (longest/compound first).
const MAP = [
  ["muted-foreground", "muted"],
  ["accent-foreground", "accent-fg"],
  ["foreground", "fg"],
  ["background", "app"],
  // destructive -> danger, but never destructive-foreground
  ["destructive(?!-foreground)", "danger"],
];

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (EXCLUDE.some((x) => p.startsWith(x))) continue;
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (/\.(tsx?)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
let changedFiles = 0;
let totalReplacements = 0;
for (const f of files) {
  let s = fs.readFileSync(f, "utf8");
  const before = s;
  let fileCount = 0;
  for (const [oldTok, newTok] of MAP) {
    const re = new RegExp(`(${PREFIX}-)${oldTok}\\b`, "g");
    s = s.replace(re, (_m, p1) => {
      fileCount++;
      return p1 + newTok;
    });
  }
  if (s !== before) {
    changedFiles++;
    totalReplacements += fileCount;
    if (!DRY) fs.writeFileSync(f, s);
    console.log(`${fileCount.toString().padStart(3)}  ${f.replace(ROOT + "/", "")}`);
  }
}
console.log(
  `\n${DRY ? "[dry] " : ""}${totalReplacements} replacements in ${changedFiles} files`,
);
