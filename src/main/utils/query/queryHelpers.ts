import type { ServiceError } from "../error/index.js";

/**
 * Returns the first element of an array, or null if empty.
 * Use for optional lookups where "not found" is not an error.
 */
export function firstOrNull<T>(rows: T[]): T | null {
  return rows[0] ?? null;
}

/**
 * Returns the first element, or throws a ServiceError if empty.
 * Use for required lookups where "not found" should throw.
 */
export async function expectOne<T>(
  query: Promise<T[]>,
  errorFactory: () => ServiceError,
): Promise<T> {
  const rows = await query;
  const row = rows[0];
  if (!row) throw errorFactory();
  return row;
}

/**
 * Wraps a bulk insert to safely handle empty arrays.
 * Drizzle throws on `insert().values([])`.
 */
export async function insertMany<T>(
  insert: (values: T[]) => Promise<unknown>,
  values: T[],
): Promise<void> {
  if (values.length > 0) {
    await insert(values);
  }
}

/**
 * Escape LIKE special characters for SQLite.
 * Prevents % and _ from being interpreted as wildcards.
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
