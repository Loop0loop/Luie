import * as path from "node:path";
import * as fs from "node:fs";
import { app } from "electron";
import { createLogger } from "../../../../shared/logger/index.js";
import { downloadGguf, type ProgressCallback } from "../../../infra/llm/modelDownloader.js";
import {
  DEFAULT_EMBEDDING_MODEL,
  BUNDLED_MODELS_DIR,
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
};

class EmbeddingModelService {
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
