#!/usr/bin/env node

import fs from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PROJECT_ROOT = process.cwd();
const CHANNELS_FILE = path.join(PROJECT_ROOT, "src/shared/ipc/channels.ts");
const OUTPUT_MAP_FILE = path.join(
  PROJECT_ROOT,
  "docs/quality/ipc-contract-map.json",
);
const ALLOWLIST_FILE = path.join(
  PROJECT_ROOT,
  "docs/quality/ipc-channel-allowlist.json",
);

const SOURCE_DIRS = [
  "src/preload",
  "src/main/handler",
  "src/main/lifecycle",
  "src/main/services",
];

const SOURCE_FILE_PATTERN = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

const USAGE_CATEGORIES = [
  "renderer_invoke",
  "main_handle",
  "main_emit",
  "renderer_listen",
  "renderer_send",
  "main_listen",
];

const createUsageNode = () =>
  Object.fromEntries(
    USAGE_CATEGORIES.map((category) => [category, []]),
  );

const countLineNumber = (content, index) =>
  content.slice(0, index).split(/\r?\n/).length;

const collectFiles = (dir, output = []) => {
  if (!fs.existsSync(dir)) return output;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, output);
      continue;
    }
    if (SOURCE_FILE_PATTERN.test(entry.name)) {
      output.push(fullPath);
    }
  }
  return output;
};

export const extractChannelDefinitions = (content) => {
  const channelMap = new Map();
  const valueToKeys = new Map();
  const definitionRe = /^\s*([A-Z0-9_]+):\s*"([^"]+)"/gm;

  for (const match of content.matchAll(definitionRe)) {
    const key = match[1];
    const value = match[2];
    channelMap.set(key, value);
    if (!valueToKeys.has(value)) valueToKeys.set(value, []);
    valueToKeys.get(value).push(key);
  }

  const duplicateChannelValues = Array.from(valueToKeys.entries())
    .filter(([, keys]) => keys.length > 1)
    .map(([channel, keys]) => ({ channel, keys }))
    .sort((a, b) => a.channel.localeCompare(b.channel));

  return {
    channelMap,
    duplicateChannelValues,
  };
};

const pushMatches = ({
  usageByKey,
  content,
  relativeFile,
  category,
  regex,
}) => {
  for (const match of content.matchAll(regex)) {
    const key = match[1];
    if (!usageByKey.has(key)) {
      usageByKey.set(key, createUsageNode());
    }
    usageByKey.get(key)[category].push({
      file: relativeFile,
      line: countLineNumber(content, match.index ?? 0),
    });
  }
};

