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

const ensureSyncedPrismaClient = async () => {
  const entry = require.resolve("@prisma/client");
  const realEntry = await fs.realpath(entry);
  const sourceDir = path.resolve(path.dirname(realEntry), "../../.prisma/client");
  const targetDir = path.resolve(process.cwd(), "node_modules/.prisma/client");

  const sourcePackageJson = path.join(sourceDir, "package.json");
  const targetPackageJson = path.join(targetDir, "package.json");

  const sourceVersion = await readPackageVersion(sourcePackageJson);
  if (!sourceVersion) {
    throw new Error(`Source Prisma client not found: ${sourcePackageJson}`);
  }

  const targetVersion = await readPackageVersion(targetPackageJson);
  if (targetVersion === sourceVersion) {
    console.log(`[prisma-sync] already up-to-date (${sourceVersion})`);
    return;
  }

  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(path.dirname(targetDir), { recursive: true });
  await fs.cp(sourceDir, targetDir, { recursive: true });

  console.log(
    `[prisma-sync] synced node_modules/.prisma/client ${targetVersion ?? "none"} -> ${sourceVersion}`,
  );
};

await ensureSyncedPrismaClient();
