import * as fsp from "node:fs/promises";
import type { AppUpdateArtifact } from "../../../../shared/types/index.js";
import { normalizeSha256 } from "./appUpdateFeedUtils.js";

export const isSafeArtifact = (value: unknown): value is AppUpdateArtifact => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const source = value as Record<string, unknown>;
  return (
    typeof source.version === "string" &&
    source.version.length > 0 &&
    typeof source.filePath === "string" &&
    source.filePath.length > 0 &&
    typeof source.sha256 === "string" &&
    Boolean(normalizeSha256(source.sha256)) &&
    typeof source.size === "number" &&
    Number.isFinite(source.size) &&
    source.size >= 0 &&
    typeof source.sourceUrl === "string" &&
    source.sourceUrl.length > 0 &&
    typeof source.downloadedAt === "string" &&
    source.downloadedAt.length > 0
  );
};

export const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await fsp.access(targetPath);
    return true;
  } catch {
    return false;
  }
};
