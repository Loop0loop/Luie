#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const PROJECT_ROOT = process.cwd();
const RENDERER_ROOT = path.join(PROJECT_ROOT, "src/renderer/src");
const SOURCE_FILE_PATTERN = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const REQUIRED_OPTIONS = [
  "version",
  "migrate",
  "merge",
  "onRehydrateStorage",
];

const collectFiles = (dir, output = []) => {
  if (!fs.existsSync(dir)) return output;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "out") {
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

const walk = (node, visitor) => {
  visitor(node);
  ts.forEachChild(node, (child) => walk(child, visitor));
};

const getLineNumber = (sourceFile, position) =>
  sourceFile.getLineAndCharacterOfPosition(position).line + 1;

const getPropertyName = (property) => {
  if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) {
    return property.name.text;
  }
  return null;
};

export const analyzePersistContractsSource = (content, relativeFile) => {
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
    if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return;
    if (node.expression.text !== "persist") return;
    if (node.arguments.length < 2) return;
    const optionsArg = node.arguments[1];
    if (!ts.isObjectLiteralExpression(optionsArg)) return;

    const optionNames = new Set(
      optionsArg.properties
        .map((property) => {
          if (ts.isPropertyAssignment(property) || ts.isMethodDeclaration(property)) {
            return getPropertyName(property);
          }
          return null;
        })
        .filter(Boolean),
    );

    const missing = REQUIRED_OPTIONS.filter((name) => !optionNames.has(name));
    if (missing.length === 0) return;

    findings.push({
      type: "persist-contract-missing-option",
      severity: "error",
      file: relativeFile,
      line: getLineNumber(sourceFile, node.getStart(sourceFile)),
      message: `Persist stores must define ${missing.join(", ")}.`,
      missing,
    });
  });

  return findings;
};

export const analyzePersistContracts = async () => {
  const files = collectFiles(RENDERER_ROOT);
  const findings = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    const relativeFile = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, "/");
    findings.push(...analyzePersistContractsSource(content, relativeFile));
  }

  return findings;
};

export const runPersistContractsCheck = async () => {
  const findings = await analyzePersistContracts();
  if (findings.length > 0) {
    console.error("[check-persist-contracts] persist findings:");
    findings.forEach((finding) => {
      console.error(
        `- ${finding.file}:${finding.line} [${finding.type}] ${finding.message}`,
      );
    });
    return { exitCode: 1 };
  }

  console.log("[check-persist-contracts] OK");
  return { exitCode: 0 };
};

const isExecutedDirectly =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isExecutedDirectly) {
  runPersistContractsCheck()
    .then(({ exitCode }) => process.exit(exitCode))
    .catch((error) => {
      console.error(
        "[check-persist-contracts] failed:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    });
}
