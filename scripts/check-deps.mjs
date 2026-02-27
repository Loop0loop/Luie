#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import { builtinModules } from "node:module";
import { pathToFileURL } from "node:url";

const PROJECT_ROOT = process.cwd();
const SRC_ROOT = path.join(PROJECT_ROOT, "src");
const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, "package.json");
const ALLOWED_INTERNAL_PREFIXES = ["@shared/", "@renderer/", "node:"];
const SOURCE_FILE_PATTERN = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const IMPORT_RE =
  /\bimport\s+(?:type\s+)?(?:[^"'()]*?\s+from\s+)?["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)|\brequire\(\s*["']([^"']+)["']\s*\)/g;
const RESOLVABLE_EXTENSIONS = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
];

const BUILTIN_MODULES = new Set(
  builtinModules
    .flatMap((moduleName) =>
      moduleName.startsWith("node:")
        ? [moduleName, moduleName.slice(5)]
        : [moduleName, `node:${moduleName}`],
    ),
);

const shouldSkipDir = (dirName) =>
  dirName === "node_modules" ||
  dirName === "dist" ||
  dirName === "out" ||
  dirName === ".git" ||
  dirName === ".pnpm-store";

const isInternalAlias = (specifier) =>
  ALLOWED_INTERNAL_PREFIXES.some((prefix) => specifier.startsWith(prefix));

export const toPackageName = (specifier) => {
  if (specifier.startsWith("@")) {
    const [scope, name] = specifier.split("/");
    return scope && name ? `${scope}/${name}` : specifier;
  }
  return specifier.split("/")[0] ?? specifier;
};

const collectFiles = (dir, output = []) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) continue;
      collectFiles(fullPath, output);
      continue;
    }
    if (SOURCE_FILE_PATTERN.test(entry.name)) {
      output.push(fullPath);
    }
  }
  return output;
};

const normalizeAliasPath = (specifier) => {
  if (specifier.startsWith("@shared/")) {
    return path.join(PROJECT_ROOT, "src", "shared", specifier.slice("@shared/".length));
  }
  if (specifier.startsWith("@renderer/")) {
    return path.join(
      PROJECT_ROOT,
      "src",
      "renderer",
      "src",
      specifier.slice("@renderer/".length),
    );
  }
  return null;
};

const resolvePathCandidates = (basePath) => {
  const candidates = [];

  const pushIfMissing = (value) => {
    if (!candidates.includes(value)) {
      candidates.push(value);
    }
  };

  const withJsSubstitute = (candidate) => {
    pushIfMissing(candidate);
    if (candidate.endsWith(".js")) {
      pushIfMissing(candidate.slice(0, -3) + ".ts");
      pushIfMissing(candidate.slice(0, -3) + ".tsx");
    }
    if (candidate.endsWith(".mjs")) {
      pushIfMissing(candidate.slice(0, -4) + ".ts");
      pushIfMissing(candidate.slice(0, -4) + ".mts");
    }
  };

  for (const ext of RESOLVABLE_EXTENSIONS) {
    withJsSubstitute(`${basePath}${ext}`);
  }
  for (const ext of RESOLVABLE_EXTENSIONS) {
    withJsSubstitute(path.join(basePath, `index${ext}`));
  }

  return candidates;
};

const resolveInternalImport = (sourceFile, specifier) => {
  if (specifier.startsWith("node:")) return true;

  let basePath;
  if (specifier.startsWith(".")) {
    basePath = path.resolve(path.dirname(sourceFile), specifier);
  } else if (specifier.startsWith("/")) {
    basePath = path.resolve(PROJECT_ROOT, `.${specifier}`);
  } else {
    basePath = normalizeAliasPath(specifier);
  }
  if (!basePath) return true;

  return resolvePathCandidates(basePath).some((candidate) => fs.existsSync(candidate));
};

export const extractImports = (content) => {
  const imports = [];
  for (const match of content.matchAll(IMPORT_RE)) {
    const specifier = match[1] ?? match[2] ?? match[3];
    if (!specifier) continue;
    imports.push(specifier);
  }
  return imports;
};

export const analyzeDependencyIntegrity = async () => {
  const packageJsonRaw = await readFile(PACKAGE_JSON_PATH, "utf8");
  const packageJson = JSON.parse(packageJsonRaw);
  const declaredDependencies = new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
  ]);

  const files = collectFiles(SRC_ROOT);
  const missingExternal = new Map();
  const unresolvedInternal = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    const imports = extractImports(content);
    const relativeFile = path.relative(PROJECT_ROOT, filePath);

    for (const specifier of imports) {
      if (
        specifier.startsWith("./") ||
        specifier.startsWith("../") ||
        specifier.startsWith("/") ||
        isInternalAlias(specifier)
      ) {
        if (!resolveInternalImport(filePath, specifier)) {
          unresolvedInternal.push({
            file: relativeFile,
            specifier,
          });
        }
        continue;
      }

      const packageName = toPackageName(specifier);
      if (BUILTIN_MODULES.has(packageName)) {
        continue;
      }

      if (!declaredDependencies.has(packageName)) {
        if (!missingExternal.has(packageName)) {
          missingExternal.set(packageName, []);
        }
        missingExternal.get(packageName).push(relativeFile);
      }
    }
  }

  return {
    missingExternal,
    unresolvedInternal,
  };
};

export const runDependencyIntegrityCheck = async () => {
  const report = await analyzeDependencyIntegrity();
  let failed = false;

  if (report.missingExternal.size > 0) {
    failed = true;
    console.error("[check-deps] Missing dependencies found:");
    for (const [dep, files] of report.missingExternal.entries()) {
      const uniqueFiles = [...new Set(files)].sort();
      console.error(`- ${dep}`);
      uniqueFiles.forEach((file) => console.error(`  - ${file}`));
    }
  }

  if (report.unresolvedInternal.length > 0) {
    failed = true;
    console.error("[check-deps] Unresolved internal imports found:");
    report.unresolvedInternal.forEach((entry) => {
      console.error(`- ${entry.file}: ${entry.specifier}`);
    });
  }

  if (failed) {
    return { exitCode: 1 };
  }

  console.log("[check-deps] OK");
  return { exitCode: 0 };
};

const isExecutedDirectly =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isExecutedDirectly) {
  runDependencyIntegrityCheck()
    .then(({ exitCode }) => process.exit(exitCode))
    .catch((error) => {
      console.error(
        "[check-deps] failed:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    });
}
