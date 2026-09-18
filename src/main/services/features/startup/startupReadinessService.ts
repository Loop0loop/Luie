import { EventEmitter } from "node:events";
import { constants as fsConstants } from "node:fs";
import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { app, safeStorage } from "electron";
import Database from "better-sqlite3";
import { APP_DIR_NAME } from "../../../../shared/constants/index.js";
import { createLogger } from "../../../../shared/logger/index.js";
import type {
  StartupCheck,
  StartupCheckKey,
  StartupReadiness,
} from "../../../../shared/types/index.js";
import { db } from "../../../infra/database/index.js";
import { isStartupWizardForced } from "../../../utils/env/environment.js";
import { settingsManager } from "../../../domains/settings/index.js";
import { dbRecoveryService } from "../recovery/index.js";
import {
  getSupabaseConfig,
  getSupabaseConfigSource,
} from "../sync/supabaseEnv.js";
import { syncAuthService } from "../sync/syncAuthService.js";

const logger = createLogger("StartupReadinessService");

const STARTUP_WIZARD_EVENT = "startup:wizard-completed";
const STARTUP_SESSION_CHECK_TIMEOUT_MS = 5_000;

// getReadiness는 무거운 검사(integrity_check 전체 스캔, 네트워크 세션 체크)를
// 포함한다. 한 번의 스타트업에서 appReady·렌더러 IPC·completeWizard가 잇달아
// 호출하면 전체 재평가가 최대 4~5회 반복되므로, 짧은 TTL 캐시로 수렴시킨다.
// completedAt 변경(completeWizard) 시에는 즉시 무효화한다. TTL 만료 후 재호출은
// 재평가하므로 늦은 재시도 경로가 낡은 결과를 보지 않는다.
// docs/architecture/startup-pipeline-dissection.md §4 진단 2번.
const READINESS_CACHE_TTL_MS = 5_000;

