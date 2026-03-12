import {
  LUIE_PACKAGE_CONTAINER_DIR,
  LUIE_PACKAGE_FORMAT,
  LUIE_PACKAGE_VERSION,
  LUIE_PACKAGE_META_FILENAME,
} from "../../../shared/constants/index.js";
import { ErrorCode } from "../../../shared/constants/errorCode.js";
import { ServiceError } from "../../utils/serviceError.js";
import { readZipEntryContent } from "../../utils/luiePackage.js";
import type { LoggerLike } from "./luiePackageTypes.js";

const isCompatibleLuieVersion = (value: unknown): boolean => {
  if (typeof value === "number") return value === LUIE_PACKAGE_VERSION;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed === LUIE_PACKAGE_VERSION;
  }
  return false;
};

export const parseObjectJson = (raw: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // keep fallback
  }
  return null;
};

const toObjectRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const validateLuieMetaCompatibility = (
  meta: Record<string, unknown>,
  context: { source: string },
): void => {
  if (meta.format !== LUIE_PACKAGE_FORMAT) {
    throw new ServiceError(
      ErrorCode.FS_WRITE_FAILED,
      "Generated .luie package metadata format is invalid",
      { ...context, format: meta.format },
    );
  }
  if (meta.container !== LUIE_PACKAGE_CONTAINER_DIR) {
    throw new ServiceError(
      ErrorCode.FS_WRITE_FAILED,
      "Generated .luie package metadata container is invalid",
      { ...context, container: meta.container },
    );
  }
  if (!isCompatibleLuieVersion(meta.version)) {
    throw new ServiceError(
      ErrorCode.FS_WRITE_FAILED,
      "Generated .luie package metadata version is invalid",
      { ...context, version: meta.version },
    );
  }
};

export const normalizeLuieMetaForWrite = (
  input: unknown,
  options: {
    titleFallback: string;
    nowIso?: string;
    createdAtFallback?: string;
    containerLabel?: string;
    containerVersion?: number;
  },
): Record<string, unknown> => {
  const rawMeta = toObjectRecord(input);
  const nowIso = options.nowIso ?? new Date().toISOString();
  const createdAtFallback = options.createdAtFallback ?? nowIso;
  const containerLabel = options.containerLabel ?? LUIE_PACKAGE_CONTAINER_DIR;
  const containerVersion = options.containerVersion ?? LUIE_PACKAGE_VERSION;

  if (
    Object.prototype.hasOwnProperty.call(rawMeta, "format") &&
    rawMeta.format !== LUIE_PACKAGE_FORMAT
  ) {
    throw new ServiceError(
      ErrorCode.FS_WRITE_FAILED,
      "Luie metadata format is invalid",
      { format: rawMeta.format },
    );
  }
  if (
    Object.prototype.hasOwnProperty.call(rawMeta, "container") &&
    rawMeta.container !== containerLabel
  ) {
    throw new ServiceError(
      ErrorCode.FS_WRITE_FAILED,
      "Luie metadata container is invalid",
      { container: rawMeta.container },
    );
  }
  if (
    Object.prototype.hasOwnProperty.call(rawMeta, "version") &&
    !(
      (typeof rawMeta.version === "number" && rawMeta.version === containerVersion) ||
      (typeof rawMeta.version === "string" &&
        Number(rawMeta.version) === containerVersion)
    )
  ) {
    throw new ServiceError(
      ErrorCode.FS_WRITE_FAILED,
      "Luie metadata version is invalid",
      { version: rawMeta.version },
    );
  }

  const title =
    typeof rawMeta.title === "string" && rawMeta.title.trim().length > 0
      ? rawMeta.title
      : options.titleFallback;
  const createdAt =
    typeof rawMeta.createdAt === "string" && rawMeta.createdAt.length > 0
      ? rawMeta.createdAt
      : createdAtFallback;
  const updatedAt =
    typeof rawMeta.updatedAt === "string" && rawMeta.updatedAt.length > 0
      ? rawMeta.updatedAt
      : nowIso;

  return {
    ...rawMeta,
    format: LUIE_PACKAGE_FORMAT,
    container: containerLabel,
    version: containerVersion,
    title,
    createdAt,
    updatedAt,
  };
};

export const verifyLuieZipIntegrity = async (
  zipPath: string,
  logger: LoggerLike,
): Promise<void> => {
  const metaRaw = await readZipEntryContent(zipPath, LUIE_PACKAGE_META_FILENAME, logger);
  if (!metaRaw) {
    throw new ServiceError(
      ErrorCode.FS_WRITE_FAILED,
      "Generated .luie package is missing meta.json",
      { zipPath },
    );
  }

  const parsedMeta = parseObjectJson(metaRaw);
  if (!parsedMeta) {
    throw new ServiceError(
      ErrorCode.FS_WRITE_FAILED,
      "Generated .luie package metadata is invalid",
      { zipPath },
    );
  }
  validateLuieMetaCompatibility(parsedMeta, { source: zipPath });
};
