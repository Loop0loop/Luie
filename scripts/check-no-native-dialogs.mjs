#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RENDERER_DIR = path.join(ROOT, "src", "renderer", "src");
const TARGET_EXTENSIONS = new Set([".ts", ".tsx"]);

const patterns = [
  {
    label: "window.*",
    regex: /\bwindow\.(?:alert|confirm|prompt)\s*\(/g,
  },
  {
    label: "global",
    regex: /(?<![.\w$])(?:alert|confirm|prompt)\s*\(/g,
  },
];

const walk = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const next = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walk(next);
      }
      if (TARGET_EXTENSIONS.has(path.extname(entry.name))) {
        return [next];
      }
      return [];
    }),
  );

  return files.flat();
};

const offsetToLineColumn = (text, offset) => {
  const before = text.slice(0, offset);
  const lines = before.split("\n");
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
};

const scanFile = async (filePath) => {
  const content = await fs.readFile(filePath, "utf8");
  const hits = [];

  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(content)) !== null) {
      const position = offsetToLineColumn(content, match.index);
      hits.push({
        filePath,
        line: position.line,
        column: position.column,
        snippet: match[0],
        source: pattern.label,
      });
    }
  }

  return hits;
};

const formatPath = (absolutePath) => path.relative(ROOT, absolutePath);

(async () => {
  const files = await walk(RENDERER_DIR);
  const allHits = (await Promise.all(files.map(scanFile))).flat();

  if (allHits.length === 0) {
    console.log("No native dialogs found in renderer code.");
    process.exit(0);
  }

  console.error("Native dialog usage is forbidden. Replace with DialogProvider APIs.");
  for (const hit of allHits) {
    console.error(
      `- ${formatPath(hit.filePath)}:${hit.line}:${hit.column} [${hit.source}] ${hit.snippet}`,
    );
  }
  process.exit(1);
})().catch((error) => {
  console.error("Failed to run native dialog guard:", error);
  process.exit(1);
});
