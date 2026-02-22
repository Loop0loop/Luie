import { createHash, randomBytes } from "node:crypto";
import { safeStorage, shell } from "electron";
import { createLogger } from "../../../shared/logger/index.js";
import type { SyncProvider, SyncSettings } from "../../../shared/types/index.js";
import { settingsManager } from "../../manager/settingsManager.js";
import {
  getSupabaseConfig,
  getSupabaseConfigOrThrow,
} from "./supabaseEnv.js";

const logger = createLogger("SyncAuthService");

const OAUTH_REDIRECT_URI = "luie://auth/callback";
const TOKEN_CODEC_SAFE_PREFIX = "v2:safe:";
const TOKEN_CODEC_PLAIN_PREFIX = "v2:plain:";

type PendingPkce = {
  state: string;
  verifier: string;
  createdAt: number;
};

type SupabaseTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: {
    id?: string;
    email?: string;
  };
};

type SyncSession = {
  provider: SyncProvider;
  userId: string;
  email?: string;
  expiresAt?: string;
  accessTokenCipher: string;
  refreshTokenCipher: string;
};

type AccessTokenResult = {
  token: string | null;
  migratedCipher?: string;
};

type DecodedSecret = {
  plain: string;
  migratedCipher?: string;
};

const toBase64Url = (value: Buffer): string =>
  value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const createCodeVerifier = (): string => toBase64Url(randomBytes(48));

const createCodeChallenge = (verifier: string): string =>
  toBase64Url(createHash("sha256").update(verifier).digest());

const encryptSecret = (plain: string): string => {
  if (safeStorage.isEncryptionAvailable()) {
    const cipher = safeStorage.encryptString(plain).toString("base64");
    return `${TOKEN_CODEC_SAFE_PREFIX}${cipher}`;
  }
  const cipher = Buffer.from(plain, "utf-8").toString("base64");
  return `${TOKEN_CODEC_PLAIN_PREFIX}${cipher}`;
};

const decodeLegacySecret = (legacyCipher: string): DecodedSecret => {
  const payload = Buffer.from(legacyCipher, "base64");
  if (safeStorage.isEncryptionAvailable()) {
    try {
      const plain = safeStorage.decryptString(payload);
      return {
        plain,
        migratedCipher: encryptSecret(plain),
      };
    } catch {
      // Legacy fallback can be plain base64 text.
    }
  }
  const plain = payload.toString("utf-8");
  return {
    plain,
    migratedCipher: encryptSecret(plain),
  };
};

