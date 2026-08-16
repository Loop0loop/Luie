#!/usr/bin/env node
// NOTE: 같은 CSS variable을 가리키는 shadcn utility를 Luie vocabulary로만 치환한다.
// WARNING: double definition이 있는 surface/card/popover token과 shadcn primitive는 제외한다.
import fs from "node:fs";
import path from "node:path";

const DRY = process.argv.includes("--dry");
const ROOT = path.resolve("src/renderer/src");
const EXCLUDE = [path.join(ROOT, "components/ui")];

// NOTE: variant prefix와 opacity suffix를 보존하도록 color utility prefix만 식별한다.
const PREFIX = "(?:bg|text|border|ring|fill|stroke|divide|placeholder|caret|outline|decoration|from|to|via)";

// WARNING: compound token이 먼저 match되도록 긴 mapping을 앞에 둬야 한다.
const MAP = [
  ["muted-foreground", "muted"],
  ["accent-foreground", "accent-fg"],
  ["foreground", "fg"],
  ["background", "app"],
  // NOTE: destructive-foreground는 별도 token이므로 destructive만 danger로 바꾼다.
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
