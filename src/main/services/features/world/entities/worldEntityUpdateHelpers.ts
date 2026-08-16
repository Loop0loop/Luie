export const parseStructuredAttributes = (
  value: unknown,
): Record<string, unknown> => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
};

export const mergeStructuredAttributes = (
  current: unknown,
  replacement?: Record<string, unknown>,
  patch?: Record<string, unknown>,
): Record<string, unknown> => ({
  ...parseStructuredAttributes(current),
  ...(replacement ?? {}),
  ...(patch ?? {}),
});
