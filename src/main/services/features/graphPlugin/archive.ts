import { createHash } from "node:crypto";
import * as fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yauzl from "yauzl";
import { graphPluginManifestSchema } from "../../../../shared/schemas/index.js";
import type { GraphPluginManifest } from "../../../../shared/types/index.js";
import { ErrorCode } from "../../../../shared/constants/index.js";
import { LuieWorldGraphSchema } from "../../core/project/projectLuieSchemas.js";
import { isSafeZipPath, normalizeZipPath } from "../../../utils/luiePackage.js";
import {
  createServiceError,
  isExecutableEntry,
  isHiddenPath,
  isPathInsideRoot,
  isSymlinkEntry,
  MAX_PLUGIN_ARCHIVE_BYTES,
  type GraphDocumentPayload,
  type LocalCatalogItem,
} from "./shared.js";

export const downloadPluginArchive = async (
  fetchImpl: typeof fetch,
  pluginRootDir: string,
  item: LocalCatalogItem,
  isPackaged: boolean,
): Promise<Buffer> => {
  const localPath =
    item.devAssetPath && !isPackaged
      ? path.resolve(pluginRootDir, item.devAssetPath)
      : item.assetUrl.startsWith("file://")
        ? fileURLToPath(item.assetUrl)
        : null;

  if (localPath) {
    const buffer = await fsp.readFile(localPath);
    if (buffer.byteLength > MAX_PLUGIN_ARCHIVE_BYTES) {
      throw createServiceError(
        ErrorCode.FS_READ_FAILED,
        "Graph plugin archive is too large",
        { pluginId: item.pluginId, size: buffer.byteLength },
      );
    }
    return buffer;
  }

  const response = await fetchImpl(item.assetUrl, { method: "GET" }).catch((error) => {
    throw createServiceError(
      ErrorCode.FS_READ_FAILED,
      "Failed to download graph plugin archive",
      { pluginId: item.pluginId, assetUrl: item.assetUrl },
      error,
    );
  });

  if (!response.ok) {
    throw createServiceError(
      ErrorCode.FS_READ_FAILED,
      `Graph plugin download failed with status ${response.status}`,
      { pluginId: item.pluginId, assetUrl: item.assetUrl, status: response.status },
    );
  }

  const raw = Buffer.from(await response.arrayBuffer());
  if (raw.byteLength > MAX_PLUGIN_ARCHIVE_BYTES) {
    throw createServiceError(
      ErrorCode.FS_READ_FAILED,
      "Graph plugin archive is too large",
      { pluginId: item.pluginId, size: raw.byteLength },
    );
  }
  if (item.size !== raw.byteLength) {
    throw createServiceError(
      ErrorCode.VALIDATION_FAILED,
      "Graph plugin archive size mismatch",
      { pluginId: item.pluginId, expected: item.size, actual: raw.byteLength },
    );
  }

  const digest = createHash("sha256").update(raw).digest("hex");
  if (digest !== item.sha256) {
    throw createServiceError(
      ErrorCode.VALIDATION_FAILED,
      "Graph plugin archive hash mismatch",
      { pluginId: item.pluginId, expected: item.sha256, actual: digest },
    );
  }

  return raw;
};

