import { EventEmitter } from "node:events";
import { constants as fsConstants } from "node:fs";
import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { app, safeStorage } from "electron";
import { APP_DIR_NAME } from "../../../shared/constants/index.js";
import { createLogger } from "../../../shared/logger/index.js";
import type {
  StartupCheck,
  StartupCheckKey,
  StartupReadiness,
} from "../../../shared/types/index.js";
import { db } from "../../database/index.js";
import { settingsManager } from "../../manager/settingsManager.js";
import {
  getSupabaseConfig,
  getSupabaseConfigSource,
} from "./sync/supabaseEnv.js";
import { syncAuthService } from "./sync/syncAuthService.js";

const logger = createLogger("StartupReadinessService");

const STARTUP_WIZARD_EVENT = "startup:wizard-completed";

const loadCacheDb = async () =>
  (await import("../../database/cacheDb.js")).cacheDb;

const nowIso = (): string => new Date().toISOString();

const buildCheck = (
  key: StartupCheckKey,
  ok: boolean,
  detail?: string,
  blocking = true,
): StartupCheck => ({
  key,
  ok,
  blocking,
  detail,
  checkedAt: nowIso(),
});

class StartupReadinessService {
  private readonly events = new EventEmitter();

  async getReadiness(): Promise<StartupReadiness> {
    const checks = await this.runChecks();
    const reasons = checks
      .filter((check) => check.blocking && !check.ok)
      .map((check) => check.key);
    const completedAt = settingsManager.getStartupSettings().completedAt;
    const mustRunWizard = !completedAt || reasons.length > 0;
    return {
      mustRunWizard,
      checks,
      reasons,
      completedAt,
    };
  }

  async completeWizard(): Promise<StartupReadiness> {
    const before = await this.getReadiness();
    if (before.reasons.length > 0) {
      return before;
    }
    settingsManager.setStartupCompletedAt(nowIso());
    const after = await this.getReadiness();
    this.events.emit(STARTUP_WIZARD_EVENT, after);
    return after;
  }

  onWizardCompleted(
    listener: (readiness: StartupReadiness) => void,
  ): () => void {
    this.events.on(STARTUP_WIZARD_EVENT, listener);
    return () => {
      this.events.off(STARTUP_WIZARD_EVENT, listener);
    };
  }

  private async runChecks(): Promise<StartupCheck[]> {
    const checks: StartupCheck[] = [];
    checks.push(await this.checkSafeStorage());
    checks.push(await this.checkDataDirRW());
    checks.push(await this.checkDefaultLuiePath());
    checks.push(await this.checkSqliteConnect());
    checks.push(await this.checkSqliteWal());
    checks.push(await this.checkSupabaseRuntimeConfig());
    checks.push(await this.checkSupabaseSession());
    return checks;
  }

  private async checkSafeStorage(): Promise<StartupCheck> {
    try {
      const available = safeStorage.isEncryptionAvailable();
      return buildCheck(
        "osPermission",
        available,
        available
          ? "safeStorage available"
          : "safeStorage encryption is unavailable on this OS session",
      );
    } catch (error) {
      return buildCheck("osPermission", false, this.toErrorMessage(error));
    }
  }

  private async checkDataDirRW(): Promise<StartupCheck> {
    const userDataPath = app.getPath("userData");
    const probePath = path.join(userDataPath, `.startup-rw-${Date.now()}.tmp`);
    try {
      await mkdir(userDataPath, { recursive: true });
      await writeFile(probePath, "ok", { encoding: "utf8" });
      return buildCheck("dataDirRW", true, userDataPath);
    } catch (error) {
      return buildCheck(
        "dataDirRW",
        false,
        `${userDataPath}: ${this.toErrorMessage(error)}`,
      );
    } finally {
      await unlink(probePath).catch(() => undefined);
    }
  }

  private async checkDefaultLuiePath(): Promise<StartupCheck> {
    const documentsPath = app.getPath("documents");
    const luiePath = path.join(documentsPath, APP_DIR_NAME);
    const probePath = path.join(luiePath, ".startup-probe");
    try {
      await mkdir(luiePath, { recursive: true });
      await access(luiePath, fsConstants.R_OK | fsConstants.W_OK);
      await writeFile(probePath, "ok", { encoding: "utf8" });
      return buildCheck("defaultLuiePath", true, luiePath);
    } catch (error) {
      return buildCheck(
        "defaultLuiePath",
        false,
        `${luiePath}: ${this.toErrorMessage(error)}`,
      );
    } finally {
      await unlink(probePath).catch(() => undefined);
    }
  }

