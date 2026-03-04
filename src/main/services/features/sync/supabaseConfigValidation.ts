import type { RuntimeSupabaseConfig } from "../../../../shared/types/index.js";

export const trimAndUnquote = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const quoteWrapped =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  const normalized = quoteWrapped ? trimmed.slice(1, -1).trim() : trimmed;
  return normalized.length > 0 ? normalized : null;
};

export const normalizeSupabaseUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  try {
    const parsed = new URL(trimmed);
    // Supabase base URL must be project origin only.
    return parsed.origin;
  } catch {
    return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
  }
};

export const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const toValidHttpUrl = (value: string): string | null => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return normalizeSupabaseUrl(parsed.toString());
  } catch {
    return null;
  }
};

export const toSupabaseProjectId = (raw: string): string | null => {
  let value = raw.trim();
  if (!value) return null;

  if (isHttpUrl(value)) {
    try {
      value = new URL(value).hostname;
    } catch {
      return null;
    }
  }

  value = value.replace(/^https?:\/\//i, "");
  value = value.replace(/\/.*$/, "");
  if (value.endsWith(".supabase.co")) {
    value = value.slice(0, -".supabase.co".length);
  }
  if (value.includes(".")) {
    value = value.split(".")[0] ?? value;
  }
  if (!/^[a-z0-9-]+$/i.test(value)) {
    return null;
  }

  return value.toLowerCase();
};

export type RuntimeSupabaseConfigValidation = {
  valid: boolean;
  issues: string[];
  normalized?: RuntimeSupabaseConfig;
};

export const normalizeRuntimeSupabaseConfigInput = (
  input: Partial<RuntimeSupabaseConfig> | null | undefined,
): RuntimeSupabaseConfig | null => {
  if (!input) return null;
  const urlRaw = trimAndUnquote(input.url);
  const anonKeyRaw = trimAndUnquote(input.anonKey);
  if (!urlRaw || !anonKeyRaw) return null;

  const normalizedUrl = toValidHttpUrl(urlRaw);
  if (!normalizedUrl) return null;

  return {
    url: normalizedUrl,
    anonKey: anonKeyRaw,
  };
};

export const validateRuntimeSupabaseConfigInput = (
  input: Partial<RuntimeSupabaseConfig> | null | undefined,
): RuntimeSupabaseConfigValidation => {
  const issues: string[] = [];
  const urlRaw = trimAndUnquote(input?.url);
  const anonKeyRaw = trimAndUnquote(input?.anonKey);

  if (!urlRaw) {
    issues.push("SUPABASE_URL_REQUIRED");
  }
  if (!anonKeyRaw) {
    issues.push("SUPABASE_ANON_KEY_REQUIRED");
  }

  let normalizedUrl: string | null = null;
  if (urlRaw) {
    normalizedUrl = toValidHttpUrl(urlRaw);
    if (!normalizedUrl) {
      issues.push("SUPABASE_URL_INVALID");
    }
  }

  if (anonKeyRaw && anonKeyRaw.length < 16) {
    issues.push("SUPABASE_ANON_KEY_TOO_SHORT");
  }

  if (issues.length > 0 || !normalizedUrl || !anonKeyRaw) {
    return {
      valid: false,
      issues,
    };
  }

  return {
    valid: true,
    issues,
    normalized: {
      url: normalizedUrl,
      anonKey: anonKeyRaw,
    },
  };
};
