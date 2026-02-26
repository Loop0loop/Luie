#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PRELOAD_PATH = path.resolve(process.cwd(), "src/preload/index.ts");
const BASELINE_PATH = path.resolve(
  process.cwd(),
  "docs/quality/preload-contract-baseline.json",
);
const UPDATE_BASELINE_FLAG = "--update-baseline";

export const CORE_METHODS = [
  "window.openExport",
  "project.openLuie",
  "project.get",
  "project.getAll",
  "chapter.get",
  "chapter.getAll",
  "chapter.update",
  "snapshot.importFromFile",
  "snapshot.restore",
  "sync.getStatus",
  "sync.connectGoogle",
  "sync.disconnect",
  "sync.runNow",
  "sync.setAutoSync",
  "app.getBootstrapStatus",
  "settings.getAll",
  "settings.getEditor",
  "settings.setEditor",
  "settings.getLanguage",
  "settings.setLanguage",
  "settings.getMenuBarMode",
  "settings.setMenuBarMode",
  "settings.getShortcuts",
  "settings.setShortcuts",
  "settings.getWindowBounds",
  "settings.setWindowBounds",
  "fs.readLuieEntry",
  "fs.selectFile",
  "fs.selectSaveLocation",
];

const DEFAULT_LIMITS = {
  maxNeverCount: Number.POSITIVE_INFINITY,
  maxUnknownCount: Number.POSITIVE_INFINITY,
};

const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const countMatches = (source, pattern) => (source.match(pattern) ?? []).length;

export const extractObjectBlock = (source, objectName) => {
  const marker = `${objectName}: {`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }

  const blockStart = source.indexOf("{", markerIndex);
  if (blockStart < 0) {
    return null;
  }

  let depth = 0;
  for (let index = blockStart; index < source.length; index += 1) {
    const token = source[index];
    if (token === "{") depth += 1;
    if (token === "}") depth -= 1;
    if (depth === 0) {
      return source.slice(blockStart + 1, index);
    }
  }

  return null;
};

const extractMethodDefinition = (objectBlock, methodName) => {
  const methodStartPattern = new RegExp(`${escapeRegExp(methodName)}\\s*:`, "m");
  const match = methodStartPattern.exec(objectBlock);
  if (!match?.index && match?.index !== 0) {
    return null;
  }

  const startIndex = match.index;
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;

  for (let index = startIndex; index < objectBlock.length; index += 1) {
    const token = objectBlock[index];
    if (token === "(") parenDepth += 1;
    if (token === ")") parenDepth -= 1;
    if (token === "{") braceDepth += 1;
    if (token === "}") braceDepth -= 1;
    if (token === "[") bracketDepth += 1;
    if (token === "]") bracketDepth -= 1;

    if (
      token === "," &&
      parenDepth === 0 &&
      braceDepth === 0 &&
      bracketDepth === 0
    ) {
      return objectBlock.slice(startIndex, index);
    }
  }

  return objectBlock.slice(startIndex);
};

const hasSafeInvokeCore = (methodDefinition, coreMethodPath) =>
  methodDefinition.includes(`safeInvokeCore("${coreMethodPath}"`);

const hasNeverReturnType = (methodDefinition) => {
  const signature = methodDefinition.split("=>")[0] ?? methodDefinition;
  return /Promise\s*<\s*IPCResponse\s*<\s*never\s*>\s*>/.test(signature);
};

export const analyzePreloadContract = (source, limits = DEFAULT_LIMITS) => {
  const missingSafeInvokeCore = [];
  const neverTypedCoreMethods = [];

  for (const methodPath of CORE_METHODS) {
    const [objectName] = methodPath.split(".");
    const objectBlock = extractObjectBlock(source, objectName);
    if (!objectBlock) {
      missingSafeInvokeCore.push(methodPath);
      continue;
    }

    const [, methodName] = methodPath.split(".");
    const methodDefinition = extractMethodDefinition(objectBlock, methodName);
    if (!methodDefinition) {
      missingSafeInvokeCore.push(methodPath);
      continue;
    }

    if (!hasSafeInvokeCore(methodDefinition, methodPath)) {
      missingSafeInvokeCore.push(methodPath);
    }
    if (hasNeverReturnType(methodDefinition)) {
      neverTypedCoreMethods.push(methodPath);
    }
  }

  const neverCount = countMatches(source, /IPCResponse<never>/g);
  const unknownCount = countMatches(source, /\bunknown\b/g);

  return {
    neverCount,
    unknownCount,
    missingSafeInvokeCore,
    neverTypedCoreMethods,
    exceedsNeverCount: neverCount > limits.maxNeverCount,
    exceedsUnknownCount: unknownCount > limits.maxUnknownCount,
  };
};

