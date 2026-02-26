#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BASELINE_PATH = path.resolve(
  process.cwd(),
  "docs/quality/build-warning-baseline.json",
);

const UPDATE_BASELINE_FLAG = "--update-baseline";
const WARNING_PREFIX = "(!)";
const WARNING_SUFFIX =
  ", dynamic import will not move module into another chunk.";
const WINDOWS_ABSOLUTE_PATH_RE = /^[A-Za-z]:[\\/]/;

const runBuild = async () => {
  const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const child = spawn(pnpmCommand, ["-s", "build"], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  let combinedOutput = "";

  child.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    combinedOutput += text;
    process.stdout.write(text);
  });

  child.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    combinedOutput += text;
    process.stderr.write(text);
  });

  const exitCode = await new Promise((resolve) => {
    child.on("close", resolve);
  });

  return {
    exitCode: Number(exitCode ?? 1),
    output: combinedOutput,
  };
};

const normalizeSlash = (value) => value.replace(/\\/g, "/");

const isAbsolutePathLike = (value) =>
  path.isAbsolute(value) || WINDOWS_ABSOLUTE_PATH_RE.test(value);

export const normalizeWarningPath = (inputPath, cwd = process.cwd()) => {
  const normalizedPath = normalizeSlash(inputPath.trim());
  const normalizedCwd = normalizeSlash(cwd).replace(/\/+$/, "");

  if (normalizedPath === normalizedCwd) {
    return ".";
  }

  if (normalizedPath.startsWith(`${normalizedCwd}/`)) {
    return normalizedPath.slice(normalizedCwd.length + 1);
  }

  return isAbsolutePathLike(inputPath) ? normalizedPath : normalizedPath;
};

const normalizePathList = (rawList, cwd) =>
  Array.from(
    new Set(
      rawList
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => normalizeWarningPath(entry, cwd)),
    ),
  ).sort((a, b) => a.localeCompare(b));

const normalizeTextWarning = (message, cwd) =>
  message.replace(/([A-Za-z]:[\\/][^,\s]+|\/[^,\s]+)/g, (pathLike) =>
    normalizeWarningPath(pathLike, cwd),
  );

export const buildWarningKey = (warning) => {
  if (warning.kind === "dynamic-static-mix") {
    return [
      warning.kind,
      warning.module,
      warning.dynamicImporters.join("|"),
      warning.staticImporters.join("|"),
    ].join("::");
  }

  return `${warning.kind}::${warning.message}`;
};

export const parseWarningLine = (line, cwd = process.cwd()) => {
  const stripped = line.replace(/^\(!\)\s*/, "").trim();
  if (!stripped) {
    return null;
  }

  const dynamicSeparator = " is dynamically imported by ";
  const staticSeparator = " but also statically imported by ";
  const hasDynamicMixWarning =
    stripped.includes(dynamicSeparator) &&
    stripped.includes(staticSeparator) &&
    stripped.endsWith(WARNING_SUFFIX);

  if (!hasDynamicMixWarning) {
    return {
      kind: "text",
      message: normalizeTextWarning(stripped, cwd),
    };
  }

  const moduleSplit = stripped.split(dynamicSeparator);
  if (moduleSplit.length !== 2) {
    return {
      kind: "text",
      message: normalizeTextWarning(stripped, cwd),
    };
  }

  const [modulePart, importedByPart] = moduleSplit;
  const importSplit = importedByPart.split(staticSeparator);
  if (importSplit.length !== 2) {
    return {
      kind: "text",
      message: normalizeTextWarning(stripped, cwd),
    };
  }

  const [dynamicImportersRaw, staticImportersWithSuffix] = importSplit;
  const staticImportersRaw = staticImportersWithSuffix.slice(
    0,
    -WARNING_SUFFIX.length,
  );

  return {
    kind: "dynamic-static-mix",
    module: normalizeWarningPath(modulePart, cwd),
    dynamicImporters: normalizePathList(dynamicImportersRaw, cwd),
    staticImporters: normalizePathList(staticImportersRaw, cwd),
  };
};

