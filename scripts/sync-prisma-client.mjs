import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const readPackageVersion = async (packageJsonPath) => {
  try {
    const raw = await fs.readFile(packageJsonPath, "utf-8");
    const parsed = JSON.parse(raw);
    return typeof parsed.version === "string" ? parsed.version : null;
  } catch {
    return null;
  }
};

const readPackageJson = async (packageJsonPath) => {
  const raw = await fs.readFile(packageJsonPath, "utf-8");
  return JSON.parse(raw);
};

const resolvePackageRootFromEntry = async (entryPath, packageName) => {
  let cursor = path.dirname(entryPath);
  const parsedEntryRoot = path.parse(cursor).root;

  while (cursor !== parsedEntryRoot) {
    const pkgJsonPath = path.join(cursor, "package.json");
    try {
      const parsed = await readPackageJson(pkgJsonPath);
      if (parsed?.name === packageName) {
        return cursor;
      }
    } catch {
      // Keep walking up until we find the package root.
    }
    cursor = path.dirname(cursor);
  }

  throw new Error(`Unable to resolve package root for ${packageName} from entry: ${entryPath}`);
};

const toNodeModulesTargetDir = (packageName) => {
  const segments = packageName.split("/");
  return path.resolve(process.cwd(), "node_modules", ...segments);
};

const syncPackageIfNeeded = async ({
  packageName,
  sourceDir,
  targetDir,
}) => {
  const sourcePackageJson = path.join(sourceDir, "package.json");
  const targetPackageJson = path.join(targetDir, "package.json");

  const sourceVersion = await readPackageVersion(sourcePackageJson);
  if (!sourceVersion) {
    throw new Error(`Source package not found: ${sourcePackageJson}`);
  }

  const targetVersion = await readPackageVersion(targetPackageJson);
  if (targetVersion === sourceVersion) {
    console.log(`[prisma-sync] ${packageName} already up-to-date (${sourceVersion})`);
    return;
  }

  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(path.dirname(targetDir), { recursive: true });
  await fs.cp(sourceDir, targetDir, { recursive: true });

  console.log(
    `[prisma-sync] synced ${packageName} ${targetVersion ?? "none"} -> ${sourceVersion}`,
  );
};

const syncPackageByResolvedEntry = async ({
  packageName,
  entryPath,
}) => {
  const realEntry = await fs.realpath(entryPath);
  const sourceDir = await resolvePackageRootFromEntry(realEntry, packageName);
  const targetDir = toNodeModulesTargetDir(packageName);
  await syncPackageIfNeeded({
    packageName,
    sourceDir,
    targetDir,
  });
};

const ensureSyncedPrismaClient = async () => {
  const entry = require.resolve("@prisma/client");
  const realEntry = await fs.realpath(entry);
  const sourceDir = path.resolve(path.dirname(realEntry), "../../.prisma/client");
  const targetDir = path.resolve(process.cwd(), "node_modules/.prisma/client");

  await syncPackageIfNeeded({
    packageName: "node_modules/.prisma/client",
    sourceDir,
    targetDir,
  });

  const clientRequire = createRequire(realEntry);
  const clientPackageJsonPath = path.join(path.dirname(realEntry), "package.json");
  const clientPackageJson = await readPackageJson(clientPackageJsonPath);
  const runtimeDependencies = Object.keys(clientPackageJson.dependencies ?? {});

  for (const dependencyName of runtimeDependencies) {
    const dependencyEntry = clientRequire.resolve(dependencyName);
    await syncPackageByResolvedEntry({
      packageName: dependencyName,
      entryPath: dependencyEntry,
    });
  }
};

const ensureSyncedBetterSqlite3RuntimeDeps = async () => {
  const betterSqlite3Entry = require.resolve("better-sqlite3/package.json");
  const betterSqlite3Require = createRequire(betterSqlite3Entry);

  const bindingsEntry = betterSqlite3Require.resolve("bindings");
  await syncPackageByResolvedEntry({
    packageName: "bindings",
    entryPath: bindingsEntry,
  });

  const bindingsRequire = createRequire(bindingsEntry);
  const fileUriToPathEntry = bindingsRequire.resolve("file-uri-to-path");
  await syncPackageByResolvedEntry({
    packageName: "file-uri-to-path",
    entryPath: fileUriToPathEntry,
  });
};

const main = async () => {
  await ensureSyncedPrismaClient();
  await ensureSyncedBetterSqlite3RuntimeDeps();
};

await main();
