import * as path from "node:path";
import * as fs from "node:fs";
import { app } from "electron";
import { createLogger } from "../../../../shared/logger/index.js";
import { downloadGguf, type ProgressCallback } from "../../../infra/llm/modelDownloader.js";
import {
  DEFAULT_EMBEDDING_MODEL,
  BUNDLED_MODELS_DIR,
  USER_MODELS_DIR,
  LEGACY_USER_MODELS_DIR,
} from "./embeddingModelConstants.js";

const logger = createLogger("EmbeddingModelService");

export type EmbeddingModelStatus = {
  modelId: string;
  displayName: string;
  installed: boolean;
  path: string | null;
  /** 출처: bundled | downloaded | none. */
  source: "bundled" | "downloaded" | "none";
  dimension: number;
  /** 백그라운드 설치 진행 여부. */
  downloading: boolean;
  /** 마지막 관측 진행률(0-100). 진행 중이 아니면 null. */
  progressPct: number | null;
};

class EmbeddingModelService {
  /** 진행 중 다운로드. ensureModel 재호출은 이 프로미스에 합류한다. */
  private activeDownload: Promise<string> | null = null;
  private lastProgressPct: number | null = null;
  /**
   * 진행률 구독자. 합류 호출자(위저드 + 설정 화면)도 같은 다운로드의
   * 진행률을 받아야 하므로 콜백을 호출자별로 보관한다.
   */
  private progressListeners = new Set<ProgressCallback>();

  private bundledCandidatePaths(): string[] {
    const filename = DEFAULT_EMBEDDING_MODEL.filename;
    const candidates: string[] = [];
    if (typeof process.resourcesPath === "string" && process.resourcesPath.length > 0) {
      candidates.push(path.join(process.resourcesPath, BUNDLED_MODELS_DIR, filename));
    }
    const appPath = typeof app.getAppPath === "function" ? app.getAppPath() : null;
    if (appPath) {
      // NOTE: 개발 환경(appPath=저장소 루트)에서 stage:embedding-model 결과를 그대로
      // 재사용하기 위한 후보다. 패키지 빌드에는 모델을 동봉하지 않는다.
      candidates.push(path.join(appPath, "resources", BUNDLED_MODELS_DIR, filename));
    }
    return candidates;
  }

  private userCandidatePaths(): string[] {
    const filename = DEFAULT_EMBEDDING_MODEL.filename;
    const userDataPath = app.getPath("userData");
    return [
      path.join(userDataPath, USER_MODELS_DIR, filename),
      path.join(userDataPath, LEGACY_USER_MODELS_DIR, filename),
    ];
  }

  /**
   * 임베딩 모델의 실제 경로를 해석한다.
   * 우선순위: 동봉(개발 환경) → userData/models → 구버전 userData/llm-models. 없으면 null.
   */
  resolveModelPath(): { path: string; source: "bundled" | "downloaded" } | null {
    for (const candidate of this.bundledCandidatePaths()) {
      if (fs.existsSync(candidate)) {
        return { path: candidate, source: "bundled" };
      }
    }
    for (const candidate of this.userCandidatePaths()) {
      if (fs.existsSync(candidate)) {
        return { path: candidate, source: "downloaded" };
      }
    }
    return null;
  }

  getStatus(): EmbeddingModelStatus {
    const resolved = this.resolveModelPath();
    return {
      modelId: DEFAULT_EMBEDDING_MODEL.modelId,
      displayName: DEFAULT_EMBEDDING_MODEL.displayName,
      installed: resolved !== null,
      path: resolved?.path ?? null,
      source: resolved?.source ?? "none",
      dimension: DEFAULT_EMBEDDING_MODEL.dimension,
      downloading: this.activeDownload !== null,
      progressPct: this.lastProgressPct,
    };
  }

  /**
   * 임베딩 모델을 확보한다(동봉되어 있으면 즉시 반환, 없으면 HF 다운로드).
   * 동시 호출은 같은 다운로드에 합류하므로 위저드와 설정 화면이 겹쳐 호출해도 안전하다.
   * @returns 해석된 모델 경로.
   */
  async ensureModel(onProgress?: ProgressCallback): Promise<string> {
    if (onProgress) {
      this.progressListeners.add(onProgress);
    }
    try {
      if (this.activeDownload) {
        return await this.activeDownload;
      }
      const download = this.runEnsure();
      this.activeDownload = download;
      try {
        return await download;
      } finally {
        // NOTE: 성공/실패와 무관하게 반드시 비워 재시도 가능하게 한다.
        if (this.activeDownload === download) {
          this.activeDownload = null;
          this.lastProgressPct = null;
        }
      }
    } finally {
      if (onProgress) {
        this.progressListeners.delete(onProgress);
      }
    }
  }

  private async runEnsure(): Promise<string> {
    const resolved = this.resolveModelPath();
    if (resolved) {
      this.lastProgressPct = 100;
      this.emitProgress({ phase: "done", pct: 100, receivedBytes: 0, totalBytes: 0 });
      return resolved.path;
    }

    logger.info("Embedding model missing; downloading from Hugging Face", {
      repo: DEFAULT_EMBEDDING_MODEL.repo,
      filename: DEFAULT_EMBEDDING_MODEL.filename,
      destDir: path.join(app.getPath("userData"), USER_MODELS_DIR),
    });
    this.lastProgressPct = 0;
    const modelPath = await downloadGguf({
      repo: DEFAULT_EMBEDDING_MODEL.repo,
      filename: DEFAULT_EMBEDDING_MODEL.filename,
      expectedSha256: DEFAULT_EMBEDDING_MODEL.sha256,
      destDir: path.join(app.getPath("userData"), USER_MODELS_DIR),
      onProgress: (progress) => {
        if (progress.phase === "downloading") {
          this.lastProgressPct = progress.pct;
        }
        this.emitProgress(progress);
      },
    });
    this.lastProgressPct = 100;
    return modelPath;
  }

  private emitProgress(progress: Parameters<ProgressCallback>[0]): void {
    for (const listener of this.progressListeners) {
      listener(progress);
    }
  }
}

export const embeddingModelService = new EmbeddingModelService();
export { EmbeddingModelService };