export const collectIpcUsage = (files, rootDir = PROJECT_ROOT) => {
  const usageByKey = new Map();

  for (const absoluteFile of files) {
    const content = fs.readFileSync(absoluteFile, "utf8");
    const relativeFile = path.relative(rootDir, absoluteFile);
    const normalized = relativeFile.replace(/\\/g, "/");

    if (normalized === "src/preload/index.ts") {
      pushMatches({
        usageByKey,
        content,
        relativeFile: normalized,
        category: "renderer_invoke",
        regex: /\bsafeInvoke(?:Core)?\([^)]*IPC_CHANNELS\.([A-Z0-9_]+)/g,
      });
      pushMatches({
        usageByKey,
        content,
        relativeFile: normalized,
        category: "renderer_send",
        regex: /ipcRenderer\.send\(\s*IPC_CHANNELS\.([A-Z0-9_]+)/g,
      });
      pushMatches({
        usageByKey,
        content,
        relativeFile: normalized,
        category: "renderer_listen",
        regex: /ipcRenderer\.(?:on|once)\(\s*IPC_CHANNELS\.([A-Z0-9_]+)/g,
      });
      continue;
    }

    if (!normalized.startsWith("src/main/")) {
      continue;
    }

    pushMatches({
      usageByKey,
      content,
      relativeFile: normalized,
      category: "main_handle",
      regex: /channel:\s*IPC_CHANNELS\.([A-Z0-9_]+)/g,
    });
    pushMatches({
      usageByKey,
      content,
      relativeFile: normalized,
      category: "main_handle",
      regex: /ipcMain\.handle\(\s*IPC_CHANNELS\.([A-Z0-9_]+)/g,
    });
    pushMatches({
      usageByKey,
      content,
      relativeFile: normalized,
      category: "main_emit",
      regex: /webContents\.send\(\s*IPC_CHANNELS\.([A-Z0-9_]+)/g,
    });
    pushMatches({
      usageByKey,
      content,
      relativeFile: normalized,
      category: "main_listen",
      regex: /ipcMain\.(?:on|once)\(\s*IPC_CHANNELS\.([A-Z0-9_]+)/g,
    });
  }

  for (const usage of usageByKey.values()) {
    for (const category of USAGE_CATEGORIES) {
      usage[category] = usage[category]
        .filter(
          (ref, index, array) =>
            array.findIndex(
              (candidate) =>
                candidate.file === ref.file &&
                candidate.line === ref.line,
            ) === index,
        )
        .sort((a, b) =>
          a.file === b.file
            ? a.line - b.line
            : a.file.localeCompare(b.file),
        );
    }
  }

  return usageByKey;
};

const readAllowlist = async () => {
  if (!fs.existsSync(ALLOWLIST_FILE)) {
    return [];
  }
  const raw = await readFile(ALLOWLIST_FILE, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed?.channels)) {
    return [];
  }
  return parsed.channels;
};

export const evaluateIpcContract = ({
  channelMap,
  duplicateChannelValues,
  usageByKey,
  allowlistEntries,
  now = new Date(),
}) => {
  const errors = [];
  const warnings = [];
  const allowlistByKey = new Map();
  const nowMs = now.getTime();

  for (const entry of allowlistEntries) {
    if (!entry?.channelKey) continue;
    allowlistByKey.set(entry.channelKey, entry);
    if (!entry.expiresAt) continue;
    const expiresAt = new Date(entry.expiresAt).getTime();
    if (!Number.isNaN(expiresAt) && expiresAt < nowMs) {
      errors.push(
        `allowlist entry expired: ${entry.channelKey} (${entry.expiresAt})`,
      );
    }
  }

  if (duplicateChannelValues.length > 0) {
    duplicateChannelValues.forEach((entry) => {
      errors.push(
        `duplicate channel value "${entry.channel}" defined by ${entry.keys.join(", ")}`,
      );
    });
  }

  const contractEntries = Array.from(channelMap.entries())
    .map(([key, channel]) => {
      const usage = usageByKey.get(key) ?? createUsageNode();
      const hasAnyUsage = USAGE_CATEGORIES.some(
        (category) => usage[category].length > 0,
      );
      const isAllowlisted = allowlistByKey.has(key);

      if (usage.renderer_invoke.length > 0 && usage.main_handle.length === 0) {
        errors.push(`missing main handler for invoke channel ${key}`);
      }
      if (usage.main_emit.length > 0 && usage.renderer_listen.length === 0) {
        errors.push(`missing renderer listener for main emit channel ${key}`);
      }
      if (usage.renderer_send.length > 0 && usage.main_listen.length === 0) {
        errors.push(`missing main listener for renderer send channel ${key}`);
      }

      if (!hasAnyUsage && !isAllowlisted) {
        errors.push(`orphan channel without allowlist: ${key}`);
      }

      if (usage.main_handle.length > 0 && usage.renderer_invoke.length === 0) {
        warnings.push(`handler exists but renderer invoke missing: ${key}`);
      }
      if (usage.main_listen.length > 0 && usage.renderer_send.length === 0) {
        warnings.push(`main listen exists but renderer send missing: ${key}`);
      }

      return {
        key,
        channel,
        allowlisted: isAllowlisted,
        usage,
        usageCounts: Object.fromEntries(
          USAGE_CATEGORIES.map((category) => [category, usage[category].length]),
        ),
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));

  return {
    errors,
    warnings,
    entries: contractEntries,
  };
};

export const runIpcContractMapCheck = async () => {
  const channelsContent = await readFile(CHANNELS_FILE, "utf8");
  const { channelMap, duplicateChannelValues } =
    extractChannelDefinitions(channelsContent);

  const sourceFiles = SOURCE_DIRS.flatMap((dir) =>
    collectFiles(path.join(PROJECT_ROOT, dir)),
  );
  const usageByKey = collectIpcUsage(sourceFiles);
  const allowlistEntries = await readAllowlist();

  const evaluation = evaluateIpcContract({
    channelMap,
    duplicateChannelValues,
    usageByKey,
    allowlistEntries,
  });

  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    summary: {
      definedChannels: channelMap.size,
      errors: evaluation.errors.length,
      warnings: evaluation.warnings.length,
    },
    entries: evaluation.entries,
  };
  await writeFile(OUTPUT_MAP_FILE, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  if (evaluation.warnings.length > 0) {
    console.warn("[check-ipc-contract-map] warnings:");
    evaluation.warnings.forEach((warning) => console.warn(`- ${warning}`));
  }

  if (evaluation.errors.length > 0) {
    console.error("[check-ipc-contract-map] errors:");
    evaluation.errors.forEach((error) => console.error(`- ${error}`));
    return { exitCode: 1 };
  }

  console.log(
    `[check-ipc-contract-map] OK (${output.summary.definedChannels} channels)`,
  );
  return { exitCode: 0 };
};

const isExecutedDirectly =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isExecutedDirectly) {
  runIpcContractMapCheck()
    .then(({ exitCode }) => process.exit(exitCode))
    .catch((error) => {
      console.error(
        "[check-ipc-contract-map] failed:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    });
}
