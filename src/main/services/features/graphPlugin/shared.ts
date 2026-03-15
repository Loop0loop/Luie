import type { Dirent } from "node:fs";
import path from "node:path";
import type yauzl from "yauzl";
import { z } from "zod";
import { APP_VERSION, ErrorCode } from "../../../../shared/constants/index.js";
import {
  graphPluginCatalogItemSchema,
} from "../../../../shared/schemas/index.js";
import type { installedGraphPluginIndexSchema } from "../../../../shared/schemas/index.js";
import type {
  GraphPluginCatalogItem,
  GraphPluginManifest,
} from "../../../../shared/types/index.js";
import type { LuieWorldGraphSchema } from "../../core/project/projectLuieSchemas.js";
import type { worldReplicaService } from "../worldReplicaService.js";
import { ServiceError } from "../../../utils/serviceError.js";

export const GRAPH_PLUGIN_API_VERSION = "1.0.0";
export const MAX_PLUGIN_ARCHIVE_BYTES = 64 * 1024 * 1024;
export const BLOCKED_PLUGIN_EXTENSIONS = new Set([
  ".js",
  ".cjs",
  ".mjs",
  ".node",
  ".exe",
  ".bat",
  ".cmd",
  ".ps1",
  ".sh",
  ".dll",
  ".so",
  ".dylib",
]);

export const localCatalogItemSchema = graphPluginCatalogItemSchema.extend({
  devAssetPath: z.string().min(1).optional(),
});

export type LocalCatalogItem = z.infer<typeof localCatalogItemSchema>;
export type InstalledGraphPluginRecord = z.infer<
  typeof installedGraphPluginIndexSchema
>[number];
export type GraphDocumentPayload = z.infer<typeof LuieWorldGraphSchema>;

export type GraphPluginServiceDependencies = {
  fetchImpl?: typeof fetch;
  pluginRootDir?: string;
  now?: () => Date;
  worldReplicaService?: Pick<typeof worldReplicaService, "setDocument">;
  applyGraphTemplate?: (
    projectId: string,
    graphPayload: GraphDocumentPayload,
  ) => Promise<void>;
};

export const compareVersionPart = (left: string, right: string): number => {
  const leftParts = left.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = right.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const maxLength = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < maxLength; index += 1) {
    const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

export const hasMatchingApiMajor = (expected: string, actual: string) =>
  expected.split(".")[0] === actual.split(".")[0];

export const isPathInsideRoot = (targetPath: string, rootPath: string) => {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedRoot = path.resolve(rootPath);
  return (
    resolvedTarget === resolvedRoot ||
    resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)
  );
};

export const isHiddenPath = (normalizedPath: string) =>
  normalizedPath.split("/").some((segment) => segment.startsWith("."));

export const isSymlinkEntry = (entry: yauzl.Entry) => {
  const mode = (entry.externalFileAttributes >>> 16) & 0xffff;
  return (mode & 0o170000) === 0o120000;
};

export const isExecutableEntry = (entry: yauzl.Entry) => {
  const mode = (entry.externalFileAttributes >>> 16) & 0xffff;
  if ((mode & 0o111) !== 0) return true;
  return BLOCKED_PLUGIN_EXTENSIONS.has(path.extname(entry.fileName).toLowerCase());
};

export const sanitizeCatalogItem = (
  value: LocalCatalogItem,
): GraphPluginCatalogItem => ({
  pluginId: value.pluginId,
  version: value.version,
  name: value.name,
  summary: value.summary,
  releaseTag: value.releaseTag,
  assetUrl: value.assetUrl,
  sha256: value.sha256,
  size: value.size,
  minAppVersion: value.minAppVersion,
  apiVersion: value.apiVersion,
});

export const createServiceError = (
  code: (typeof ErrorCode)[keyof typeof ErrorCode],
  message: string,
  details?: Record<string, unknown>,
  cause?: unknown,
) => new ServiceError(code, message, details, cause);

export const assertCatalogCompatibility = (item: LocalCatalogItem) => {
  if (compareVersionPart(APP_VERSION, item.minAppVersion) < 0) {
    throw createServiceError(
      ErrorCode.VALIDATION_FAILED,
      "App version is below graph plugin minimum version",
      {
        appVersion: APP_VERSION,
        minAppVersion: item.minAppVersion,
        pluginId: item.pluginId,
      },
    );
  }

  if (!hasMatchingApiMajor(item.apiVersion, GRAPH_PLUGIN_API_VERSION)) {
    throw createServiceError(
      ErrorCode.VALIDATION_FAILED,
      "Graph plugin apiVersion is not supported",
      { pluginId: item.pluginId, apiVersion: item.apiVersion },
    );
  }
};

export const assertManifestMatchesCatalog = (
  item: LocalCatalogItem,
  manifest: GraphPluginManifest,
) => {
  if (manifest.id !== item.pluginId || manifest.version !== item.version) {
    throw createServiceError(
      ErrorCode.VALIDATION_FAILED,
      "Graph plugin manifest does not match catalog entry",
      {
        pluginId: item.pluginId,
        manifestId: manifest.id,
        catalogVersion: item.version,
        manifestVersion: manifest.version,
      },
    );
  }

  if (!hasMatchingApiMajor(manifest.apiVersion, item.apiVersion)) {
    throw createServiceError(
      ErrorCode.VALIDATION_FAILED,
      "Graph plugin manifest apiVersion does not match catalog",
      {
        pluginId: item.pluginId,
        manifestApiVersion: manifest.apiVersion,
        catalogApiVersion: item.apiVersion,
      },
    );
  }
};

export type PluginRepositoryPaths = {
  getRegistryPath: () => string;
  getInstalledRoot: () => string;
  getInstalledIndexPath: () => string;
  getInstalledPluginDir: (pluginId: string) => string;
  getInstalledVersionDir: (pluginId: string, version: string) => string;
};

export type PluginDirEntries = Dirent<string>[];
