#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

const executablePath = process.argv[2];
if (!executablePath) {
  console.error("Usage: node smoke-packaged-database.mjs <appExecutable>");
  process.exit(1);
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "luie-packaged-db-"));
const userDataPath = path.join(root, "user-data");
const mainDbPath = path.join(root, "main.db");
const cacheDbPath = path.join(root, "cache.db");
fs.mkdirSync(userDataPath, { recursive: true });

const child = spawn(path.resolve(executablePath), [`--user-data-dir=${userDataPath}`], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    E2E_DISABLE_SINGLE_INSTANCE: "1",
    LUIE_DISABLE_SYNC: "1",
    LUIE_USER_DATA_PATH: userDataPath,
    LUIE_RUNTIME_DATABASE_URL: `file:${mainDbPath}`,
    LUIE_RUNTIME_CACHE_DATABASE_URL: `file:${cacheDbPath}`,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
let childExit = null;
child.stderr.on("data", (chunk) => (stderr += chunk));
child.once("exit", (code, signal) => (childExit = { code, signal }));

const deadline = Date.now() + 20_000;
while (
  Date.now() < deadline &&
  childExit === null &&
  (!fs.existsSync(mainDbPath) || !fs.existsSync(cacheDbPath))
) {
  await new Promise((resolve) => setTimeout(resolve, 100));
}

let succeeded = false;
try {
  if (childExit !== null) {
    throw new Error(`packaged app exited before DB startup: ${JSON.stringify(childExit)}\n${stderr}`);
  }
  if (!fs.existsSync(mainDbPath) || !fs.existsSync(cacheDbPath)) {
    throw new Error(`packaged DB startup timed out\n${stderr}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 1_000));

  const readTables = (databasePath) => {
    const database = new Database(databasePath, { readonly: true });
    try {
      return database
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
        .all()
        .map((row) => row.name);
    } finally {
      database.close();
    }
  };
  const mainTables = readTables(mainDbPath);
  const cacheTables = readTables(cacheDbPath);

  for (const table of ["Chapter", "ChapterBody", "Project", "__drizzle_migrations"]) {
    if (!mainTables.includes(table)) throw new Error(`main table missing: ${table}`);
  }
  for (const table of [
    "ChapterSearchDocument",
    "ChapterSearchDocumentFts",
    "CharacterAppearance",
    "TermAppearance",
  ]) {
    if (!cacheTables.includes(table)) throw new Error(`cache table missing: ${table}`);
  }

  console.log(
    JSON.stringify(
      {
        mainDbBytes: fs.statSync(mainDbPath).size,
        cacheDbBytes: fs.statSync(cacheDbPath).size,
        mainTableCount: mainTables.length,
        cacheTableCount: cacheTables.length,
        ftsCreated: cacheTables.includes("ChapterSearchDocumentFts"),
      },
      null,
      2,
    ),
  );
  succeeded = true;
} finally {
  if (childExit === null) child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  if (succeeded) fs.rmSync(root, { recursive: true, force: true });
  else console.error(`preserved failure directory: ${root}`);
}
