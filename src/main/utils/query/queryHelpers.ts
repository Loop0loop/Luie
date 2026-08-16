/** `%`와 `_`가 wildcard로 해석되지 않도록 SQLite LIKE 입력을 escape한다. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
