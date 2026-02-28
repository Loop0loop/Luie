import fs from "node:fs/promises";
import path from "node:path";

const REQUIRED_RELATIVE_PATHS = [
  "node_modules/.prisma/client/index.js",
  "node_modules/.prisma/client/default.js",
  "node_modules/@prisma/client/default.js",
  "node_modules/@prisma/client/runtime/client.js",
  "node_modules/@prisma/client-runtime-utils/dist/index.js",
  "node_modules/bindings/bindings.js",
  "node_modules/file-uri-to-path/index.js",
];

const APP_FLAG = "--app";

const pathExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const parseAppPathArg = (argv) => {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === APP_FLAG) {
      const next = argv[i + 1];
      if (!next) {
        throw new Error(`Missing value for ${APP_FLAG}`);
      }
      return path.resolve(next);
    }
    if (arg.startsWith(`${APP_FLAG}=`)) {
      const value = arg.slice(`${APP_FLAG}=`.length);
      if (!value) {
        throw new Error(`Missing value for ${APP_FLAG}`);
      }
      return path.resolve(value);
    }
  }
  return null;
};

const collectCandidateApps = async (distDir) => {
  const candidates = [];

  if (!(await pathExists(distDir))) {
    return candidates;
  }

  const levelOne = await fs.readdir(distDir, { withFileTypes: true });
  for (const entry of levelOne) {
    const levelOnePath = path.join(distDir, entry.name);
    if (entry.isDirectory() && entry.name.endsWith(".app")) {
      candidates.push(levelOnePath);
      continue;
    }
    if (!entry.isDirectory()) {
      continue;
    }

    const levelTwo = await fs.readdir(levelOnePath, { withFileTypes: true });
    for (const child of levelTwo) {
      if (child.isDirectory() && child.name.endsWith(".app")) {
        candidates.push(path.join(levelOnePath, child.name));
      }
    }
  }

  return candidates;
};

const pickLatestAppBundle = async (appPaths) => {
  if (appPaths.length === 0) {
    return null;
  }

  const stats = await Promise.all(
    appPaths.map(async (appPath) => {
      const stat = await fs.stat(appPath);
      return { appPath, mtimeMs: stat.mtimeMs };
    }),
  );

  stats.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return stats[0]?.appPath ?? null;
};

const resolveAppBundlePath = async (argv) => {
  const explicitPath = parseAppPathArg(argv);
  if (explicitPath) {
    return explicitPath;
  }

  const cwd = process.cwd();
  const distDir = path.resolve(cwd, "dist");
  const defaultCandidates = [
    path.resolve(distDir, "mac-arm64", "Luie.app"),
    path.resolve(distDir, "mac", "Luie.app"),
    path.resolve(distDir, "Luie.app"),
  ];

  const discovered = await collectCandidateApps(distDir);
  const mergedCandidates = Array.from(new Set([...defaultCandidates, ...discovered]));
  const existingCandidates = [];

  for (const candidate of mergedCandidates) {
    if (await pathExists(candidate)) {
      existingCandidates.push(candidate);
    }
  }

  return await pickLatestAppBundle(existingCandidates);
};

const verifyPackagedPrisma = async (appBundlePath) => {
  if (!appBundlePath) {
    throw new Error(
      "Could not locate a packaged .app bundle in dist. Pass one explicitly with --app <path>.",
    );
  }

  if (!(await pathExists(appBundlePath))) {
    throw new Error(`App bundle does not exist: ${appBundlePath}`);
  }

  const resourcesPath = path.join(appBundlePath, "Contents", "Resources");
  const missing = [];

  for (const relativePath of REQUIRED_RELATIVE_PATHS) {
    const absolutePath = path.join(resourcesPath, relativePath);
    try {
      const stat = await fs.stat(absolutePath);
      if (!stat.isFile()) {
        missing.push(absolutePath);
      }
    } catch {
      missing.push(absolutePath);
    }
  }

  if (missing.length > 0) {
    console.error("[verify-packaged-prisma] Missing required Prisma runtime assets:");
    for (const missingPath of missing) {
      console.error(`- ${missingPath}`);
    }
    console.error(`[verify-packaged-prisma] Checked app bundle: ${appBundlePath}`);
    process.exit(1);
  }

  console.log(`[verify-packaged-prisma] Prisma assets are present in: ${appBundlePath}`);
  for (const relativePath of REQUIRED_RELATIVE_PATHS) {
    console.log(`- Contents/Resources/${relativePath}`);
  }
};

const main = async () => {
  const appBundlePath = await resolveAppBundlePath(process.argv.slice(2));
  await verifyPackagedPrisma(appBundlePath);
};

main().catch((error) => {
  console.error(`[verify-packaged-prisma] ${error.message}`);
  process.exit(1);
});