const loadCacheDb = async () =>
  (await import("../../../infra/database/cache.js")).cacheDb;

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
  private cachedReadiness: {
    value: StartupReadiness;
    expiresAtMs: number;
  } | null = null;
  private readinessInFlight: Promise<StartupReadiness> | null = null;

  async getReadiness(): Promise<StartupReadiness> {
    const now = Date.now();
    if (this.cachedReadiness && this.cachedReadiness.expiresAtMs > now) {
      return this.cachedReadiness.value;
    }
    // 무거운 검사가 진행 중일 때 동시 호출이 검사를 복제하지 않도록 병합한다.
    if (this.readinessInFlight) {
      return this.readinessInFlight;
    }
    this.readinessInFlight = this.computeReadiness(now).finally(() => {
      this.readinessInFlight = null;
    });
    return this.readinessInFlight;
  }

  private async computeReadiness(nowMs: number): Promise<StartupReadiness> {
    const checks = await this.runChecks();
    const reasons = checks
      .filter((check) => check.blocking && !check.ok)
      .map((check) => check.key);
    const completedAt = settingsManager.getStartupSettings().completedAt;
    // LUIE_FORCE_STARTUP_WIZARD=1이면 completedAt·검사 결과와 무관하게 위저드를
    // 먼저 띄운다. UI 개편 작업용 dev 진입점이라 패키지 빌드 흐름도 전부 통과시킨다.
    const mustRunWizard =
      isStartupWizardForced() || !completedAt || reasons.length > 0;
    const readiness = {
      mustRunWizard,
      checks,
      reasons,
      completedAt,
    };
    this.cachedReadiness = {
      value: readiness,
      expiresAtMs: nowMs + READINESS_CACHE_TTL_MS,
    };
    return readiness;
  }

  private invalidateReadiness(): void {
    this.cachedReadiness = null;
  }

  async completeWizard(): Promise<StartupReadiness> {
    // 강제 모드에서는 completedAt을 쓰지 않는다. 상태를 더럽히지 않아야 다음
    // dev:wizard 실행마다 위저드가 다시 뜬다. 대신 mustRunWizard를 false로 내려
    // appReady의 wizard-completed 리스너가 위저드 창을 닫고 메인 흐름을 시작하게 한다.
    if (isStartupWizardForced()) {
      const readiness = await this.getReadiness();
      this.invalidateReadiness();
      const result: StartupReadiness = {
        ...readiness,
        mustRunWizard: false,
      };
      this.events.emit(STARTUP_WIZARD_EVENT, result);
      return result;
    }
    const before = await this.getReadiness();
    if (before.reasons.length > 0) {
      return before;
    }
    settingsManager.setStartupCompletedAt(nowIso());
    this.invalidateReadiness();
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
    // 검사들은 독립 자원(각자 DB/FS/네트워크를 자체 초기화)을 쓰므로 병렬로
    // 실행한다 — 순차 체인이면 네트워크 세션 체크(최대 5초)가 무거운 integrity
    // 스캔 뒤에 전부 가산됐다. 반환 배열은 기존 순서를 유지해 소비자(진단 UI)의
    // 표시 순서를 바꾸지 않는다. integrity/WAL은 DB 파일이 존재해야 의미가 있어
    // checkSqliteConnect(db.initialize 포함) 완료 후에 시작한다.
    const sqliteConnect = this.checkSqliteConnect();
    return Promise.all([
      this.checkSafeStorage(),
      this.checkDataDirRW(),
      this.checkDefaultLuiePath(),
      sqliteConnect,
      sqliteConnect.then(() => this.checkSqliteIntegrity()),
      sqliteConnect.then(() => this.checkSqliteWal()),
      this.checkSupabaseRuntimeConfig(),
      this.checkSupabaseSession(),
    ]);
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

  private async checkSqliteIntegrity(): Promise<StartupCheck> {
    try {
      const dbPath = db.getDatabasePath();
      let sqlite: Database.Database | null = null;
      try {
        sqlite = new Database(dbPath, { fileMustExist: true, readonly: true });
        const result = sqlite.pragma("integrity_check") as Array<{
          integrity_check: string;
        }>;
        const failures = result.filter(
          (row) => row.integrity_check.trim().toLowerCase() !== "ok",
        );
        if (failures.length > 0) {
          throw new Error(`DB_INTEGRITY_FAILED:${failures[0].integrity_check}`);
        }
      } finally {
        sqlite?.close();
      }
      return buildCheck(
        "sqliteIntegrity",
        true,
        "SQLite integrity check passed",
      );
    } catch (error) {
      logger.warn("SQLite integrity check failed, attempting recovery", {
        error,
      });
      try {
        const recoveryResult = await dbRecoveryService.recoverFromWal();
        if (recoveryResult.success) {
          return buildCheck(
            "sqliteIntegrity",
            true,
            "SQLite integrity recovered via WAL recovery",
          );
        }
      } catch (recoveryError) {
        logger.error("Recovery attempt also failed", { recoveryError });
      }
      return buildCheck(
        "sqliteIntegrity",
        false,
        `Integrity check failed: ${this.toErrorMessage(error)}`,
      );
    }
  }

  private async checkSqliteWal(): Promise<StartupCheck> {
    try {
      const cacheDb = await loadCacheDb();
      await Promise.all([db.initialize(), cacheDb.initialize()]);
      const mainPragmas = db.getConnectionPragmas();
      const cachePragmas = cacheDb.getConnectionPragmas();

      const invalidReasons: string[] = [];
      if (mainPragmas.journalMode.toLowerCase() !== "wal") {
        invalidReasons.push(`main.journal_mode=${mainPragmas.journalMode}`);
      }
      if (cachePragmas.journalMode.toLowerCase() !== "wal") {
        invalidReasons.push(`cache.journal_mode=${cachePragmas.journalMode}`);
      }
      if (mainPragmas.foreignKeys !== 1) {
        invalidReasons.push(`main.foreign_keys=${mainPragmas.foreignKeys}`);
      }
      if (cachePragmas.foreignKeys !== 1) {
        invalidReasons.push(`cache.foreign_keys=${cachePragmas.foreignKeys}`);
      }
      if (mainPragmas.busyTimeout < 5000) {
        invalidReasons.push(`main.busy_timeout=${mainPragmas.busyTimeout}`);
      }
      if (cachePragmas.busyTimeout < 5000) {
        invalidReasons.push(`cache.busy_timeout=${cachePragmas.busyTimeout}`);
      }
      if (mainPragmas.synchronous < 2) {
        invalidReasons.push(`main.synchronous=${mainPragmas.synchronous}`);
      }
      if (cachePragmas.synchronous < 2) {
        invalidReasons.push(`cache.synchronous=${cachePragmas.synchronous}`);
      }
      if (mainPragmas.walAutocheckpoint <= 0) {
        invalidReasons.push(
          `main.wal_autocheckpoint=${mainPragmas.walAutocheckpoint}`,
        );
      }
      if (cachePragmas.walAutocheckpoint <= 0) {
        invalidReasons.push(
          `cache.wal_autocheckpoint=${cachePragmas.walAutocheckpoint}`,
        );
      }

      if (invalidReasons.length > 0) {
        return buildCheck(
          "sqliteWal",
          false,
          `SQLite PRAGMA validation failed: ${invalidReasons.join(", ")}`,
        );
      }

      return buildCheck(
        "sqliteWal",
        true,
        `WAL/PRAGMA validated (main=${mainPragmas.journalMode}, cache=${cachePragmas.journalMode}, sync=${mainPragmas.synchronous}/${cachePragmas.synchronous}, timeout=${mainPragmas.busyTimeout}/${cachePragmas.busyTimeout})`,
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
          signal: AbortSignal.timeout(STARTUP_SESSION_CHECK_TIMEOUT_MS),
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

      let edgePayload: {
        ok?: boolean;
        userId?: string;
        edgeSecrets?: {
          openai?: boolean;
          gemini?: boolean;
        };
      } | null = null;
      try {
        edgePayload = (await edgeResponse.json()) as {
          ok?: boolean;
          userId?: string;
          edgeSecrets?: {
            openai?: boolean;
            gemini?: boolean;
          };
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

      const edgeSecrets = edgePayload.edgeSecrets;
      const secretStatus = edgeSecrets
        ? `edgeSecrets(openai=${edgeSecrets.openai ? "set" : "missing"}, gemini=${edgeSecrets.gemini ? "set" : "missing"})`
        : "edgeSecrets(unknown)";

      return buildCheck(
        "supabaseSession",
        true,
        `${edgePayload.userId ?? syncSettings.email ?? syncSettings.userId}; ${secretStatus}`,
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
