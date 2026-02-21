import { createHash, randomBytes } from "node:crypto";
import { safeStorage, shell } from "electron";
import { createLogger } from "../../../shared/logger/index.js";
import type { SyncProvider, SyncSettings } from "../../../shared/types/index.js";
import {
  getSupabaseConfig,
  getSupabaseConfigOrThrow,
} from "./supabaseEnv.js";

const logger = createLogger("SyncAuthService");

const OAUTH_REDIRECT_URI = "luie://auth/callback";

type PendingPkce = {
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
    return safeStorage.encryptString(plain).toString("base64");
  }
  return Buffer.from(plain, "utf-8").toString("base64");
};

const decryptSecret = (cipher: string): string => {
  const payload = Buffer.from(cipher, "base64");
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(payload);
  }
  return payload.toString("utf-8");
};

class SyncAuthService {
  private pendingPkce: PendingPkce | null = null;
  private readonly pendingTtlMs = 10 * 60 * 1000;

  private hasActivePendingFlow(): boolean {
    if (!this.pendingPkce) return false;
    const isExpired = Date.now() - this.pendingPkce.createdAt > this.pendingTtlMs;
    if (isExpired) {
      this.pendingPkce = null;
      return false;
    }
    return true;
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
    if (this.hasActivePendingFlow()) {
      logger.warn("OAuth flow already pending; ignoring duplicate connect request");
      return;
    }

    const { url } = getSupabaseConfigOrThrow();
    const verifier = createCodeVerifier();
    const challenge = createCodeChallenge(verifier);
    this.pendingPkce = {
      verifier,
      createdAt: Date.now(),
    };

    const authorizeUrl = new URL(`${url}/auth/v1/authorize`);
    authorizeUrl.searchParams.set("provider", "google");
    authorizeUrl.searchParams.set("redirect_to", OAUTH_REDIRECT_URI);
    authorizeUrl.searchParams.set("code_challenge", challenge);
    authorizeUrl.searchParams.set("code_challenge_method", "s256");

    await shell.openExternal(authorizeUrl.toString());
  }

  async completeOAuthCallback(callbackUrl: string): Promise<SyncSession> {
    const pending = this.pendingPkce;
    if (!pending) {
      throw new Error("SYNC_AUTH_NO_PENDING_SESSION");
    }
    if (Date.now() - pending.createdAt > this.pendingTtlMs) {
      this.pendingPkce = null;
      throw new Error("SYNC_AUTH_REQUEST_EXPIRED");
    }

    const parsed = new URL(callbackUrl);
    const code = parsed.searchParams.get("code");
    const error = parsed.searchParams.get("error");
    const errorCode = parsed.searchParams.get("error_code");
    const errorDescription = parsed.searchParams.get("error_description");

    if (error) {
      this.pendingPkce = null;
      throw new Error(errorDescription ?? errorCode ?? error);
    }
    if (!code) {
      throw new Error("SYNC_AUTH_CODE_MISSING");
    }

    const token = await this.exchangeCodeForSession(code, pending.verifier);
    this.pendingPkce = null;
    return token;
  }

  async refreshSession(syncSettings: SyncSettings): Promise<SyncSession> {
    if (!syncSettings.refreshTokenCipher || !syncSettings.userId) {
      throw new Error("SYNC_AUTH_REFRESH_UNAVAILABLE");
    }
    const refreshToken = decryptSecret(syncSettings.refreshTokenCipher);
    const token = await this.exchangeRefreshToken(refreshToken);
    return token;
  }

  getAccessToken(syncSettings: SyncSettings): string | null {
    if (!syncSettings.accessTokenCipher) {
      return null;
    }
    try {
      return decryptSecret(syncSettings.accessTokenCipher);
    } catch (error) {
      logger.warn("Failed to decrypt sync access token", { error });
      return null;
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
