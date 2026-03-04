import { BrowserWindow, app, shell } from "electron";
import { createHash } from "node:crypto";
import * as fsp from "node:fs/promises";
import path from "node:path";
import { IPC_CHANNELS } from "../../../../shared/ipc/channels.js";
import { createLogger } from "../../../../shared/logger/index.js";
import type {
  AppUpdateApplyResult,
  AppUpdateArtifact,
  AppUpdateCheckResult,
  AppUpdateDownloadResult,
  AppUpdateRollbackResult,
  AppUpdateState,
} from "../../../../shared/types/index.js";
import {
  DEFAULT_UPDATE_FEED_URL,
  compareSemver,
  fetchUpdateFeed,
  type UpdateFeedManifest,
} from "./appUpdateFeedUtils.js";
import { isSafeArtifact, pathExists } from "./appUpdateFsUtils.js";
import { runAppUpdateDownload } from "./appUpdateDownload.js";

const logger = createLogger("AppUpdateService");

const UPDATE_DIR_NAME = "updates";
const PENDING_META_FILE = "pending.json";
const CURRENT_META_FILE = "current.json";
const ROLLBACK_META_FILE = "rollback.json";

export class AppUpdateService {
  private state: AppUpdateState = {
    status: "idle",
    currentVersion: app.getVersion(),
    rollbackAvailable: false,
  };

  private cachedManifest: UpdateFeedManifest | null = null;
  private inFlightDownload: Promise<AppUpdateDownloadResult> | null = null;

  private getUpdateDir(): string {
    return path.join(app.getPath("userData"), UPDATE_DIR_NAME);
  }

  private getPendingMetaPath(): string {
    return path.join(this.getUpdateDir(), PENDING_META_FILE);
  }

  private getCurrentMetaPath(): string {
    return path.join(this.getUpdateDir(), CURRENT_META_FILE);
  }

  private getRollbackMetaPath(): string {
    return path.join(this.getUpdateDir(), ROLLBACK_META_FILE);
  }

  private broadcastState(): void {
    const browserWindowApi = BrowserWindow as unknown as
      | {
          getAllWindows?: () => Array<{
            isDestroyed: () => boolean;
            webContents: { send: (channel: string, payload: unknown) => void };
          }>;
        }
      | undefined;
    const windows = browserWindowApi?.getAllWindows?.() ?? [];
    for (const win of windows) {
      if (win.isDestroyed()) continue;
      try {
        win.webContents.send(IPC_CHANNELS.APP_UPDATE_STATE_CHANGED, this.state);
      } catch (error) {
        logger.warn("Failed to broadcast update state", { error });
      }
    }
  }

  private setState(next: Partial<AppUpdateState>): void {
    this.state = {
      ...this.state,
      ...next,
      currentVersion: app.getVersion(),
    };
    this.broadcastState();
  }

  private async fetchFeed(feedUrl: URL): Promise<{
    latestVersion: string;
    manifest: UpdateFeedManifest | null;
  }> {
    return fetchUpdateFeed(feedUrl);
  }

