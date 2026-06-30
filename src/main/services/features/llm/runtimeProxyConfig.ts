import { settingsManager } from "../../../domains/settings/index.js";
import { isAppPackaged } from "../../../utils/env/index.js";
import { getSupabaseConfig } from "../sync/supabaseEnv.js";
import { ensureSyncAccessToken } from "../sync/syncAccessToken.js";
import type { RuntimeSupabaseProxyResolver } from "./modelRuntimeClient.js";

const createSupabaseProxyResolver = (
  functionName: "openai-proxy" | "gemini-proxy",
): RuntimeSupabaseProxyResolver | undefined => {
  if (!isAppPackaged()) return undefined;
  return async () => {
    const supabaseConfig = getSupabaseConfig();
    if (!supabaseConfig) {
      throw new Error(
        "SUPABASE_NOT_CONFIGURED: 번들 빌드 환경에서는 동기화 계정 연결이 필요합니다. 설정 > 동기화 탭에서 계정을 연결해 주세요.",
      );
    }
    const syncSettings = settingsManager.getSyncSettings();
    const accessToken = await ensureSyncAccessToken({
      syncSettings,
      isAuthFatalMessage: () => false,
    });
    return {
      functionUrl: `${supabaseConfig.url}/functions/v1/${functionName}`,
      accessToken,
    };
  };
};

export const createOpenAiSupabaseProxyResolver = (): RuntimeSupabaseProxyResolver | undefined =>
  createSupabaseProxyResolver("openai-proxy");

export const createGeminiSupabaseProxyResolver = (): RuntimeSupabaseProxyResolver | undefined =>
  createSupabaseProxyResolver("gemini-proxy");
