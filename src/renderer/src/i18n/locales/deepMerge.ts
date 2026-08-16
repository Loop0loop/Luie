// ponytail: shallow spread는 기존 namespace를 덮어쓰므로 보충 locale만 재귀 병합한다.
// NOTE: locale override를 허용하려고 object가 아닌 source 값은 target을 덮어쓴다.
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
