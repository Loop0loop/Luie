import type { RuntimeSupabaseConfig } from "../../../shared/types/index.js";
import { settingsManager } from "../../manager/settingsManager.js";
import {
  isHttpUrl,
  normalizeRuntimeSupabaseConfigInput,
  normalizeSupabaseUrl,
  toSupabaseProjectId,
  trimAndUnquote,
  validateRuntimeSupabaseConfigInput,
  type RuntimeSupabaseConfigValidation,
} from "./supabaseConfigValidation.js";

export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

export type SupabaseConfigSource = "env" | "runtime" | "legacy";

export type ResolvedSupabaseConfig = SupabaseConfig & {
  source: SupabaseConfigSource;
};

const trimEnv = (key: string): string | null => trimAndUnquote(process.env[key]);

const BUNDLED_DEFAULT_SUPABASE_URL = "https://qzgyjlbpnxxpspoyibpt.supabase.co";
const BUNDLED_DEFAULT_SUPABASE_ANON_KEY =
  "sb_publishable_tBNCOdvGzLgTuc6PUXI-Bg_qmt1FwYs";

const resolveFromBundledDefaults = (): ResolvedSupabaseConfig | null => {
  const bundled = normalizeRuntimeSupabaseConfigInput({
    url: BUNDLED_DEFAULT_SUPABASE_URL,
    anonKey: BUNDLED_DEFAULT_SUPABASE_ANON_KEY,
  });
  if (!bundled) return null;
  return {
    ...bundled,
    source: "legacy",
  };
};

const resolveFromEnv = (): ResolvedSupabaseConfig | null => {
  const envConfig = normalizeRuntimeSupabaseConfigInput({
    url: trimEnv("SUPABASE_URL") ?? trimEnv("SUPADB_URL") ?? undefined,
    anonKey:
      trimEnv("SUPABASE_ANON_KEY") ??
      trimEnv("SUPABASE_PUBLISHABLE_KEY") ??
      trimEnv("SUPADATABASE_API") ??
      undefined,
  });
  if (!envConfig) {
    return null;
  }
  return {
    ...envConfig,
    source: "env",
  };
};

const resolveFromRuntimeSettings = (): ResolvedSupabaseConfig | null => {
  const getter = (
    settingsManager as unknown as {
      getRuntimeSupabaseConfig?: () => RuntimeSupabaseConfig | undefined;
    }
  ).getRuntimeSupabaseConfig;
  if (typeof getter !== "function") {
    return null;
  }

  const runtime = getter.call(settingsManager);
  const normalized = normalizeRuntimeSupabaseConfigInput(runtime);
  if (!normalized) {
    return null;
  }
  return {
    ...normalized,
    source: "runtime",
  };
};

const resolveFromLegacyEnv = (): ResolvedSupabaseConfig | null => {
  const supadatabaseApi = trimEnv("SUPADATABASE_API");
  const projectIdRaw = trimEnv("SUPADATABASE_PRJ_ID");

  let url: string | null = null;
  let anonKey: string | null = null;

  if (supadatabaseApi && isHttpUrl(supadatabaseApi)) {
    url = normalizeSupabaseUrl(supadatabaseApi);
  } else if (projectIdRaw) {
    const projectId = toSupabaseProjectId(projectIdRaw);
    if (projectId) {
      url = `https://${projectId}.supabase.co`;
    }
  }

  if (supadatabaseApi && !isHttpUrl(supadatabaseApi)) {
    anonKey = supadatabaseApi;
  }

  if (!url || !anonKey) {
    return null;
  }

  return {
    url,
    anonKey,
    source: "legacy",
  };
};

export const getResolvedSupabaseConfig = (): ResolvedSupabaseConfig | null =>
  resolveFromEnv() ??
  resolveFromRuntimeSettings() ??
  resolveFromLegacyEnv() ??
  resolveFromBundledDefaults();

export const getSupabaseConfig = (): SupabaseConfig | null => {
  const config = getResolvedSupabaseConfig();
  if (!config) return null;
  return {
    url: config.url,
    anonKey: config.anonKey,
  };
};

export const getSupabaseConfigOrThrow = (): SupabaseConfig => {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error(
      "SUPABASE_NOT_CONFIGURED: runtime configuration is not completed. Set Supabase URL/Anon Key in Startup Wizard or sync settings.",
    );
  }
  return config;
};

export const getSupabaseConfigSource = (): SupabaseConfigSource | null =>
  getResolvedSupabaseConfig()?.source ?? null;

export const getRuntimeSupabaseConfig = (): RuntimeSupabaseConfig | null =>
  normalizeRuntimeSupabaseConfigInput(resolveFromRuntimeSettings()) ?? null;

export const setRuntimeSupabaseConfig = (
  input: RuntimeSupabaseConfig,
): RuntimeSupabaseConfigValidation => {
  const validation = validateRuntimeSupabaseConfigInput(input);
  if (!validation.valid || !validation.normalized) {
    return validation;
  }
  const setter = (
    settingsManager as unknown as {
      setRuntimeSupabaseConfig?: (input: RuntimeSupabaseConfig) => unknown;
    }
  ).setRuntimeSupabaseConfig;
  if (typeof setter === "function") {
    setter.call(settingsManager, validation.normalized);
  }
  return validation;
};

export const validateRuntimeSupabaseConfig = (
  input: Partial<RuntimeSupabaseConfig> | null | undefined,
): RuntimeSupabaseConfigValidation => validateRuntimeSupabaseConfigInput(input);
