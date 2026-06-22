import { api } from "@shared/api";
import {
  LUIE_PACKAGE_EXTENSION,
  LUIE_WORLD_DIR,
} from "@shared/constants";
import type { ReplicaWorldDocumentType } from "@shared/types";

const luieWriteQueue = new Map<string, Promise<void>>();

export const isLuieProjectPath = (
  projectPath?: string | null,
): projectPath is string =>
  Boolean(
    projectPath && projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION),
  );

const normalizeLuieQueueKey = (projectPath: string): string => {
  const trimmed = projectPath.trim();
  if (!trimmed) return projectPath;

  let normalized = trimmed.replace(/\\/g, "/");
  const hasUncPrefix = normalized.startsWith("//");
  const body = hasUncPrefix ? normalized.slice(2) : normalized;
  const collapsedBody = body.replace(/\/{2,}/g, "/");
  normalized = hasUncPrefix ? `//${collapsedBody}` : collapsedBody;

  const isPosixRoot = normalized === "/";
  const isWindowsDriveRoot = /^[a-zA-Z]:\/$/.test(normalized);
  if (!isPosixRoot && !isWindowsDriveRoot) {
    normalized = normalized.replace(/\/+$/, "");
  }

  if (/^[a-zA-Z]:\//.test(normalized)) {
    normalized = `${normalized.charAt(0).toLowerCase()}${normalized.slice(1)}`;
  }

  return normalized;
};

export const readLuieJson = async (
  projectPath: string,
  fileName: string,
): Promise<unknown | null> => {
  const response = await api.fs.readLuieEntry(
    projectPath,
    `${LUIE_WORLD_DIR}/${fileName}`,
  );
  if (!response.success) {
    await api.logger.warn("Failed to read .luie world entry", {
      projectPath,
      fileName,
      error: response.error,
    });
    return null;
  }
  if (!response.data) return null;
  try {
    return JSON.parse(response.data);
  } catch (error) {
    await api.logger.warn("Invalid .luie world JSON payload", {
      projectPath,
      fileName,
      error,
    });
    return null;
  }
};

export const writeLuieJson = async (
  projectPath: string,
  fileName: string,
  data: unknown,
) => {
  const queueKey = normalizeLuieQueueKey(projectPath);
  const previousWrite = luieWriteQueue.get(queueKey) ?? Promise.resolve();
  const nextWrite = previousWrite
    .catch(() => undefined)
    .then(async () => {
      const response = await api.fs.writeProjectFile(
        projectPath,
        `${LUIE_WORLD_DIR}/${fileName}`,
        JSON.stringify(data, null, 2),
      );
      if (!response.success) {
        const code = response.error?.code ?? "UNKNOWN_ERROR";
        const message =
          response.error?.message ?? "Failed to write .luie world entry";
        throw new Error(`LUIE_WRITE_FAILED:${fileName}:${code}:${message}`);
      }
    });
  luieWriteQueue.set(queueKey, nextWrite);

  try {
    await nextWrite;
  } finally {
    if (luieWriteQueue.get(queueKey) === nextWrite) {
      luieWriteQueue.delete(queueKey);
    }
  }
};

export const ensureLuieWorldDocumentSaved = async (
  projectId: string,
  projectPath: string,
  docType: Exclude<ReplicaWorldDocumentType, "graph">,
  fileName: string,
  payload: unknown,
): Promise<void> => {
  try {
    await writeLuieJson(projectPath, fileName, payload);
  } catch (error) {
    await api.logger.warn("Failed to persist canonical .luie world data", {
      projectId,
      projectPath,
      docType,
      fileName,
      error,
    });
    throw new Error(
      `Failed to persist ${docType} world data to canonical .luie.`,
      {
        cause: error,
      },
    );
  }
};
