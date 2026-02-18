export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

const trimEnv = (key: string): string | null => {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : null;
};

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const normalizeUrl = (value: string): string =>
  value.endsWith("/") ? value.slice(0, -1) : value;

const toProjectId = (raw: string): string | null => {
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

const resolveUrl = (): string | null => {
  const explicitUrl = trimEnv("SUPABASE_URL");
  if (explicitUrl) {
    return normalizeUrl(explicitUrl);
  }

  const supadatabaseApi = trimEnv("SUPADATABASE_API");
  if (supadatabaseApi && isHttpUrl(supadatabaseApi)) {
    return normalizeUrl(supadatabaseApi);
  }

  const projectIdRaw = trimEnv("SUPADATABASE_PRJ_ID");
  if (!projectIdRaw) return null;
  const projectId = toProjectId(projectIdRaw);
  if (!projectId) return null;
  return `https://${projectId}.supabase.co`;
};

const resolveAnonKey = (): string | null => {
  const explicitKey = trimEnv("SUPABASE_ANON_KEY");
  if (explicitKey) {
    return explicitKey;
  }

  const supadatabaseApi = trimEnv("SUPADATABASE_API");
  if (supadatabaseApi && !isHttpUrl(supadatabaseApi)) {
    return supadatabaseApi;
  }

  return null;
};

export const getSupabaseConfig = (): SupabaseConfig | null => {
  const url = resolveUrl();
  const anonKey = resolveAnonKey();
  if (!url || !anonKey) {
    return null;
  }
  return { url, anonKey };
};

export const getSupabaseConfigOrThrow = (): SupabaseConfig => {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error(
      "SUPABASE_NOT_CONFIGURED: set SUPABASE_URL/SUPABASE_ANON_KEY or SUPADATABASE_PRJ_ID/SUPADATABASE_API",
    );
  }
  return config;
};
