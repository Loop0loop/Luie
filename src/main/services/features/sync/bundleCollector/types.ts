import type { SyncBundle } from "../syncMapper.js";
import type { LoggerLike as LuieWriterLogger } from "../../../io/luiePackageTypes.js";

export type LoggerLike = LuieWriterLogger & {
  warn: (message: string, details?: unknown) => void;
};

export type WorldDocumentType =
  SyncBundle["worldDocuments"][number]["docType"];

export const toIsoString = (
  value: unknown,
  fallback = new Date().toISOString(),
): string => {
  if (typeof value === "string" && value.length > 0) return value;
  if (value instanceof Date) return value.toISOString();
  return fallback;
};

export const toNullableString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

export const toNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