  private async checkSqliteConnect(): Promise<StartupCheck> {
    try {
      const cacheDb = await loadCacheDb();
      await Promise.all([db.initialize(), cacheDb.initialize()]);
      db.getClient();
      cacheDb.getClient();
      return buildCheck("sqliteConnect", true, "SQLite connection ready");
    } catch (error) {
      return buildCheck("sqliteConnect", false, this.toErrorMessage(error));
    }
  }

  private async checkSqliteWal(): Promise<StartupCheck> {
    try {
      const cacheDb = await loadCacheDb();
      await Promise.all([db.initialize(), cacheDb.initialize()]);
      return buildCheck(
        "sqliteWal",
        true,
        "WAL mode enforced during DB initialization",
      );
    } catch (error) {
      return buildCheck("sqliteWal", false, this.toErrorMessage(error));
    }
  }

  private async checkSupabaseRuntimeConfig(): Promise<StartupCheck> {
    try {
      const config = getSupabaseConfig();
      const source = getSupabaseConfigSource();
      if (!config) {
        return buildCheck(
          "supabaseRuntimeConfig",
          false,
          "Runtime Supabase configuration is not completed",
        );
      }
      return buildCheck(
        "supabaseRuntimeConfig",
        true,
        source ? `resolved from ${source}` : "resolved",
      );
    } catch (error) {
      return buildCheck(
        "supabaseRuntimeConfig",
        false,
        this.toErrorMessage(error),
      );
    }
  }

  private async checkSupabaseSession(): Promise<StartupCheck> {
    try {
      const syncSettings = settingsManager.getSyncSettings();
      if (!syncSettings.connected || !syncSettings.userId) {
        return buildCheck(
          "supabaseSession",
          false,
          "Sync login is not connected yet (non-blocking)",
          false,
        );
      }

      const access = syncAuthService.getAccessToken(syncSettings);
      const refresh = syncAuthService.getRefreshToken(syncSettings);
      const hasToken = Boolean(access.token) || Boolean(refresh.token);

      if (!hasToken) {
        return buildCheck(
          "supabaseSession",
          false,
          access.errorCode ?? refresh.errorCode ?? "No usable JWT token",
          false,
        );
      }

      if (!access.token) {
        return buildCheck(
          "supabaseSession",
          false,
          "Access token is unavailable. Reconnect sync login.",
          false,
        );
      }

      const supabaseConfig = getSupabaseConfig();
      if (!supabaseConfig) {
        return buildCheck(
          "supabaseSession",
          false,
          "Runtime Supabase configuration is not completed",
          false,
        );
      }

      const edgeResponse = await fetch(
        `${supabaseConfig.url}/functions/v1/luieEnv`,
        {
          method: "GET",
          headers: {
            apikey: supabaseConfig.anonKey,
            Authorization: `Bearer ${access.token}`,
          },
        },
      );
      if (!edgeResponse.ok) {
        return buildCheck(
          "supabaseSession",
          false,
          `Edge auth health check failed (${edgeResponse.status})`,
          false,
        );
      }

      let edgePayload: { ok?: boolean; userId?: string } | null = null;
      try {
        edgePayload = (await edgeResponse.json()) as {
          ok?: boolean;
          userId?: string;
        };
      } catch {
        edgePayload = null;
      }

      if (!edgePayload?.ok) {
        return buildCheck(
          "supabaseSession",
          false,
          "Edge auth health response is invalid",
          false,
        );
      }

      return buildCheck(
        "supabaseSession",
        true,
        edgePayload.userId ?? syncSettings.email ?? syncSettings.userId,
        false,
      );
    } catch (error) {
      logger.warn("Startup session check failed", { error });
      return buildCheck(
        "supabaseSession",
        false,
        this.toErrorMessage(error),
        false,
      );
    }
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return String(error);
  }
}

export const startupReadinessService = new StartupReadinessService();