export const extractPluginArchive = async (
  buffer: Buffer,
  destinationRoot: string,
) => {
  await new Promise<void>((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (openError, zipFile) => {
      if (openError || !zipFile) {
        reject(
          createServiceError(
            ErrorCode.FS_READ_FAILED,
            "Failed to open graph plugin archive",
            undefined,
            openError,
          ),
        );
        return;
      }

      const onFailure = (error: unknown) => {
        zipFile.close();
        reject(error);
      };

      zipFile.on("entry", (entry) => {
        const normalized = normalizeZipPath(entry.fileName);
        if (
          !normalized ||
          !isSafeZipPath(normalized) ||
          isHiddenPath(normalized) ||
          path.isAbsolute(normalized)
        ) {
          onFailure(
            createServiceError(
              ErrorCode.VALIDATION_FAILED,
              "Unsafe graph plugin archive entry",
              { entry: entry.fileName },
            ),
          );
          return;
        }

        if (isSymlinkEntry(entry)) {
          onFailure(
            createServiceError(
              ErrorCode.VALIDATION_FAILED,
              "Graph plugin archive contains a symlink",
              { entry: entry.fileName },
            ),
          );
          return;
        }

        if (isExecutableEntry(entry)) {
          onFailure(
            createServiceError(
              ErrorCode.VALIDATION_FAILED,
              "Executable files are not allowed in V1 graph plugins",
              { entry: entry.fileName },
            ),
          );
          return;
        }

        const targetPath = path.resolve(destinationRoot, normalized);
        if (!isPathInsideRoot(targetPath, destinationRoot)) {
          onFailure(
            createServiceError(
              ErrorCode.VALIDATION_FAILED,
              "Graph plugin archive tried to escape extraction root",
              { entry: entry.fileName },
            ),
          );
          return;
        }

        if (entry.fileName.endsWith("/")) {
          fsp.mkdir(targetPath, { recursive: true })
            .then(() => zipFile.readEntry())
            .catch(onFailure);
          return;
        }

        zipFile.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) {
            onFailure(
              createServiceError(
                ErrorCode.FS_READ_FAILED,
                "Failed to read graph plugin archive entry",
                { entry: entry.fileName },
                streamError,
              ),
            );
            return;
          }

          const chunks: Buffer[] = [];
          let total = 0;
          stream.on("data", (chunk: Buffer) => {
            total += chunk.length;
            if (total > MAX_PLUGIN_ARCHIVE_BYTES) {
              stream.destroy(
                createServiceError(
                  ErrorCode.FS_READ_FAILED,
                  "Graph plugin archive entry is too large",
                  { entry: entry.fileName },
                ),
              );
              return;
            }
            chunks.push(chunk);
          });
          stream.on("error", onFailure);
          stream.on("end", () => {
            fsp.mkdir(path.dirname(targetPath), { recursive: true })
              .then(() => fsp.writeFile(targetPath, Buffer.concat(chunks)))
              .then(() => zipFile.readEntry())
              .catch(onFailure);
          });
        });
      });

      zipFile.on("end", resolve);
      zipFile.on("error", onFailure);
      zipFile.readEntry();
    });
  });
};

export const resolveExtractedPackageRoot = async (extractRoot: string) => {
  const directManifestPath = path.join(extractRoot, "plugin.json");
  try {
    await fsp.access(directManifestPath);
    return extractRoot;
  } catch {
    const children = await fsp.readdir(extractRoot, { withFileTypes: true });
    const candidate = await Promise.all(
      children
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const packageRoot = path.join(extractRoot, entry.name);
          try {
            await fsp.access(path.join(packageRoot, "plugin.json"));
            return packageRoot;
          } catch {
            return null;
          }
        }),
    ).then((items) => items.find(Boolean) ?? null);

    if (!candidate) {
      throw createServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Graph plugin archive does not contain a package root",
      );
    }

    return candidate;
  }
};

export const readPluginManifest = async (
  packageRoot: string,
): Promise<GraphPluginManifest> => {
  const raw = JSON.parse(await fsp.readFile(path.join(packageRoot, "plugin.json"), "utf-8"));
  const parsed = graphPluginManifestSchema.safeParse(raw);
  if (!parsed.success) {
    throw createServiceError(
      ErrorCode.VALIDATION_FAILED,
      "Invalid graph plugin manifest",
      { packageRoot, issues: parsed.error.issues },
      parsed.error,
    );
  }
  return parsed.data;
};

export const readGraphDocument = async (
  packageRoot: string,
  entryPath: string,
): Promise<GraphDocumentPayload> => {
  const normalized = normalizeZipPath(entryPath);
  if (!normalized || !isSafeZipPath(normalized) || isHiddenPath(normalized)) {
    throw createServiceError(
      ErrorCode.VALIDATION_FAILED,
      "Invalid graph template entry path",
      { entryPath },
    );
  }

  const fullPath = path.resolve(packageRoot, normalized);
  if (!isPathInsideRoot(fullPath, packageRoot)) {
    throw createServiceError(
      ErrorCode.VALIDATION_FAILED,
      "Graph template entry escaped package root",
      { entryPath },
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(await fsp.readFile(fullPath, "utf-8"));
  } catch (error) {
    throw createServiceError(
      ErrorCode.VALIDATION_FAILED,
      "Graph template JSON is invalid",
      { entryPath },
      error,
    );
  }

  const parsed = LuieWorldGraphSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw createServiceError(
      ErrorCode.VALIDATION_FAILED,
      "Graph template payload is invalid",
      { entryPath, issues: parsed.error.issues },
      parsed.error,
    );
  }
  return parsed.data;
};
