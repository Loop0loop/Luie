import { BrowserWindow, app } from "electron";
import { createHash } from "node:crypto";
import * as fsp from "node:fs/promises";
import path from "node:path";
import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import { createLogger } from "../../../shared/logger/index.js";
import type {
  AppUpdateApplyResult,
  AppUpdateArtifact,
  AppUpdateCheckResult,
  AppUpdateDownloadResult,
  AppUpdateRollbackResult,
  AppUpdateState,
} from "../../../shared/types/index.js";

const logger = createLogger("AppUpdateService");

const UPDATE_FETCH_TIMEOUT_MS = 5000;
const UPDATE_PAYLOAD_MAX_BYTES = 512 * 1024;
const UPDATE_DOWNLOAD_MAX_BYTES = 1024 * 1024 * 1024;
const UPDATE_DIR_NAME = "updates";
const PENDING_META_FILE = "pending.json";
const CURRENT_META_FILE = "current.json";
const ROLLBACK_META_FILE = "rollback.json";
const VERSION_PATTERN = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const SHA256_PATTERN = /^(?:sha256:)?[a-fA-F0-9]{64}$/;

type ParsedSemver = {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
};

type UpdateFeedManifest = {
  version: string;
  url: string;
  sha256: string;
  size?: number;
};

const normalizeVersionString = (input: string): string | null => {
  const trimmed = input.trim();
  if (!VERSION_PATTERN.test(trimmed)) return null;
  return trimmed.startsWith("v") ? trimmed.slice(1) : trimmed;
};

const parseSemver = (input: string): ParsedSemver | null => {
  const normalized = normalizeVersionString(input);
  if (!normalized) return null;
  const [core, pre] = normalized.split("-", 2);
  const [majorRaw, minorRaw, patchRaw] = core.split(".");
  const major = Number(majorRaw);
  const minor = Number(minorRaw);
  const patch = Number(patchRaw);
  if (![major, minor, patch].every((value) => Number.isInteger(value) && value >= 0)) {
    return null;
  }
  return {
    major,
    minor,
    patch,
    prerelease: pre ? pre.split(".").filter((segment) => segment.length > 0) : [],
  };
};

const comparePrereleaseSegment = (left: string, right: string): number => {
  const leftNumeric = /^\d+$/.test(left);
  const rightNumeric = /^\d+$/.test(right);
  if (leftNumeric && rightNumeric) {
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    return leftNumber === rightNumber ? 0 : leftNumber < rightNumber ? -1 : 1;
  }
  if (leftNumeric !== rightNumeric) {
    return leftNumeric ? -1 : 1;
  }
  return left === right ? 0 : left < right ? -1 : 1;
};

const compareSemver = (currentVersion: string, latestVersion: string): number => {
  const current = parseSemver(currentVersion);
  const latest = parseSemver(latestVersion);
  if (!current || !latest) return currentVersion.localeCompare(latestVersion);

  if (current.major !== latest.major) return current.major < latest.major ? -1 : 1;
  if (current.minor !== latest.minor) return current.minor < latest.minor ? -1 : 1;
  if (current.patch !== latest.patch) return current.patch < latest.patch ? -1 : 1;

  const currentPre = current.prerelease;
  const latestPre = latest.prerelease;
  if (currentPre.length === 0 && latestPre.length === 0) return 0;
  if (currentPre.length === 0) return 1;
  if (latestPre.length === 0) return -1;

  const maxLen = Math.max(currentPre.length, latestPre.length);
  for (let index = 0; index < maxLen; index += 1) {
    const left = currentPre[index];
    const right = latestPre[index];
    if (left === undefined) return -1;
    if (right === undefined) return 1;
    const compared = comparePrereleaseSegment(left, right);
    if (compared !== 0) return compared;
  }
  return 0;
};

const normalizeSha256 = (input: string): string | null => {
  const trimmed = input.trim();
  if (!SHA256_PATTERN.test(trimmed)) return null;
  return trimmed.toLowerCase().replace(/^sha256:/, "");
};

