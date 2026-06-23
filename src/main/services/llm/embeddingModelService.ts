/**
 * embeddingModelService — bge-m3 임베딩 모델의 경로 해석/다운로드/상태.
 *
 * 배포 정책(사용자 결정): 앱 설치 시 동봉(bundled).
 *   - packaged: <process.resourcesPath>/models/<filename>
 *   - dev:      <repoRoot>/resources/models/<filename>
 * 동봉 파일이 없을 때만(개발 환경/누락) Hugging Face 에서 다운로드 폴백한다.
 *
 * 해석된 경로는 settings(`defaultEmbeddingModelPath`/`defaultEmbeddingModelId`)에
 * 기록되어 modelRuntimeFactory 가 임베딩 런타임을 구성할 때 사용한다.
 */

import * as path from "node:path";
import * as fs from "node:fs";
import { app } from "electron";
import { createLogger } from "../../../shared/logger/index.js";
import { downloadGguf, type ProgressCallback } from "./modelDownloader.js";
import {
  DEFAULT_EMBEDDING_MODEL,
  BUNDLED_MODELS_DIR,
} from "./embeddingModelConstants.js";

const logger = createLogger("EmbeddingModelService");

export type EmbeddingModelStatus = {
  modelId: string;
  displayName: string;
  /** 설치(가용) 여부. */
  installed: boolean;
  /** 해석된 절대 경로(가용 시). */
  path: string | null;
  /** 출처: bundled | downloaded | none. */
  source: "bundled" | "downloaded" | "none";
  dimension: number;
};

class EmbeddingModelService {
  /** 동봉 모델 후보 경로(packaged/dev). */
  private bundledCandidatePaths(): string[] {
    const filename = DEFAULT_EMBEDDING_MODEL.filename;
    const candidates: string[] = [];
    if (typeof process.resourcesPath === "string" && process.resourcesPath.length > 0) {
      candidates.push(path.join(process.resourcesPath, BUNDLED_MODELS_DIR, filename));
    }
    const appPath = typeof app.getAppPath === "function" ? app.getAppPath() : null;
    if (appPath) {
      candidates.push(path.join(appPath, "resources", BUNDLED_MODELS_DIR, filename));
    }
    return candidates;
  }

  /** 사용자 데이터 영역의 다운로드 모델 경로. */
  private downloadedPath(): string {
    return path.join(
      app.getPath("userData"),
      "llm-models",
      DEFAULT_EMBEDDING_MODEL.filename,
    );
  }

  /**
   * 임베딩 모델의 실제 경로를 해석한다.
   * 우선순위: 설정에 기록된 경로 → 동봉 → 다운로드 위치. 없으면 null.
   */
  resolveModelPath(): { path: string; source: "bundled" | "downloaded" } | null {
    for (const candidate of this.bundledCandidatePaths()) {
      if (fs.existsSync(candidate)) {
        return { path: candidate, source: "bundled" };
      }
    }
    const downloaded = this.downloadedPath();
    if (fs.existsSync(downloaded)) {
      return { path: downloaded, source: "downloaded" };
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
    };
  }

  /**
   * 임베딩 모델을 확보한다(동봉되어 있으면 즉시 반환, 없으면 HF 다운로드).
   * @returns 해석된 모델 경로.
   */
  async ensureModel(onProgress?: ProgressCallback): Promise<string> {
    const resolved = this.resolveModelPath();
    if (resolved) {
      onProgress?.({ phase: "done", pct: 100, receivedBytes: 0, totalBytes: 0 });
      return resolved.path;
    }

    logger.info("Embedding model missing; downloading from Hugging Face", {
      repo: DEFAULT_EMBEDDING_MODEL.repo,
      filename: DEFAULT_EMBEDDING_MODEL.filename,
    });
    const destDir = path.join(app.getPath("userData"), "llm-models");
    const modelPath = await downloadGguf({
      repo: DEFAULT_EMBEDDING_MODEL.repo,
      filename: DEFAULT_EMBEDDING_MODEL.filename,
      expectedSha256: DEFAULT_EMBEDDING_MODEL.sha256,
      destDir,
      onProgress,
    });
    return modelPath;
  }
}

export const embeddingModelService = new EmbeddingModelService();
export { EmbeddingModelService };
