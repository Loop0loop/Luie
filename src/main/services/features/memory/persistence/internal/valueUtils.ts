export const toPlainRows = <T extends Record<string, unknown>>(
  rows: T[],
): Array<Record<string, unknown>> => rows.map((row) => ({ ...row }));

export const toStringValue = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

export const toNullableStringValue = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

export const toNumberValue = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const mapRows = <T>(
  rows: Array<Record<string, unknown>> | undefined,
  mapper: (row: Record<string, unknown>) => T | null,
): T[] => rows?.map(mapper).filter((row): row is T => row !== null) ?? [];

export const uniqueIds = (ids: string[]): string[] => Array.from(new Set(ids));

export const buildScopedMemoryId = (
  projectId: string,
  tableName: string,
  id: string,
): string => {
  const prefix = `${projectId}:${tableName}:`;
  return id.startsWith(prefix) ? id : `${prefix}${id}`;
};