const readBaseline = async () => {
  const raw = await readFile(BASELINE_PATH, "utf8");
  const parsed = JSON.parse(raw);
  return {
    maxNeverCount:
      typeof parsed?.maxNeverCount === "number"
        ? parsed.maxNeverCount
        : Number.POSITIVE_INFINITY,
    maxUnknownCount:
      typeof parsed?.maxUnknownCount === "number"
        ? parsed.maxUnknownCount
        : Number.POSITIVE_INFINITY,
    coreMethods: Array.isArray(parsed?.coreMethods) ? parsed.coreMethods : [],
  };
};

const writeBaseline = async ({ neverCount, unknownCount }) => {
  const payload = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    maxNeverCount: neverCount,
    maxUnknownCount: unknownCount,
    coreMethods: CORE_METHODS,
  };

  await writeFile(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

export const checkPreloadContractRegression = async ({
  shouldUpdateBaseline = false,
} = {}) => {
  const source = await readFile(PRELOAD_PATH, "utf8");
  const baseline = await readBaseline().catch(() => ({
    ...DEFAULT_LIMITS,
    coreMethods: [],
  }));

  const analysis = analyzePreloadContract(source, baseline);
  if (shouldUpdateBaseline) {
    await writeBaseline(analysis);
    console.log(
      `[check-preload-contract-regression] baseline updated (never=${analysis.neverCount}, unknown=${analysis.unknownCount}).`,
    );
    return { exitCode: 0 };
  }

  let failed = false;

  if (analysis.missingSafeInvokeCore.length > 0) {
    failed = true;
    console.error(
      "[check-preload-contract-regression] core methods must use safeInvokeCore:",
    );
    analysis.missingSafeInvokeCore.forEach((methodPath) => {
      console.error(`- ${methodPath}`);
    });
  }

  if (analysis.neverTypedCoreMethods.length > 0) {
    failed = true;
    console.error(
      "[check-preload-contract-regression] core methods must not return IPCResponse<never>:",
    );
    analysis.neverTypedCoreMethods.forEach((methodPath) => {
      console.error(`- ${methodPath}`);
    });
  }

  if (analysis.exceedsNeverCount) {
    failed = true;
    console.error(
      `[check-preload-contract-regression] IPCResponse<never> count regression: baseline=${baseline.maxNeverCount}, current=${analysis.neverCount}`,
    );
  }

  if (analysis.exceedsUnknownCount) {
    failed = true;
    console.error(
      `[check-preload-contract-regression] unknown count regression: baseline=${baseline.maxUnknownCount}, current=${analysis.unknownCount}`,
    );
  }

  const baselineCoreMethods = new Set(baseline.coreMethods);
  const missingCoreMethods = CORE_METHODS.filter(
    (method) => !baselineCoreMethods.has(method),
  );
  if (missingCoreMethods.length > 0) {
    console.warn(
      `[check-preload-contract-regression] baseline is missing ${missingCoreMethods.length} core methods; run with --update-baseline to sync.`,
    );
  }

  if (failed) {
    return { exitCode: 1 };
  }

  console.log(
    `[check-preload-contract-regression] OK (never=${analysis.neverCount}, unknown=${analysis.unknownCount}).`,
  );
  return { exitCode: 0 };
};

const main = async () => {
  const shouldUpdateBaseline = process.argv.includes(UPDATE_BASELINE_FLAG);
  const result = await checkPreloadContractRegression({ shouldUpdateBaseline });
  process.exit(result.exitCode);
};

const isExecutedDirectly =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isExecutedDirectly) {
  main().catch((error) => {
    console.error(
      "[check-preload-contract-regression] failed:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  });
}
