#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = process.cwd();
const utilityRoot = path.join(projectRoot, "src", "main", "utility");

const ELECTRON_MAIN_ONLY_IMPORTS = new Set(["BrowserWindow", "app", "ipcMain"]);

const IMPORT_RE =
  /import\s+(?:type\s+)?(?:(?<named>\{[\s\S]*?\})|(?<defaultName>[\w$]+)|(?<namespace>\*\s+as\s+[\w$]+))?\s*(?:from\s*)?["'](?<specifier>[^"']+)["']/g;

const normalizePath = (value) => value.split(path.sep).join("/");

const shouldCheckFile = (relativePath) =>
  /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(relativePath) &&
  !relativePath.endsWith(".d.ts");

const getLineNumber = (source, index) =>
  source.slice(0, index).split(/\r?\n/).length;

const parseNamedImports = (namedImport) => {
  if (!namedImport) return [];
  return namedImport
    .replace(/[{}]/g, "")
    .split(",")
    .map((part) => part.trim().split(/\s+as\s+/u)[0]?.trim())
    .filter(Boolean);
};

const isMainUtilityBridgeImport = (specifier) =>
  specifier.includes("services/features/utility/utilityProcessBridge") ||
  specifier.includes("infra/utility-process");

const isMainSidecarManagerImport = (specifier) =>
  specifier.includes("services/llm/sidecarManager") ||
  specifier.includes("domains/settings/llm");

export function analyzeUtilityProcessBoundarySource(source, file) {
  const findings = [];
  IMPORT_RE.lastIndex = 0;

  for (const match of source.matchAll(IMPORT_RE)) {
    const specifier = match.groups?.specifier ?? "";
    const line = getLineNumber(source, match.index ?? 0);

    if (isMainUtilityBridgeImport(specifier)) {
      findings.push({
        file,
        line,
        type: "main-utility-bridge-import",
        message: "utility process code must not import the main UtilityProcessBridge",
        specifier,
      });
    }

    if (isMainSidecarManagerImport(specifier)) {
      findings.push({
        file,
        line,
        type: "main-sidecar-manager-import",
        message: "utility process code must not import the main sidecar manager",
        specifier,
      });
    }

    if (specifier === "electron") {
      for (const importedName of parseNamedImports(match.groups?.named)) {
        if (!ELECTRON_MAIN_ONLY_IMPORTS.has(importedName)) continue;
        findings.push({
          file,
          line,
          type: "electron-main-only-import",
          message: `utility process code must not import Electron main-only API '${importedName}'`,
          specifier,
          importedName,
        });
      }
    }
  }

  return findings;
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
      continue;
    }
    files.push(fullPath);
  }
  return files;
}

async function collectFindings() {
  const files = await walk(utilityRoot);
  const findings = [];
  for (const fullPath of files) {
    const relativePath = normalizePath(path.relative(projectRoot, fullPath));
    if (!shouldCheckFile(relativePath)) continue;
    const source = await fs.readFile(fullPath, "utf8");
    findings.push(...analyzeUtilityProcessBoundarySource(source, relativePath));
  }
  return findings;
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const findings = await collectFindings();
  if (findings.length > 0) {
    console.error("[check-utility-process-boundary] Boundary violations found:");
    for (const finding of findings) {
      console.error(
        `- ${finding.file}:${finding.line} [${finding.type}] ${finding.message}`,
      );
    }
    process.exit(1);
  }

  console.log("[check-utility-process-boundary] OK");
}
