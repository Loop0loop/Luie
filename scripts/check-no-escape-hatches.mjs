#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, "src");

const DISALLOWED_PATTERNS = [
  { name: "@ts-ignore", regex: /@ts-ignore/ },
  { name: "@ts-expect-error", regex: /@ts-expect-error/ },
  { name: "eslint-disable", regex: /eslint-disable/ },
  { name: "as any", regex: /\bas any\b/ },
  { name: "as unknown as", regex: /as unknown as/ },
  { name: "unknown as any", regex: /unknown as any/ },
];

const CORE_TODO_TARGETS = new Set([
  path.join("src", "renderer", "src", "features", "manuscript", "components", "BinderSidebar.tsx"),
  path.join("src", "renderer", "src", "features", "editor", "components", "InspectorPanel.tsx"),
  path.join("src", "main", "services", "features", "syncService.ts"),
  path.join("src", "main", "services", "core", "projectService.ts"),
]);

const CORE_TODO_PATTERN = /\b(TODO|FIXME|HACK)\b/;

const shouldCheckFile = (relativePath) =>
  /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(relativePath) && !relativePath.endsWith(".d.ts");

const findings = [];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }
    const relativePath = path.relative(projectRoot, fullPath);
    if (!shouldCheckFile(relativePath)) continue;
    const content = await fs.readFile(fullPath, "utf8");
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      for (const pattern of DISALLOWED_PATTERNS) {
        if (pattern.regex.test(line)) {
          findings.push({
            file: relativePath,
            line: index + 1,
            type: pattern.name,
            text: line.trim(),
          });
        }
      }

      if (CORE_TODO_TARGETS.has(relativePath) && CORE_TODO_PATTERN.test(line)) {
        findings.push({
          file: relativePath,
          line: index + 1,
          type: "core-todo",
          text: line.trim(),
        });
      }
    });
  }
}

await walk(srcRoot);

if (findings.length > 0) {
  console.error("[check-no-escape-hatches] Disallowed patterns found:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} [${finding.type}] ${finding.text}`,
    );
  }
  process.exit(1);
}

console.log("[check-no-escape-hatches] OK");
