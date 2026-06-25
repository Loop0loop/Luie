/**
 * Escape LIKE special characters for SQLite.
 * Prevents % and _ from being interpreted as wildcards.
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