  async checkForUpdate(): Promise<AppUpdateCheckResult> {
    this.setState({
      status: "checking",
      message: undefined,
      latestVersion: undefined,
    });

    const currentVersion = app.getVersion();
    if (!app.isPackaged) {
      this.cachedManifest = null;
      this.setState({
        status: "idle",
        latestVersion: undefined,
        message: "UPDATE_CHECK_DISABLED_IN_DEV",
      });
      return {
        supported: false,
        available: false,
        status: "disabled",
        currentVersion,
        message: "UPDATE_CHECK_DISABLED_IN_DEV",
      };
    }

    const feedUrl = process.env.LUIE_UPDATE_FEED_URL?.trim() ?? DEFAULT_UPDATE_FEED_URL;
    if (!feedUrl) {
      this.cachedManifest = null;
      this.setState({
        status: "idle",
        latestVersion: undefined,
        message: "UPDATE_FEED_URL_NOT_CONFIGURED",
      });
      return {
        supported: false,
        available: false,
        status: "unconfigured",
        currentVersion,
        message: "UPDATE_FEED_URL_NOT_CONFIGURED",
      };
    }

    let parsedFeedUrl: URL;
    try {
      parsedFeedUrl = new URL(feedUrl);
    } catch {
      this.cachedManifest = null;
      this.setState({
        status: "error",
        latestVersion: undefined,
        message: "UPDATE_FEED_URL_INVALID",
      });
      return {
        supported: true,
        available: false,
        status: "error",
        currentVersion,
        message: "UPDATE_FEED_URL_INVALID",
      };
    }

    if (parsedFeedUrl.protocol !== "https:") {
      this.cachedManifest = null;
      this.setState({
        status: "error",
        latestVersion: undefined,
        message: "UPDATE_FEED_URL_INSECURE",
      });
      return {
        supported: true,
        available: false,
        status: "error",
        currentVersion,
        message: "UPDATE_FEED_URL_INSECURE",
      };
    }

    try {
      const feed = await this.fetchFeed(parsedFeedUrl);
      const available = compareSemver(currentVersion, feed.latestVersion) < 0;
      this.cachedManifest = available ? feed.manifest : null;
      this.setState({
        status: available ? "available" : "idle",
        latestVersion: feed.latestVersion,
        message: available ? "UPDATE_AVAILABLE" : "UPDATE_UP_TO_DATE",
        checkedAt: new Date().toISOString(),
      });
      return {
        supported: true,
        available,
        status: available ? "available" : "up-to-date",
        currentVersion,
        latestVersion: feed.latestVersion,
        message: available ? "UPDATE_AVAILABLE" : "UPDATE_UP_TO_DATE",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.cachedManifest = null;
      this.setState({
        status: "error",
        message: `UPDATE_CHECK_FAILED:${message}`,
      });
      return {
        supported: true,
        available: false,
        status: "error",
        currentVersion,
        message: `UPDATE_CHECK_FAILED:${message}`,
      };
    }
  }

  private async readArtifactFromMeta(metaPath: string): Promise<AppUpdateArtifact | null> {
    if (!(await pathExists(metaPath))) return null;
    try {
      const raw = await fsp.readFile(metaPath, "utf-8");
      const parsed = JSON.parse(raw) as unknown;
      if (!isSafeArtifact(parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async getState(): Promise<AppUpdateState> {
    const rollbackAvailable = await pathExists(this.getRollbackMetaPath());
    const pendingArtifact = await this.readArtifactFromMeta(this.getPendingMetaPath());
    const currentArtifact = await this.readArtifactFromMeta(this.getCurrentMetaPath());
    const artifact = pendingArtifact ?? currentArtifact ?? this.state.artifact;

    this.setState({
      rollbackAvailable,
      artifact: artifact ?? undefined,
      status:
        this.state.status === "checking" ||
        this.state.status === "downloading" ||
        this.state.status === "applying"
          ? this.state.status
          : artifact
            ? "downloaded"
            : this.state.status === "error"
              ? "error"
              : this.state.latestVersion
                ? "available"
                : "idle",
    });

    return this.state;
  }

  private async computeFileSha256(filePath: string): Promise<string> {
    const content = await fsp.readFile(filePath);
    return createHash("sha256").update(content).digest("hex");
  }

  private async tryLaunchInstaller(filePath: string): Promise<boolean> {
    const lower = filePath.toLowerCase();
    const launchableExtensions = [".exe", ".msi", ".dmg", ".pkg", ".appimage", ".deb", ".rpm"];
    if (!launchableExtensions.some((ext) => lower.endsWith(ext))) {
      return false;
    }
    const launchError = await shell.openPath(filePath);
    if (launchError) {
      logger.warn("Failed to launch downloaded update artifact", {
        filePath,
        launchError,
      });
      return false;
    }

    setTimeout(() => {
      try {
        app.quit();
      } catch (error) {
        logger.warn("Failed to quit app after launching installer", { error });
      }
    }, 180);
    return true;
  }

  private async ensureManifestForDownload(): Promise<UpdateFeedManifest> {
    if (this.cachedManifest) return this.cachedManifest;
    const check = await this.checkForUpdate();
    if (!check.available || !this.cachedManifest) {
      throw new Error("UPDATE_NOT_AVAILABLE");
    }
    return this.cachedManifest;
  }

  async downloadUpdate(): Promise<AppUpdateDownloadResult> {
    if (this.inFlightDownload) {
      return this.inFlightDownload;
    }
    this.inFlightDownload = this.downloadUpdateInternal().finally(() => {
      this.inFlightDownload = null;
    });
    return this.inFlightDownload;
  }

  private async downloadUpdateInternal(): Promise<AppUpdateDownloadResult> {
    return runAppUpdateDownload({
      ensureManifestForDownload: () => this.ensureManifestForDownload(),
      getUpdateDir: () => this.getUpdateDir(),
      getPendingMetaPath: () => this.getPendingMetaPath(),
      getRollbackMetaPath: () => this.getRollbackMetaPath(),
      readArtifactFromMeta: (metaPath) => this.readArtifactFromMeta(metaPath),
      setState: (next) => this.setState(next),
    });
  }

  async applyUpdate(): Promise<AppUpdateApplyResult> {
    if (!app.isPackaged) {
      return {
        success: false,
        message: "UPDATE_APPLY_DISABLED_IN_DEV",
        rollbackAvailable: await pathExists(this.getRollbackMetaPath()),
        relaunched: false,
      };
    }

    const pendingArtifact = await this.readArtifactFromMeta(this.getPendingMetaPath());
    if (!pendingArtifact) {
      return {
        success: false,
        message: "UPDATE_APPLY_NO_PENDING_ARTIFACT",
        rollbackAvailable: await pathExists(this.getRollbackMetaPath()),
        relaunched: false,
      };
    }

    if (!(await pathExists(pendingArtifact.filePath))) {
      return {
        success: false,
        message: "UPDATE_APPLY_PENDING_FILE_MISSING",
        rollbackAvailable: await pathExists(this.getRollbackMetaPath()),
        relaunched: false,
      };
    }

    const actualSha = await this.computeFileSha256(pendingArtifact.filePath);
    if (actualSha !== pendingArtifact.sha256) {
      return {
        success: false,
        message: "UPDATE_APPLY_HASH_MISMATCH",
        rollbackAvailable: await pathExists(this.getRollbackMetaPath()),
        relaunched: false,
      };
    }

    const rollbackMetaPath = this.getRollbackMetaPath();
    const currentMetaPath = this.getCurrentMetaPath();
    if (await pathExists(rollbackMetaPath)) {
      await fsp.rm(rollbackMetaPath, { force: true });
    }
    if (await pathExists(currentMetaPath)) {
      await fsp.rename(currentMetaPath, rollbackMetaPath);
    }
    await fsp.rename(this.getPendingMetaPath(), currentMetaPath);

    const rollbackAvailable = await pathExists(rollbackMetaPath);
    this.setState({
      status: "applying",
      latestVersion: pendingArtifact.version,
      artifact: pendingArtifact,
      rollbackAvailable,
      message: "UPDATE_APPLY_RELAUNCH_SCHEDULED",
    });

    if (process.env.LUIE_TEST_DISABLE_UPDATE_RELAUNCH === "1") {
      this.setState({
        status: "downloaded",
      });
      return {
        success: true,
        message: "UPDATE_APPLY_OK_TEST_MODE",
        rollbackAvailable,
        relaunched: false,
      };
    }

    const launchedInstaller = await this.tryLaunchInstaller(pendingArtifact.filePath);
    if (launchedInstaller) {
      return {
        success: true,
        message: "UPDATE_APPLY_INSTALLER_LAUNCHED",
        rollbackAvailable,
        relaunched: false,
      };
    }

    setTimeout(() => {
      try {
        app.relaunch();
        app.exit(0);
      } catch (error) {
        logger.error("Failed to relaunch app for update apply", { error });
      }
    }, 150);

    return {
      success: true,
      message: "UPDATE_APPLY_OK",
      rollbackAvailable,
      relaunched: true,
    };
  }

  async rollbackUpdate(): Promise<AppUpdateRollbackResult> {
    const rollbackMetaPath = this.getRollbackMetaPath();
    const rollbackArtifact = await this.readArtifactFromMeta(rollbackMetaPath);
    if (!rollbackArtifact) {
      return {
        success: false,
        message: "UPDATE_ROLLBACK_NOT_AVAILABLE",
      };
    }

    if (!(await pathExists(rollbackArtifact.filePath))) {
      return {
        success: false,
        message: "UPDATE_ROLLBACK_FILE_MISSING",
      };
    }

    const rollbackSha = await this.computeFileSha256(rollbackArtifact.filePath);
    if (rollbackSha !== rollbackArtifact.sha256) {
      return {
        success: false,
        message: "UPDATE_ROLLBACK_HASH_MISMATCH",
      };
    }

    const currentMetaPath = this.getCurrentMetaPath();
    const staleMetaPath = path.join(this.getUpdateDir(), `stale-${Date.now()}.json`);
    if (await pathExists(currentMetaPath)) {
      await fsp.rename(currentMetaPath, staleMetaPath);
    }
    await fsp.rename(rollbackMetaPath, currentMetaPath);

    this.setState({
      status: "downloaded",
      latestVersion: rollbackArtifact.version,
      artifact: rollbackArtifact,
      rollbackAvailable: false,
      message: "UPDATE_ROLLBACK_OK",
    });

    return {
      success: true,
      message: "UPDATE_ROLLBACK_OK",
      restoredVersion: rollbackArtifact.version,
    };
  }
}

export const appUpdateService = new AppUpdateService();
