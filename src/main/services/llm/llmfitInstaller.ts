/**
 * llmfitInstaller — GitHub releases 에서 llmfit 바이너리를 런타임 설치한다.
 *
 * 흐름:
 *   1) `/releases/latest` 조회 → 현재 OS/아키텍처 자산 선택.
 *   2) 아카이브(tar.gz/zip) + SHA256(.sha256 자산 또는 GitHub asset digest) 다운로드.
 *   3) SHA256 검증 → 불일치 시 중단·정리.
 *   4) 추출(tar.gz=시스템 tar, zip=yauzl) → `<userData>/bin/llmfit[.exe]`.
 *   5) POSIX 실행권한(chmod 0o755) 부여, 설치 버전 기록.
 *
 * 격리(P6/P7): 모든 단계는 throw 하지 않고 `{ installed:false, reason }` 로 귀결한다.
 * 멱등: 이미 설치되어 있고 버전 일치 시 재다운로드를 skip 한다.
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import * as fsp from "node:fs/promises";
import type { Dirent } from "node:fs";
import * as path from "node:path";
import { app } from "electron";
import yauzl from "yauzl";
import { createWriteStream } from "node:fs";
import { createLogger } from "../../../shared/logger/index.js";
import {
  LLMFIT_ASSET_TARGETS,
  LLMFIT_LATEST_RELEASE_API,
  llmfitBinaryName,
  resolveLlmfitPlatformKey,
  type LlmfitPlatformKey,
} from "./llmfitConstants.js";

const logger = createLogger("LlmfitInstaller");

const DOWNLOAD_TIMEOUT_MS = 60_000;
const API_TIMEOUT_MS = 10_000;

// ─── GitHub release 타입(필요 필드만) ──────────────────────────────────────────

export type GithubReleaseAsset = {
  name: string;
  browser_download_url: string;
  /** `sha256:...` 형식(있을 수도 없을 수도). */
  digest?: string | null;
};

export type GithubRelease = {
  tag_name: string;
  assets: GithubReleaseAsset[];
};

export type LlmfitInstallStatus = {
  installed: boolean;
  path: string | null;
  version: string | null;
  reason?: string;
};

// ─── 순수 헬퍼(테스트 대상) ─────────────────────────────────────────────────────

/**
 * 플랫폼에 맞는 아카이브 자산과 (가능하면) 동반 sha256 자산을 고른다.
 * 자산명 형식: `llmfit-v{ver}-{triple}.{ext}` / `...{ext}.sha256`.
 */
export function selectLlmfitAsset(
  assets: GithubReleaseAsset[],
  platformKey: LlmfitPlatformKey,
): {
  archive: GithubReleaseAsset;
  sha256Asset: GithubReleaseAsset | null;
} | null {
  const target = LLMFIT_ASSET_TARGETS[platformKey];
  const suffix = `${target.triple}.${target.ext}`;
  const archive = assets.find(
    (asset) => asset.name.endsWith(suffix) && !asset.name.endsWith(".sha256"),
  );
  if (!archive) return null;
  const sha256Asset =
    assets.find((asset) => asset.name === `${archive.name}.sha256`) ?? null;
  return { archive, sha256Asset };
}

/**
 * sha256 자산 본문에서 16진수 해시를 추출한다.
 * 형식은 보통 `<hex>  <filename>` 또는 단순 `<hex>`.
 */
export function parseSha256Content(content: string): string | null {
  const match = content.trim().match(/\b[0-9a-f]{64}\b/i);
  return match ? match[0].toLowerCase() : null;
}

/** GitHub asset digest(`sha256:<hex>`)에서 해시를 추출한다. */
export function parseDigestField(digest: string | null | undefined): string | null {
  if (!digest) return null;
  const match = digest.trim().match(/^sha256:([0-9a-f]{64})$/i);
  return match ? match[1].toLowerCase() : null;
}

// ─── 설치기 ─────────────────────────────────────────────────────────────────

class LlmfitInstaller {
  private binDir(): string {
    return path.join(app.getPath("userData"), "bin");
  }

  private binaryPath(): string {
    return path.join(this.binDir(), llmfitBinaryName());
  }

  private versionMarkerPath(): string {
    return path.join(this.binDir(), ".llmfit-version");
  }

  /** 현재 설치 상태를 조회한다. */
  async getStatus(): Promise<LlmfitInstallStatus> {
    const binPath = this.binaryPath();
    try {
      await fsp.access(binPath);
    } catch {
      return { installed: false, path: null, version: null };
    }
    let version: string | null = null;
    try {
      version = (await fsp.readFile(this.versionMarkerPath(), "utf8")).trim() || null;
    } catch {
      // version marker 없음 — null 유지.
    }
    return { installed: true, path: binPath, version };
  }

