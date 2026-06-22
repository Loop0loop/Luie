export type DbRow = Record<string, unknown>;

export const toNullableString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

export const toStringOrFallback = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.length > 0 ? value : fallback;

export const toIsoString = (
  value: unknown,
  fallback = new Date().toISOString(),
): string => {
  if (typeof value === "string" && value.length > 0) return value;
  if (value instanceof Date) return value.toISOString();
  return fallback;
};

export const toNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

export const isPlainObject = (
  value: unknown,
): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const parseJsonString = (value: string): unknown => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
};

export const normalizeJsonValue = (value: unknown): unknown => {
  if (typeof value === "string") {
    return parseJsonString(value);
  }
  return value ?? null;
};

export const normalizeToRow = (
  value: Record<string, unknown>,
): Record<string, unknown> => {
  const next: Record<string, unknown> = {};
  for (const [key, current] of Object.entries(value)) {
    if (current !== undefined) {
      next[key] = current;
    }
  }
  return next;
};
