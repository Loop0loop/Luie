#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PROJECT_ROOT = process.cwd();
const TASK_PACKET_PATH = path.join(
  PROJECT_ROOT,
  "docs/quality/current-task-packet.json",
);
const STRICT_MODE = process.env.STRICT_TARGET_DRIFT === "1";

const normalizePath = (value) => value.replace(/\\/g, "/");

const readTaskPacket = async () => {
  if (!fs.existsSync(TASK_PACKET_PATH)) {
    return null;
  }
  const raw = await readFile(TASK_PACKET_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed?.targetFiles)) {
    return null;
  }
  return {
    ...parsed,
    targetFiles: parsed.targetFiles.map(normalizePath),
  };
};

const collectChangedFiles = () => {
  const output = execSync("git status --porcelain", {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
  });
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  return lines
    .map((line) => line.slice(3).trim())
    .map((filePath) => normalizePath(filePath))
    .filter((filePath) => filePath.length > 0);
};

export const evaluateTargetFileDrift = async () => {
  const packet = await readTaskPacket();
  if (!packet) {
    return {
      mode: "no-packet",
      targetFiles: [],
      changedFiles: collectChangedFiles(),
      driftFiles: [],
    };
  }

  const targetSet = new Set(packet.targetFiles);
  const changedFiles = collectChangedFiles();
  const driftFiles = changedFiles.filter((changed) => !targetSet.has(changed));

  return {
    mode: "packet",
    targetFiles: packet.targetFiles,
    changedFiles,
    driftFiles,
  };
};

export const runTargetFileDriftCheck = async () => {
  const result = await evaluateTargetFileDrift();
  if (result.mode === "no-packet") {
    console.warn(
      "[check-target-file-drift] warning: docs/quality/current-task-packet.json not found; skipping drift enforcement.",
    );
    return { exitCode: 0 };
  }

  if (result.driftFiles.length === 0) {
    console.log("[check-target-file-drift] OK");
    return { exitCode: 0 };
  }

  console.warn("[check-target-file-drift] drift detected:");
  result.driftFiles.forEach((filePath) => console.warn(`- ${filePath}`));

  if (STRICT_MODE) {
    console.error(
      "[check-target-file-drift] STRICT_TARGET_DRIFT=1, failing due to drift.",
    );
    return { exitCode: 1 };
  }

  return { exitCode: 0 };
};

const isExecutedDirectly =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isExecutedDirectly) {
  runTargetFileDriftCheck()
    .then(({ exitCode }) => process.exit(exitCode))
    .catch((error) => {
      console.error(
        "[check-target-file-drift] failed:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    });
}