  /**
   * llmfit 를 보장 설치한다. 이미 최신/설치 상태면 skip.
   * 어떤 실패도 throw 하지 않고 상태로 반환한다(P6/P7).
   */
  async ensureInstalled(): Promise<LlmfitInstallStatus> {
    const platformKey = resolveLlmfitPlatformKey();
    if (!platformKey) {
      return {
        installed: false,
        path: null,
        version: null,
        reason: `UNSUPPORTED_PLATFORM:${process.platform}-${process.arch}`,
      };
    }

    try {
      const release = await this.fetchLatestRelease();
      if (!release) {
        const existing = await this.getStatus();
        return existing.installed
          ? existing
          : { installed: false, path: null, version: null, reason: "RELEASE_FETCH_FAILED" };
      }

      // 멱등: 이미 같은 버전이 설치되어 있으면 skip.
      const current = await this.getStatus();
      if (current.installed && current.version === release.tag_name) {
        return current;
      }

      const selected = selectLlmfitAsset(release.assets, platformKey);
      if (!selected) {
        return {
          installed: false,
          path: null,
          version: null,
          reason: `ASSET_NOT_FOUND:${platformKey}`,
        };
      }

      const installedPath = await this.downloadAndInstall(
        selected.archive,
        selected.sha256Asset,
        platformKey,
      );

      await fsp.writeFile(this.versionMarkerPath(), release.tag_name, "utf8");
      logger.info("llmfit installed", {
        version: release.tag_name,
        path: installedPath,
      });
      return {
        installed: true,
        path: installedPath,
        version: release.tag_name,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logger.warn("llmfit install failed; recommendations disabled", { reason });
      // 설치 실패해도 기존 설치가 있으면 그걸 유지.
      const fallback = await this.getStatus();
      return fallback.installed
        ? fallback
        : { installed: false, path: null, version: null, reason };
    }
  }

  private async fetchLatestRelease(): Promise<GithubRelease | null> {
    try {
      const response = await fetch(LLMFIT_LATEST_RELEASE_API, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "Luie-App",
        },
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      });
      if (!response.ok) {
        logger.warn("llmfit release API non-OK", { status: response.status });
        return null;
      }
      const json = (await response.json()) as GithubRelease;
      if (!json || typeof json.tag_name !== "string" || !Array.isArray(json.assets)) {
        return null;
      }
      return json;
    } catch (error) {
      logger.warn("llmfit release API fetch failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async resolveExpectedSha256(
    archive: GithubReleaseAsset,
    sha256Asset: GithubReleaseAsset | null,
  ): Promise<string | null> {
    // 1) GitHub asset digest 우선(메타에 포함, 추가 요청 불필요).
    const fromDigest = parseDigestField(archive.digest);
    if (fromDigest) return fromDigest;

    // 2) 동반 .sha256 자산 본문.
    if (sha256Asset) {
      try {
        const response = await fetch(sha256Asset.browser_download_url, {
          headers: { "User-Agent": "Luie-App" },
          signal: AbortSignal.timeout(API_TIMEOUT_MS),
        });
        if (response.ok) {
          const text = await response.text();
          return parseSha256Content(text);
        }
      } catch (error) {
        logger.warn("Failed to fetch llmfit sha256 asset", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return null;
  }

  private async downloadAndInstall(
    archive: GithubReleaseAsset,
    sha256Asset: GithubReleaseAsset | null,
    platformKey: LlmfitPlatformKey,
  ): Promise<string> {
    const binDir = this.binDir();
    await fsp.mkdir(binDir, { recursive: true });

    const archivePath = path.join(binDir, archive.name);
    await this.downloadToFile(archive.browser_download_url, archivePath);

    try {
      // 무결성 검증.
      const expectedSha = await this.resolveExpectedSha256(archive, sha256Asset);
      if (expectedSha) {
        const actualSha = await this.sha256File(archivePath);
        if (actualSha !== expectedSha) {
          throw new Error(
            `LLMFIT_SHA256_MISMATCH:expected=${expectedSha}:got=${actualSha}`,
          );
        }
      } else {
        logger.warn("llmfit sha256 unavailable; proceeding without verification");
      }

      // 추출.
      const ext = LLMFIT_ASSET_TARGETS[platformKey].ext;
      const binaryName = llmfitBinaryName();
      const extractedPath =
        ext === "zip"
          ? await this.extractBinaryFromZip(archivePath, binaryName, binDir)
          : await this.extractBinaryFromTarGz(archivePath, binaryName, binDir);

      // 실행 권한(POSIX).
      if (process.platform !== "win32") {
        await fsp.chmod(extractedPath, 0o755);
      }
      return extractedPath;
    } finally {
      await fsp.rm(archivePath, { force: true }).catch(() => undefined);
    }
  }

  private async downloadToFile(url: string, destPath: string): Promise<void> {
    const tmpPath = `${destPath}.tmp`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Luie-App" },
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
    if (!response.ok || !response.body) {
      throw new Error(`LLMFIT_DOWNLOAD_FAILED:HTTP_${response.status}`);
    }
    const reader = response.body.getReader();
    let handle: Awaited<ReturnType<typeof fsp.open>> | null = null;
    try {
      handle = await fsp.open(tmpPath, "w");
      for (;;) {
        // eslint-disable-next-line no-await-in-loop -- streamed download must be sequential
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        // eslint-disable-next-line no-await-in-loop -- preserve write order
        await handle.write(Buffer.from(value));
      }
      await handle.close();
      handle = null;
      await fsp.rename(tmpPath, destPath);
    } catch (error) {
      if (handle) await handle.close().catch(() => undefined);
      await fsp.rm(tmpPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  private async sha256File(filePath: string): Promise<string> {
    const hash = createHash("sha256");
    const handle = await fsp.open(filePath, "r");
    try {
      for await (const chunk of handle.readableWebStream()) {
        hash.update(Buffer.from(chunk as Uint8Array));
      }
    } finally {
      await handle.close();
    }
    return hash.digest("hex");
  }

  /** 시스템 tar 로 tar.gz 를 추출하고 llmfit 바이너리 경로를 반환한다. */
  private async extractBinaryFromTarGz(
    archivePath: string,
    binaryName: string,
    destDir: string,
  ): Promise<string> {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn("tar", ["-xzf", archivePath, "-C", destDir], {
        stdio: ["ignore", "ignore", "pipe"],
      });
      let stderr = "";
      proc.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
      });
      proc.on("error", reject);
      proc.on("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`LLMFIT_TAR_EXTRACT_FAILED:${code}:${stderr.slice(0, 200)}`));
      });
    });

    const found = await this.findBinaryRecursive(destDir, binaryName);
    if (!found) {
      throw new Error(`LLMFIT_BINARY_NOT_FOUND_IN_ARCHIVE:${binaryName}`);
    }
    // 평탄화: 하위 디렉토리에 있으면 binDir 루트로 이동.
    const finalPath = path.join(destDir, binaryName);
    if (found !== finalPath) {
      await fsp.rename(found, finalPath);
    }
    return finalPath;
  }

  /** yauzl 로 zip 을 추출하고 llmfit.exe 를 binDir 에 둔다. */
  private async extractBinaryFromZip(
    archivePath: string,
    binaryName: string,
    destDir: string,
  ): Promise<string> {
    const finalPath = path.join(destDir, binaryName);
    await new Promise<void>((resolve, reject) => {
      yauzl.open(archivePath, { lazyEntries: true }, (openErr, zipfile) => {
        if (openErr || !zipfile) {
          reject(openErr ?? new Error("LLMFIT_ZIP_OPEN_FAILED"));
          return;
        }
        let extracted = false;
        zipfile.readEntry();
        zipfile.on("entry", (entry: yauzl.Entry) => {
          const base = path.posix.basename(entry.fileName);
          if (base !== binaryName) {
            zipfile.readEntry();
            return;
          }
          zipfile.openReadStream(entry, (streamErr, readStream) => {
            if (streamErr || !readStream) {
              reject(streamErr ?? new Error("LLMFIT_ZIP_READ_FAILED"));
              return;
            }
            const writeStream = createWriteStream(finalPath, { mode: 0o755 });
            readStream.on("error", reject);
            writeStream.on("error", reject);
            writeStream.on("finish", () => {
              extracted = true;
              zipfile.close();
              resolve();
            });
            readStream.pipe(writeStream);
          });
        });
        zipfile.on("end", () => {
          if (!extracted) {
            reject(new Error(`LLMFIT_BINARY_NOT_FOUND_IN_ARCHIVE:${binaryName}`));
          }
        });
        zipfile.on("error", reject);
      });
    });
    return finalPath;
  }

  private async findBinaryRecursive(
    dir: string,
    binaryName: string,
  ): Promise<string | null> {
    let entries: Dirent[];
    try {
      entries = (await fsp.readdir(dir, { withFileTypes: true })) as unknown as Dirent[];
    } catch {
      return null;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isFile() && entry.name === binaryName) {
        return full;
      }
    }
    // 한 단계 하위까지만 탐색(릴리스 아카이브는 보통 평탄/1-depth).
    const subdirCandidates = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(dir, entry.name, binaryName));
    const existsFlags = await Promise.all(
      subdirCandidates.map(async (candidate) => {
        try {
          await fsp.access(candidate);
          return true;
        } catch {
          return false;
        }
      }),
    );
    const foundIndex = existsFlags.findIndex(Boolean);
    return foundIndex >= 0 ? subdirCandidates[foundIndex] : null;
  }
}

export const llmfitInstaller = new LlmfitInstaller();
export { LlmfitInstaller };
