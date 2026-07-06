// ponytail: shallow-spread assembly can't extend an existing namespace (e.g.
// adding canvas.node.delete without dropping the rest of canvas.node), so
// supplemental key files are deep-merged in. Objects merge recursively; any
// other value (string/array) from the source overrides the target.
type Dict = Record<string, unknown>;

const isPlainObject = (value: unknown): value is Dict =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const deepMerge = <T extends Dict>(target: T, source: Dict): T => {
  const output: Dict = { ...target };
  for (const key of Object.keys(source)) {
    const src = source[key];
    const dst = output[key];
    output[key] =
      isPlainObject(dst) && isPlainObject(src) ? deepMerge(dst, src) : src;
  }
  return output as T;
};