const extractVersionFromFeedPayload = (payload: unknown): string | null => {
  if (typeof payload === "string") {
    return normalizeVersionString(payload);
  }
  if (Array.isArray(payload)) {
    for (const entry of payload) {
      const candidate = extractVersionFromFeedPayload(entry);
      if (candidate) return candidate;
    }
    return null;
  }
  if (payload && typeof payload === "object") {
    const source = payload as Record<string, unknown>;
    const keyCandidates = [
      source.version,
      source.latestVersion,
      source.tag_name,
      source.tagName,
      source.name,
    ];
    for (const candidate of keyCandidates) {
      if (typeof candidate !== "string") continue;
      const normalized = normalizeVersionString(candidate);
      if (normalized) return normalized;
    }
  }
  return null;
};

const extractManifestFromFeedPayload = (
  payload: unknown,
  feedUrl: URL,
): UpdateFeedManifest | null => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const source = payload as Record<string, unknown>;
  const normalizedVersion = normalizeVersionString(
    typeof source.version === "string"
      ? source.version
      : typeof source.latestVersion === "string"
        ? source.latestVersion
        : "",
  );
  if (!normalizedVersion) return null;

  const rawUrl =
    typeof source.url === "string"
      ? source.url
      : typeof source.downloadUrl === "string"
        ? source.downloadUrl
        : typeof source.assetUrl === "string"
          ? source.assetUrl
          : null;
  const rawSha =
    typeof source.sha256 === "string"
      ? source.sha256
      : typeof source.checksum === "string"
        ? source.checksum
        : null;

  if (!rawUrl || !rawSha) return null;

  const normalizedSha = normalizeSha256(rawSha);
  if (!normalizedSha) return null;

  let resolvedUrl: URL;
  try {
    resolvedUrl = new URL(rawUrl, feedUrl);
  } catch {
    return null;
  }
  if (resolvedUrl.protocol !== "https:") {
    return null;
  }

  const size =
    typeof source.size === "number" && Number.isFinite(source.size) && source.size > 0
      ? source.size
      : undefined;

  return {
    version: normalizedVersion,
    url: resolvedUrl.toString(),
    sha256: normalizedSha,
    size,
  };
};

const extractVersionFromTextPayload = (raw: string): string | null => {
  const matched = raw.match(/v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/);
  if (!matched) return null;
  return normalizeVersionString(matched[0]);
};

