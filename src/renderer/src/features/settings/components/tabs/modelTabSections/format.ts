import type { TFunction } from "i18next";

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
};

export const getModelTitle = (repoId: string): string => {
  const segments = repoId.split("/");
  return segments[segments.length - 1] ?? repoId;
};

export const getModelOwner = (repoId: string): string => repoId.split("/")[0] ?? "";

export const getFileProfile = (filename: string, t: TFunction): string => {
  const lower = filename.toLowerCase();
  if (lower.includes("q8")) return t("settings.localLlm.modelLibrary.profileQuality");
  if (lower.includes("q5")) return t("settings.localLlm.modelLibrary.profileBalanced");
  if (lower.includes("q4")) return t("settings.localLlm.modelLibrary.profileFast");
  return t("settings.localLlm.modelLibrary.profileStandard");
};

export const getInstalledModelName = (modelPath?: string): string => {
  if (!modelPath) return "";
  const normalized = modelPath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] ?? modelPath;
};
