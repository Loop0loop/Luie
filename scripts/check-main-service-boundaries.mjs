#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const PROJECT_ROOT = process.cwd();
const LEGACY_SERVICE_PATTERNS = [
  /services\/core\//,
  /services\/world\//,
  /services\/llm\//,
];
const ALLOWED_LEGACY_IMPORTERS = new Set([
  "src/main/domains/project/index.ts",
  "src/main/domains/manuscript/index.ts",
  "src/main/domains/world/index.ts",
  "src/main/domains/settings/llm.ts",
  "src/main/services/index.ts",
]);

const collectMainFiles = (root) =>
  execFileSync("rg", ["--files", "src/main"], {
    cwd: root,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean)
    .filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file));

export const analyzeMainServiceBoundarySource = (content, relativeFile) => {
  const normalizedFile = relativeFile.replaceAll("\\", "/");
  if (
    !normalizedFile.startsWith("src/main/") ||
    ALLOWED_LEGACY_IMPORTERS.has(normalizedFile)
  ) {
    return [];
  }

  return content
    .split(/\r?\n/)
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => line.includes("services/"))
    .filter(({ line }) =>
      LEGACY_SERVICE_PATTERNS.some((pattern) => pattern.test(line)),
    )
    .map(({ line, lineNumber }) => ({
      file: normalizedFile,
      line: lineNumber,
      source: line.trim(),
    }));
};

export const analyzeMainServiceBoundaries = (input = {}) => {
  const root = input.root ?? PROJECT_ROOT;
  const files = input.files ?? collectMainFiles(root);
  const findings = [];

  for (const file of files) {
    const absoluteFile = path.resolve(root, file);
    const content = fs.readFileSync(absoluteFile, "utf8");
    findings.push(...analyzeMainServiceBoundarySource(content, file));
  }

  return findings;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const findings = analyzeMainServiceBoundaries();
  if (findings.length > 0) {
    console.error("Legacy main service imports found:");
    for (const finding of findings) {
      console.error(`${finding.file}:${finding.line}: ${finding.source}`);
    }
    process.exit(1);
  }
}
