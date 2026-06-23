#!/usr/bin/env node

import fs from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const PROJECT_ROOT = process.cwd();
const RENDERER_ROOT = path.join(PROJECT_ROOT, "src/renderer/src");
const ALLOWLIST_PATH = path.join(
  PROJECT_ROOT,
  "docs/quality/renderer-store-usage-allowlist.json",
);
const SOURCE_FILE_PATTERN = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const STORE_HOOK_PATTERN = /^use[A-Z][A-Za-z0-9]*Store$/;

const isForbiddenImport = (specifier) =>
  specifier === "electron" ||
  specifier.startsWith("node:") ||
  specifier === "fs" ||
  specifier.startsWith("fs/") ||
  specifier === "path" ||
  specifier.startsWith("path/");

const collectFiles = (dir, output = []) => {
  if (!fs.existsSync(dir)) return output;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name === "out"
      ) {
        continue;
      }
      collectFiles(fullPath, output);
      continue;
    }
    if (SOURCE_FILE_PATTERN.test(entry.name)) {
      output.push(fullPath);
    }
  }
  return output;
};

const getLineNumber = (sourceFile, position) =>
  sourceFile.getLineAndCharacterOfPosition(position).line + 1;

const getLineText = (content, line) =>
  content.split(/\r?\n/)[line - 1]?.trim() ?? "";

const buildFinding = ({
  type,
  message,
  relativeFile,
  sourceFile,
  content,
  node,
}) => {
  const line = getLineNumber(sourceFile, node.getStart(sourceFile));
  return {
    type,
    severity: "error",
    message,
    file: relativeFile,
    line,
    text: getLineText(content, line),
  };
};

const walk = (node, visitor) => {
  visitor(node);
  ts.forEachChild(node, (child) => walk(child, visitor));
};

export const analyzeRendererStoreUsageSource = (content, relativeFile) => {
  const sourceFile = ts.createSourceFile(
    relativeFile,
    content,
    ts.ScriptTarget.Latest,
    true,
    relativeFile.endsWith(".tsx") || relativeFile.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  );
  const findings = [];

  walk(sourceFile, (node) => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      isForbiddenImport(node.moduleSpecifier.text)
    ) {
      findings.push(
        buildFinding({
          type: "forbidden-renderer-import",
          message:
            "Renderer code must not import Electron or Node privileged modules directly.",
          relativeFile,
          sourceFile,
          content,
          node,
        }),
      );
      return;
    }

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      STORE_HOOK_PATTERN.test(node.expression.text) &&
      node.arguments.length === 0
    ) {
      findings.push(
        buildFinding({
          type: "selectorless-store-hook",
          message:
            "Renderer store hooks must select a slice instead of subscribing to the whole store.",
          relativeFile,
          sourceFile,
          content,
          node,
        }),
      );
    }
  });

  return findings;
};

const readAllowlist = async () => {
  if (!fs.existsSync(ALLOWLIST_PATH)) {
    return { exceptions: [] };
  }
  const raw = await readFile(ALLOWLIST_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed?.exceptions)) {
    return { exceptions: [] };
  }
  return parsed;
};

const isExceptionExpired = (entry, now) => {
  if (!entry?.expiresAt) return false;
  const expiresAt = new Date(entry.expiresAt).getTime();
  return !Number.isNaN(expiresAt) && expiresAt < now.getTime();
};

const matchesException = (finding, entry) => {
  if (entry.type !== finding.type) return false;
  if (entry.file && entry.file !== finding.file) return false;
  if (!entry.pattern) return true;

  try {
    return new RegExp(entry.pattern).test(finding.text);
  } catch {
    return false;
  }
};

export const applyRendererStoreUsageExceptions = (
  findings,
  exceptions,
  now = new Date(),
) => {
  const expiredExceptions = [];
  for (const exception of exceptions) {
    if (isExceptionExpired(exception, now)) {
      expiredExceptions.push(exception);
    }
  }

  const filteredFindings = findings.filter(
    (finding) =>
      !exceptions.some(
        (entry) =>
          !isExceptionExpired(entry, now) && matchesException(finding, entry),
      ),
  );

  return {
    findings: filteredFindings,
    expiredExceptions,
  };
};

export const analyzeRendererStoreUsage = async ({ now = new Date() } = {}) => {
  const { exceptions } = await readAllowlist();
  const files = collectFiles(RENDERER_ROOT);
  const findings = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    const relativeFile = path
      .relative(PROJECT_ROOT, filePath)
      .replace(/\\/g, "/");
    findings.push(...analyzeRendererStoreUsageSource(content, relativeFile));
  }

  return applyRendererStoreUsageExceptions(findings, exceptions, now);
};

export const runRendererStoreUsageCheck = async () => {
  const report = await analyzeRendererStoreUsage();
  let failed = false;

  if (report.expiredExceptions.length > 0) {
    failed = true;
    console.error("[check-renderer-store-usage] expired exceptions:");
    report.expiredExceptions.forEach((entry) => {
      console.error(
        `- ${entry.id ?? "(no-id)"} ${entry.type} ${entry.expiresAt}`,
      );
    });
  }

  if (report.findings.length > 0) {
    failed = true;
    console.error("[check-renderer-store-usage] renderer store findings:");
    report.findings.forEach((finding) => {
      console.error(
        `- ${finding.file}:${finding.line} [${finding.type}] ${finding.message}`,
      );
    });
  }

  if (failed) {
    return { exitCode: 1 };
  }

  console.log("[check-renderer-store-usage] OK");
  return { exitCode: 0 };
};

const isExecutedDirectly =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isExecutedDirectly) {
  runRendererStoreUsageCheck()
    .then(({ exitCode }) => process.exit(exitCode))
    .catch((error) => {
      console.error(
        "[check-renderer-store-usage] failed:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    });
}
