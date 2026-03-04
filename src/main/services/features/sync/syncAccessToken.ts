import type { SyncSettings } from "../../../../shared/types/index.js";
import { settingsManager } from "../../../manager/settingsManager.js";
import { syncAuthService } from "./syncAuthService.js";

export const ensureSyncAccessToken = async (input: {
  syncSettings: SyncSettings;
  isAuthFatalMessage: (message: string) => boolean;
}): Promise<string> => {
  const maybePersistMigratedToken = (migratedCipher?: string) => {
    if (!migratedCipher) return;
    settingsManager.setSyncSettings({
      accessTokenCipher: migratedCipher,
    });
  };

  const expiresSoon = input.syncSettings.expiresAt
    ? Date.parse(input.syncSettings.expiresAt) <= Date.now() + 60_000
    : true;
  const accessTokenResult = syncAuthService.getAccessToken(input.syncSettings);
  if (accessTokenResult.errorCode && input.isAuthFatalMessage(accessTokenResult.errorCode)) {
    throw new Error(accessTokenResult.errorCode);
  }
  maybePersistMigratedToken(accessTokenResult.migratedCipher);
  let token = accessTokenResult.token;

  if (expiresSoon || !token) {
    const refreshTokenResult = syncAuthService.getRefreshToken(input.syncSettings);
    if (refreshTokenResult.errorCode && input.isAuthFatalMessage(refreshTokenResult.errorCode)) {
      throw new Error(refreshTokenResult.errorCode);
    }
    if (refreshTokenResult.migratedCipher) {
      settingsManager.setSyncSettings({
        refreshTokenCipher: refreshTokenResult.migratedCipher,
      });
    }
    if (!refreshTokenResult.token) {
      throw new Error("SYNC_AUTH_REFRESH_UNAVAILABLE");
    }

    const refreshed = await syncAuthService.refreshSession(input.syncSettings);
    const nextSettings = settingsManager.setSyncSettings({
      provider: refreshed.provider,
      userId: refreshed.userId,
      email: refreshed.email,
      expiresAt: refreshed.expiresAt,
      accessTokenCipher: refreshed.accessTokenCipher,
      refreshTokenCipher: refreshed.refreshTokenCipher,
    });
    const refreshedToken = syncAuthService.getAccessToken(nextSettings);
    if (refreshedToken.errorCode && input.isAuthFatalMessage(refreshedToken.errorCode)) {
      throw new Error(refreshedToken.errorCode);
    }
    maybePersistMigratedToken(refreshedToken.migratedCipher);
    token = refreshedToken.token;
  }

  if (!token) {
    throw new Error("SYNC_ACCESS_TOKEN_UNAVAILABLE");
  }
  return token;
};
