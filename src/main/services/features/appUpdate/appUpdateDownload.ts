import { app } from "electron";
import { createHash } from "node:crypto";
import * as fsp from "node:fs/promises";
import path from "node:path";
import type {
  AppUpdateArtifact,
  AppUpdateDownloadResult,
  AppUpdateState,
} from "../../../../shared/types/index.js";
import {
  UPDATE_DOWNLOAD_MAX_BYTES,
  UPDATE_FETCH_TIMEOUT_MS,
  type UpdateFeedManifest,
} from "./appUpdateFeedUtils.js";
import { pathExists } from "./appUpdateFsUtils.js";

type DownloadDependencies = {
  ensureManifestForDownload: () => Promise<UpdateFeedManifest>;
  getUpdateDir: () => string;
  getPendingMetaPath: () => string;
  getRollbackMetaPath: () => string;
  readArtifactFromMeta: (metaPath: string) => Promise<AppUpdateArtifact | null>;
  setState: (next: Partial<AppUpdateState>) => void;
};

export const runAppUpdateDownload = async ({
  ensureManifestForDownload,
  getUpdateDir,
  getPendingMetaPath,
  getRollbackMetaPath,
  readArtifactFromMeta,
  setState,
}: DownloadDependencies): Promise<AppUpdateDownloadResult> => {
  if (!app.isPackaged) {
    return {
      success: false,
      message: "UPDATE_DOWNLOAD_DISABLED_IN_DEV",
    };
  }

  let manifest: UpdateFeedManifest;
  try {
    manifest = await ensureManifestForDownload();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setState({ status: "error", message: `UPDATE_DOWNLOAD_FAILED:${message}` });
    return {
      success: false,
      message: `UPDATE_DOWNLOAD_FAILED:${message}`,
    };
  }

  setState({
    status: "downloading",
    latestVersion: manifest.version,
    message: "UPDATE_DOWNLOADING",
  });

  const updateDir = getUpdateDir();
  await fsp.mkdir(updateDir, { recursive: true });

  const artifactName = `luie-${manifest.version}-${Date.now()}.bin`;
  const tempPath = path.join(updateDir, `${artifactName}.part`);
  const finalPath = path.join(updateDir, artifactName);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPDATE_FETCH_TIMEOUT_MS * 4);
  let fileHandle: Awaited<ReturnType<typeof fsp.open>> | null = null;
  const response = await fetch(manifest.url, {
    method: "GET",
    signal: controller.signal,
  }).catch((error) => {
    throw new Error(`UPDATE_DOWNLOAD_REQUEST_FAILED:${String(error)}`);
  });
  if (!response.ok) {
    clearTimeout(timer);
    throw new Error(`UPDATE_DOWNLOAD_HTTP_${response.status}`);
  }
  const contentLengthRaw = response.headers.get("content-length");
  const contentLength =
    contentLengthRaw && Number.isFinite(Number(contentLengthRaw))
      ? Number(contentLengthRaw)
      : undefined;
  if (contentLength && contentLength > UPDATE_DOWNLOAD_MAX_BYTES) {
    clearTimeout(timer);
    throw new Error("UPDATE_DOWNLOAD_TOO_LARGE");
  }
  if (!response.body) {
    clearTimeout(timer);
    throw new Error("UPDATE_DOWNLOAD_BODY_MISSING");
  }

  try {
    const reader = response.body.getReader();
    const hash = createHash("sha256");
    let total = 0;
    fileHandle = await fsp.open(tempPath, "w");
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      const chunk = Buffer.from(value);
      total += chunk.length;
      if (total > UPDATE_DOWNLOAD_MAX_BYTES) {
        throw new Error("UPDATE_DOWNLOAD_TOO_LARGE");
      }
      hash.update(chunk);
      await fileHandle.write(chunk);
    }
    await fileHandle.close();
    fileHandle = null;
    clearTimeout(timer);

    if (manifest.size && manifest.size !== total) {
      throw new Error(`UPDATE_DOWNLOAD_SIZE_MISMATCH:${manifest.size}:${total}`);
    }
    const actualSha = hash.digest("hex");
    if (manifest.sha256 && actualSha !== manifest.sha256) {
      throw new Error("UPDATE_DOWNLOAD_HASH_MISMATCH");
    }

    await fsp.rename(tempPath, finalPath);
    const artifact: AppUpdateArtifact = {
      version: manifest.version,
      filePath: finalPath,
      sha256: actualSha,
      size: total,
      sourceUrl: manifest.url,
      downloadedAt: new Date().toISOString(),
    };

    const previousPending = await readArtifactFromMeta(getPendingMetaPath());
    if (previousPending?.filePath && previousPending.filePath !== artifact.filePath) {
      await fsp.rm(previousPending.filePath, { force: true }).catch(() => undefined);
    }
    const pendingMetaPath = getPendingMetaPath();
    const pendingMetaTempPath = `${pendingMetaPath}.tmp`;
    await fsp.writeFile(pendingMetaTempPath, JSON.stringify(artifact, null, 2), "utf-8");
    await fsp.rename(pendingMetaTempPath, pendingMetaPath);

    setState({
      status: "downloaded",
      latestVersion: artifact.version,
      artifact,
      message: "UPDATE_DOWNLOADED",
      rollbackAvailable: await pathExists(getRollbackMetaPath()),
    });

    return {
      success: true,
      message: "UPDATE_DOWNLOAD_OK",
      artifact,
    };
  } catch (error) {
    if (fileHandle) {
      await fileHandle.close().catch(() => undefined);
    }
    clearTimeout(timer);
    await fsp.rm(tempPath, { force: true }).catch(() => undefined);
    const message = error instanceof Error ? error.message : String(error);
    setState({
      status: "error",
      message: `UPDATE_DOWNLOAD_FAILED:${message}`,
    });
    return {
      success: false,
      message: `UPDATE_DOWNLOAD_FAILED:${message}`,
    };
  }
};
