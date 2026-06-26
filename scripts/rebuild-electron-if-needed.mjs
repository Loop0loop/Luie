import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const readPackage = (name) => {
  const packagePath = require.resolve(`${name}/package.json`);
  return {
    dir: dirname(packagePath),
    version: JSON.parse(readFileSync(packagePath, "utf8")).version,
  };
};

const electron = readPackage("electron");
const betterSqlite = readPackage("better-sqlite3");
const electronAbi = readFileSync(join(electron.dir, "abi_version"), "utf8").trim();
const releaseDir = join(betterSqlite.dir, "build", "Release");
const binaryPath = join(releaseDir, "better_sqlite3.node");
const forgeMetaPath = join(releaseDir, ".forge-meta");
const expectedForgeMeta = `${process.arch}--${electronAbi}`;

const hasMatchingBuild =
  existsSync(binaryPath) &&
  existsSync(forgeMetaPath) &&
  readFileSync(forgeMetaPath, "utf8").trim() === expectedForgeMeta;

if (hasMatchingBuild) {
  console.log(
    `electron-rebuild skipped: better-sqlite3 ${betterSqlite.version} already targets Electron ${electron.version} ABI ${electronAbi}`,
  );
  process.exit(0);
}

console.log(
  `electron-rebuild required: better-sqlite3 ${betterSqlite.version}, Electron ${electron.version} ABI ${electronAbi}`,
);

const result = spawnSync(
  "pnpm",
  [
    "exec",
    "electron-rebuild",
    "--force",
    "-w",
    "better-sqlite3",
    "--build-from-source",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      CXXFLAGS:
        "-std=c++20 -DV8_ENABLE_SANDBOX=1 -DV8_31BIT_SMIS_ON_64BIT_ARCH=1",
    },
  },
);

process.exit(result.status ?? 1);
