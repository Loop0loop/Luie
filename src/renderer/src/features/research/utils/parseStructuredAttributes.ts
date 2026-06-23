export type StructuredAttributes = Record<string, unknown>;

export function parseStructuredAttributes(value: unknown): StructuredAttributes {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as StructuredAttributes;
      }
      return {};
    } catch {
      return {};
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as StructuredAttributes;
  }

  return {};
}