const normalizeWarningObject = (warning, cwd = process.cwd()) => {
  if (warning?.kind === "dynamic-static-mix") {
    return {
      kind: "dynamic-static-mix",
      module: normalizeWarningPath(String(warning.module ?? ""), cwd),
      dynamicImporters: normalizePathList(
        Array.isArray(warning.dynamicImporters)
          ? warning.dynamicImporters.join(",")
          : String(warning.dynamicImporters ?? ""),
        cwd,
      ),
      staticImporters: normalizePathList(
        Array.isArray(warning.staticImporters)
          ? warning.staticImporters.join(",")
          : String(warning.staticImporters ?? ""),
        cwd,
      ),
    };
  }

  return {
    kind: "text",
    message: normalizeTextWarning(String(warning?.message ?? ""), cwd),
  };
};

const dedupeAndSortWarnings = (warnings) => {
  const byKey = new Map();
  for (const warning of warnings) {
    byKey.set(buildWarningKey(warning), warning);
  }

  return Array.from(byKey.entries())
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([, warning]) => warning);
};

export const extractWarningObjects = (output, cwd = process.cwd()) => {
  const parsed = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith(WARNING_PREFIX))
    .map((line) => parseWarningLine(line, cwd))
    .filter(Boolean);

  return dedupeAndSortWarnings(parsed);
};

const readBaseline = async () => {
  const raw = await readFile(BASELINE_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed?.warnings)) {
    throw new Error("Baseline JSON is missing `warnings` array");
  }

  if (parsed.schemaVersion === 2) {
    return dedupeAndSortWarnings(
      parsed.warnings.map((warning) => normalizeWarningObject(warning)),
    );
  }

  return dedupeAndSortWarnings(
    parsed.warnings
      .map((warningLine) => parseWarningLine(String(warningLine)))
      .filter(Boolean),
  );
};

const writeBaseline = async (warnings) => {
  const payload = {
    schemaVersion: 2,
    updatedAt: new Date().toISOString(),
    warnings,
  };
  await writeFile(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const diffWarnings = (baseline, current) => {
  const baselineMap = new Map(
    baseline.map((warning) => [buildWarningKey(warning), warning]),
  );
  const currentMap = new Map(
    current.map((warning) => [buildWarningKey(warning), warning]),
  );

  const added = current.filter((warning) => !baselineMap.has(buildWarningKey(warning)));
  const removed = baseline.filter((warning) => !currentMap.has(buildWarningKey(warning)));

  return { added, removed };
};

const formatWarning = (warning) => {
  if (warning.kind === "dynamic-static-mix") {
    return `${warning.module} is dynamically imported by ${warning.dynamicImporters.join(", ")} but also statically imported by ${warning.staticImporters.join(", ")}${WARNING_SUFFIX}`;
  }
  return warning.message;
};

export const checkBuildWarningRegression = async ({
  shouldUpdateBaseline = false,
} = {}) => {
  const buildResult = await runBuild();
  if (buildResult.exitCode !== 0) {
    return { exitCode: buildResult.exitCode };
  }

  const currentWarnings = extractWarningObjects(buildResult.output);
  if (shouldUpdateBaseline) {
    await writeBaseline(currentWarnings);
    console.log(
      `[check-build-warning-regression] baseline updated (${currentWarnings.length} warnings).`,
    );
    return { exitCode: 0 };
  }

  const baselineWarnings = await readBaseline();
  const { added, removed } = diffWarnings(baselineWarnings, currentWarnings);

  if (added.length > 0) {
    console.error("[check-build-warning-regression] new build warnings detected:");
    added.forEach((warning) => console.error(`- ${formatWarning(warning)}`));
    return { exitCode: 1 };
  }

  if (removed.length > 0) {
    console.warn(
      `[check-build-warning-regression] warnings removed from baseline: ${removed.length}`,
    );
    removed.forEach((warning) => console.warn(`- ${formatWarning(warning)}`));
  }

  console.log(
    `[check-build-warning-regression] OK (${currentWarnings.length} warnings, no regressions).`,
  );
  return { exitCode: 0 };
};

const main = async () => {
  const shouldUpdateBaseline = process.argv.includes(UPDATE_BASELINE_FLAG);
  const result = await checkBuildWarningRegression({ shouldUpdateBaseline });
  process.exit(result.exitCode);
};

const isExecutedDirectly =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isExecutedDirectly) {
  main().catch((error) => {
    console.error(
      "[check-build-warning-regression] failed:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  });
}