const decodeSecret = (cipher: string): DecodedSecret => {
  if (cipher.startsWith(TOKEN_CODEC_SAFE_PREFIX)) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("SYNC_TOKEN_SECURE_STORAGE_UNAVAILABLE");
    }
    const raw = cipher.slice(TOKEN_CODEC_SAFE_PREFIX.length);
    const payload = Buffer.from(raw, "base64");
    try {
      return {
        plain: safeStorage.decryptString(payload),
      };
    } catch (error) {
      throw new Error(
        `SYNC_TOKEN_DECRYPT_FAILED:${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (cipher.startsWith(TOKEN_CODEC_PLAIN_PREFIX)) {
    const raw = cipher.slice(TOKEN_CODEC_PLAIN_PREFIX.length);
    const payload = Buffer.from(raw, "base64");
    return {
      plain: payload.toString("utf-8"),
    };
  }

  return decodeLegacySecret(cipher);
};

class SyncAuthService {
  private pendingPkce: PendingPkce | null = null;
  private readonly pendingTtlMs = 10 * 60 * 1000;
  private readonly pendingReplaceGuardMs = 15 * 1000;

  private clearPendingPkce(): void {
    this.pendingPkce = null;
    settingsManager.clearPendingSyncAuth();
  }

  private storePendingPkce(pending: PendingPkce): void {
    this.pendingPkce = pending;
    settingsManager.setPendingSyncAuth({
      state: pending.state,
      verifierCipher: encryptSecret(pending.verifier),
      createdAt: new Date(pending.createdAt).toISOString(),
    });
  }

  private getPendingPkceFromSettings(): PendingPkce | null {
    const syncSettings = settingsManager.getSyncSettings();
    if (
      !syncSettings.pendingAuthState ||
      !syncSettings.pendingAuthVerifierCipher ||
      !syncSettings.pendingAuthCreatedAt
    ) {
      return null;
    }

    const createdAt = Date.parse(syncSettings.pendingAuthCreatedAt);
    if (!Number.isFinite(createdAt)) {
      this.clearPendingPkce();
      return null;
    }

    try {
      const decoded = decodeSecret(syncSettings.pendingAuthVerifierCipher);
      if (decoded.migratedCipher) {
        settingsManager.setPendingSyncAuth({
          state: syncSettings.pendingAuthState,
          verifierCipher: decoded.migratedCipher,
          createdAt: syncSettings.pendingAuthCreatedAt,
        });
      }
      return {
        state: syncSettings.pendingAuthState,
        verifier: decoded.plain,
        createdAt,
      };
    } catch (error) {
      logger.warn("Failed to decode pending OAuth verifier", { error });
      this.clearPendingPkce();
      return null;
    }
  }

  private getPendingPkce(): PendingPkce | null {
    if (this.pendingPkce) {
      return this.pendingPkce;
    }
    const restored = this.getPendingPkceFromSettings();
    if (restored) {
      this.pendingPkce = restored;
      return restored;
    }
    return null;
  }

  private getActivePendingPkce(): PendingPkce | null {
    const pending = this.getPendingPkce();
    if (!pending) return null;
    const isExpired = Date.now() - pending.createdAt > this.pendingTtlMs;
    if (isExpired) {
      this.clearPendingPkce();
      return null;
    }
    return pending;
  }

  hasPendingAuthFlow(): boolean {
    return this.getActivePendingPkce() !== null;
  }

  isConfigured(): boolean {
    try {
      getSupabaseConfig();
      return true;
    } catch {
      return false;
    }
  }

  async startGoogleAuth(): Promise<void> {
    const pending = this.getActivePendingPkce();
    if (pending) {
      const ageMs = Date.now() - pending.createdAt;
      if (ageMs < this.pendingReplaceGuardMs) {
        throw new Error("SYNC_AUTH_FLOW_IN_PROGRESS");
      }
      logger.info("Replacing existing OAuth flow with a new request", { ageMs });
    }

    const { url } = getSupabaseConfigOrThrow();
    const verifier = createCodeVerifier();
    const challenge = createCodeChallenge(verifier);
    const state = toBase64Url(randomBytes(24));
    this.storePendingPkce({
      state,
      verifier,
      createdAt: Date.now(),
    });

    const authorizeUrl = new URL(`${url}/auth/v1/authorize`);
    authorizeUrl.searchParams.set("provider", "google");
    authorizeUrl.searchParams.set("redirect_to", OAUTH_REDIRECT_URI);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("code_challenge", challenge);
    authorizeUrl.searchParams.set("code_challenge_method", "s256");

    await shell.openExternal(authorizeUrl.toString());
  }

  async completeOAuthCallback(callbackUrl: string): Promise<SyncSession> {
    const pending = this.getPendingPkce();
    if (!pending) {
      throw new Error("SYNC_AUTH_NO_PENDING_SESSION");
    }
    if (Date.now() - pending.createdAt > this.pendingTtlMs) {
      this.clearPendingPkce();
      throw new Error("SYNC_AUTH_REQUEST_EXPIRED");
    }

    const parsed = new URL(callbackUrl);
    const state = parsed.searchParams.get("state");
    const code = parsed.searchParams.get("code");
    const error = parsed.searchParams.get("error");
    const errorCode = parsed.searchParams.get("error_code");
    const errorDescription = parsed.searchParams.get("error_description");

    if (error) {
      this.clearPendingPkce();
      const normalizedErrorCode = errorCode ?? error;
      const normalizedDescription = errorDescription ?? error;
      throw new Error(
        `SYNC_AUTH_CALLBACK_ERROR:${normalizedErrorCode}:${normalizedDescription}`,
      );
    }
    if (!code) {
      this.clearPendingPkce();
      throw new Error("SYNC_AUTH_CODE_MISSING");
    }
    if (!state || state !== pending.state) {
      this.clearPendingPkce();
      throw new Error("SYNC_AUTH_STATE_MISMATCH");
    }

    const token = await this.exchangeCodeForSession(code, pending.verifier);
    this.clearPendingPkce();
    return token;
  }

  async refreshSession(syncSettings: SyncSettings): Promise<SyncSession> {
    if (!syncSettings.refreshTokenCipher || !syncSettings.userId) {
      throw new Error("SYNC_AUTH_REFRESH_UNAVAILABLE");
    }
    const refreshToken = decodeSecret(syncSettings.refreshTokenCipher).plain;
    const token = await this.exchangeRefreshToken(refreshToken);
    return token;
  }

  getAccessToken(syncSettings: SyncSettings): AccessTokenResult {
    if (!syncSettings.accessTokenCipher) {
      return { token: null };
    }
    try {
      const decoded = decodeSecret(syncSettings.accessTokenCipher);
      return {
        token: decoded.plain,
        migratedCipher: decoded.migratedCipher,
      };
    } catch (error) {
      logger.warn("Failed to decrypt sync access token", { error });
      return { token: null };
    }
  }

  private async exchangeCodeForSession(code: string, verifier: string): Promise<SyncSession> {
    const { url, anonKey } = getSupabaseConfigOrThrow();
    const response = await fetch(`${url}/auth/v1/token?grant_type=pkce`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_code: code,
        code_verifier: verifier,
        redirect_uri: OAUTH_REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`SYNC_AUTH_EXCHANGE_FAILED:${response.status}:${body}`);
    }

    const payload = (await response.json()) as SupabaseTokenResponse;
    return this.toSyncSession(payload);
  }

  private async exchangeRefreshToken(refreshToken: string): Promise<SyncSession> {
    const { url, anonKey } = getSupabaseConfigOrThrow();
    const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`SYNC_AUTH_REFRESH_FAILED:${response.status}:${body}`);
    }

    const payload = (await response.json()) as SupabaseTokenResponse;
    return this.toSyncSession(payload);
  }

  private toSyncSession(payload: SupabaseTokenResponse): SyncSession {
    const accessToken = payload.access_token;
    const refreshToken = payload.refresh_token;
    const userId = payload.user?.id;
    if (!accessToken || !refreshToken || !userId) {
      throw new Error("SYNC_AUTH_INVALID_SESSION");
    }

    return {
      provider: "google",
      userId,
      email: payload.user?.email,
      expiresAt: payload.expires_in
        ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
        : undefined,
      accessTokenCipher: encryptSecret(accessToken),
      refreshTokenCipher: encryptSecret(refreshToken),
    };
  }
}

export const syncAuthService = new SyncAuthService();