const isSafeArtifact = (value: unknown): value is AppUpdateArtifact => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const source = value as Record<string, unknown>;
  return (
    typeof source.version === "string" &&
    source.version.length > 0 &&
    typeof source.filePath === "string" &&
    source.filePath.length > 0 &&
    typeof source.sha256 === "string" &&
    Boolean(normalizeSha256(source.sha256)) &&
    typeof source.size === "number" &&
    Number.isFinite(source.size) &&
    source.size >= 0 &&
    typeof source.sourceUrl === "string" &&
    source.sourceUrl.length > 0 &&
    typeof source.downloadedAt === "string" &&
    source.downloadedAt.length > 0
  );
};

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await fsp.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPDATE_FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(feedUrl, {
        method: "GET",
        headers: { Accept: "application/json, text/plain;q=0.9" },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`UPDATE_FEED_HTTP_${response.status}`);
      }
      const raw = await response.text();
      if (Buffer.byteLength(raw, "utf8") > UPDATE_PAYLOAD_MAX_BYTES) {
        throw new Error("UPDATE_FEED_PAYLOAD_TOO_LARGE");
      }

      const contentType = response.headers.get("content-type") ?? "";
      const shouldParseJson =
        contentType.includes("json") ||
        raw.trim().startsWith("{") ||
        raw.trim().startsWith("[");

      if (shouldParseJson) {
        const parsed = JSON.parse(raw) as unknown;
        const latestVersion = extractVersionFromFeedPayload(parsed);
        if (!latestVersion) throw new Error("UPDATE_FEED_VERSION_NOT_FOUND");
        return {
          latestVersion,
          manifest: extractManifestFromFeedPayload(parsed, feedUrl),
        };
      }

      const latestVersion = extractVersionFromTextPayload(raw);
      if (!latestVersion) throw new Error("UPDATE_FEED_VERSION_NOT_FOUND");
      return {
        latestVersion,
        manifest: null,
      };
    } finally {
      clearTimeout(timer);
    }
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

    const feedUrl = process.env.LUIE_UPDATE_FEED_URL?.trim();
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
    if (!app.isPackaged) {
      return {
        success: false,
        message: "UPDATE_DOWNLOAD_DISABLED_IN_DEV",
      };
    }

    let manifest: UpdateFeedManifest;
    try {
      manifest = await this.ensureManifestForDownload();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.setState({ status: "error", message: `UPDATE_DOWNLOAD_FAILED:${message}` });
      return {
        success: false,
        message: `UPDATE_DOWNLOAD_FAILED:${message}`,
      };
    }

    this.setState({
      status: "downloading",
      latestVersion: manifest.version,
      message: "UPDATE_DOWNLOADING",
    });

    const updateDir = this.getUpdateDir();
    await fsp.mkdir(updateDir, { recursive: true });

    const artifactName = `luie-${manifest.version}-${Date.now()}.bin`;
    const tempPath = path.join(updateDir, `${artifactName}.part`);
    const finalPath = path.join(updateDir, artifactName);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPDATE_FETCH_TIMEOUT_MS * 4);
    let fileHandle: Awaited<ReturnType<typeof fsp.open>> | null = null;
    const response = await fetch(manifest.url, {
      method: "GET",
      signal: controller.signal,
    }).catch((error) => {
      throw new Error(`UPDATE_DOWNLOAD_REQUEST_FAILED:${String(error)}`);
    });
    if (!response.ok) {
      clearTimeout(timer);
      throw new Error(`UPDATE_DOWNLOAD_HTTP_${response.status}`);
    }
    const contentLengthRaw = response.headers.get("content-length");
    const contentLength =
      contentLengthRaw && Number.isFinite(Number(contentLengthRaw))
        ? Number(contentLengthRaw)
        : undefined;
    if (contentLength && contentLength > UPDATE_DOWNLOAD_MAX_BYTES) {
      clearTimeout(timer);
      throw new Error("UPDATE_DOWNLOAD_TOO_LARGE");
    }
    if (!response.body) {
      clearTimeout(timer);
      throw new Error("UPDATE_DOWNLOAD_BODY_MISSING");
    }

    try {
      const reader = response.body.getReader();
      const hash = createHash("sha256");
      let total = 0;
      fileHandle = await fsp.open(tempPath, "w");
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        const chunk = Buffer.from(value);
        total += chunk.length;
        if (total > UPDATE_DOWNLOAD_MAX_BYTES) {
          throw new Error("UPDATE_DOWNLOAD_TOO_LARGE");
        }
        hash.update(chunk);
        await fileHandle.write(chunk);
      }
      await fileHandle.close();
      fileHandle = null;
      clearTimeout(timer);

      if (manifest.size && manifest.size !== total) {
        throw new Error(`UPDATE_DOWNLOAD_SIZE_MISMATCH:${manifest.size}:${total}`);
      }
      const actualSha = hash.digest("hex");
      if (actualSha !== manifest.sha256) {
        throw new Error("UPDATE_DOWNLOAD_HASH_MISMATCH");
      }

      await fsp.rename(tempPath, finalPath);
      const artifact: AppUpdateArtifact = {
        version: manifest.version,
        filePath: finalPath,
        sha256: manifest.sha256,
        size: total,
        sourceUrl: manifest.url,
        downloadedAt: new Date().toISOString(),
      };

      const previousPending = await this.readArtifactFromMeta(this.getPendingMetaPath());
      if (previousPending?.filePath && previousPending.filePath !== artifact.filePath) {
        await fsp.rm(previousPending.filePath, { force: true }).catch(() => undefined);
      }
      const pendingMetaPath = this.getPendingMetaPath();
      const pendingMetaTempPath = `${pendingMetaPath}.tmp`;
      await fsp.writeFile(pendingMetaTempPath, JSON.stringify(artifact, null, 2), "utf-8");
      await fsp.rename(pendingMetaTempPath, pendingMetaPath);

      this.setState({
        status: "downloaded",
        latestVersion: artifact.version,
        artifact,
        message: "UPDATE_DOWNLOADED",
        rollbackAvailable: await pathExists(this.getRollbackMetaPath()),
      });

      return {
        success: true,
        message: "UPDATE_DOWNLOAD_OK",
        artifact,
      };
    } catch (error) {
      if (fileHandle) {
        await fileHandle.close().catch(() => undefined);
      }
      clearTimeout(timer);
      await fsp.rm(tempPath, { force: true }).catch(() => undefined);
      const message = error instanceof Error ? error.message : String(error);
      this.setState({
        status: "error",
        message: `UPDATE_DOWNLOAD_FAILED:${message}`,
      });
      return {
        success: false,
        message: `UPDATE_DOWNLOAD_FAILED:${message}`,
      };
    }
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
