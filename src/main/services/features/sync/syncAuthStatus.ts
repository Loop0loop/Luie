import type { SyncSettings } from "../../../../shared/types/index.js";
import { settingsManager } from "../../../manager/settingsManager.js";
import { syncAuthService } from "./syncAuthService.js";

const persistMigratedTokenCipher = (
  tokenType: "access" | "refresh",
  migratedCipher?: string,
): void => {
  if (!migratedCipher) return;
  settingsManager.setSyncSettings(
    tokenType === "access"
      ? { accessTokenCipher: migratedCipher }
      : { refreshTokenCipher: migratedCipher },
  );
};

export const resolveStartupAuthFailure = (
  syncSettings: SyncSettings,
  isAuthFatalMessage: (message: string) => boolean,
): string | null => {
  const accessTokenResult = syncAuthService.getAccessToken(syncSettings);
  if (accessTokenResult.errorCode && isAuthFatalMessage(accessTokenResult.errorCode)) {
    return accessTokenResult.errorCode;
  }
  persistMigratedTokenCipher("access", accessTokenResult.migratedCipher);

  const refreshTokenResult = syncAuthService.getRefreshToken(syncSettings);
  if (refreshTokenResult.errorCode && isAuthFatalMessage(refreshTokenResult.errorCode)) {
    return refreshTokenResult.errorCode;
  }
  persistMigratedTokenCipher("refresh", refreshTokenResult.migratedCipher);

  const hasRecoverableTokenPath =
    Boolean(accessTokenResult.token) || Boolean(refreshTokenResult.token);
  if (hasRecoverableTokenPath) return null;

  return (
    accessTokenResult.errorCode ??
    refreshTokenResult.errorCode ??
    "SYNC_ACCESS_TOKEN_UNAVAILABLE"
  );
};
