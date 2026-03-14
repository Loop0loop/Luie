import type { Dirent } from "node:fs";
import * as fsp from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { installedGraphPluginIndexSchema } from "../../../../shared/schemas/index.js";
import type { InstalledGraphPluginRecord, LocalCatalogItem } from "./shared.js";
import { createServiceError, localCatalogItemSchema } from "./shared.js";
import { ErrorCode } from "../../../../shared/constants/index.js";

export const createGraphPluginPaths = (pluginRootDir: string) => ({
  getRegistryPath: () => path.join(pluginRootDir, "registry", "catalog.json"),
  getInstalledRoot: () => path.join(pluginRootDir, "installed"),
  getInstalledIndexPath: () => path.join(pluginRootDir, "installed", "index.json"),
  getInstalledPluginDir: (pluginId: string) =>
    path.join(pluginRootDir, "installed", pluginId),
  getInstalledVersionDir: (pluginId: string, version: string) =>
    path.join(pluginRootDir, "installed", pluginId, version),
  getTempRoot: () => path.join(pluginRootDir, ".tmp"),
});

export const readJsonFile = async <T>(filePath: string, fallback?: T): Promise<T> => {
  try {
    const raw = await fsp.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code === "ENOENT" && fallback !== undefined) {
      return fallback;
    }
    throw error;
  }
};

export const readCatalog = async (registryPath: string): Promise<LocalCatalogItem[]> => {
  const raw = await readJsonFile(registryPath, []);
  const parsed = z.array(localCatalogItemSchema).safeParse(raw);
  if (!parsed.success) {
    throw createServiceError(
      ErrorCode.VALIDATION_FAILED,
      "Invalid graph plugin catalog",
      { issues: parsed.error.issues },
      parsed.error,
    );
  }
  return parsed.data;
};

export const readInstalledIndexValidated = async (
  indexPath: string,
  getInstalledVersionDir: (pluginId: string, version: string) => string,
): Promise<{ entries: InstalledGraphPluginRecord[]; changed: boolean }> => {
  const raw = await readJsonFile(indexPath, []);
  const parsed = installedGraphPluginIndexSchema.safeParse(raw);
  if (!parsed.success) {
    throw createServiceError(
      ErrorCode.VALIDATION_FAILED,
      "Invalid installed graph plugin index",
      { issues: parsed.error.issues },
      parsed.error,
    );
  }

  const manifestChecks = await Promise.all(
    parsed.data.map(async (entry) => {
      const manifestPath = path.join(
        getInstalledVersionDir(entry.pluginId, entry.version),
        "plugin.json",
      );
      try {
        await fsp.access(manifestPath);
        return entry;
      } catch {
        return null;
      }
    }),
  );

  const entries = manifestChecks.filter(
    (entry): entry is InstalledGraphPluginRecord => entry !== null,
  );

  return {
    entries,
    changed: entries.length !== parsed.data.length,
  };
};

export const writeInstalledIndex = async (
  installedRoot: string,
  indexPath: string,
  entries: InstalledGraphPluginRecord[],
) => {
  await fsp.mkdir(installedRoot, { recursive: true });
  const tempPath = `${indexPath}.tmp`;
  await fsp.writeFile(tempPath, JSON.stringify(entries, null, 2), "utf-8");
  await fsp.rename(tempPath, indexPath);
};

export const prepareTempDirectory = async (tempRoot: string) => {
  await fsp.mkdir(tempRoot, { recursive: true });
  return await fsp.mkdtemp(path.join(tempRoot, "install-"));
};

export const removeLegacyVersions = async (
  pluginDir: string,
  keepVersion: string,
) => {
  let entries: Dirent<string>[];
  try {
    entries = await fsp.readdir(pluginDir, {
      withFileTypes: true,
      encoding: "utf8",
    });
  } catch {
    return;
  }

  await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && entry.name !== keepVersion)
      .map((entry) =>
        fsp.rm(path.join(pluginDir, entry.name), {
          recursive: true,
          force: true,
        }),
      ),
  );
};
