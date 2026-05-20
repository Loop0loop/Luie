import { app, safeStorage } from "electron";
import path from "node:path";
import { promises as fs, createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { createLogger } from "../../../shared/logger/index.js";
import { settingsManager } from "../../manager/settingsManager.js";
import type {
  LlmModelDownloadStatus,
  LlmModelSettingsView,
  LocalLlmModelInfo,
  HfModelSearchResult,
  HfModelFile,
} from "../../../shared/types/index.js";

const logger = createLogger("ModelStorageService");

const DEFAULT_MODEL = {
  modelId: "qwen3-4b-q4_k_m",
  repo: "Qwen/Qwen3-4B-GGUF",
  fileName: "Qwen3-4B-Q4_K_M.gguf",
};

const DEFAULT_EMBEDDING_MODEL = {
  modelId: process.env.LUIE_DEFAULT_EMBED_MODEL_ID ?? "bge-m3-q8_0",
  repo: process.env.LUIE_DEFAULT_EMBED_MODEL_REPO ?? "CompendiumLabs/bge-m3-gguf",
  fileName: process.env.LUIE_DEFAULT_EMBED_MODEL_FILE ?? "bge-m3-q8_0.gguf",
};

async function ensureDir(target: string): Promise<void> {
  await fs.mkdir(target, { recursive: true });
}

async function hashFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(filePath)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolve(hash.digest("hex")))
      .on("error", reject);
  });
}

async function listGgufFiles(
  modelsDir: string,
  defaultPath: string | null,
): Promise<LocalLlmModelInfo[]> {
  await ensureDir(modelsDir);
  const entries = await fs.readdir(modelsDir, { withFileTypes: true });
  const models: LocalLlmModelInfo[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith(".gguf")) continue;
    const modelPath = path.join(modelsDir, entry.name);
    const stat = await fs.stat(modelPath);
    models.push({
      id: entry.name,
      fileName: entry.name,
      path: modelPath,
      sizeBytes: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      isDefault: defaultPath === modelPath,
    });
  }
  models.sort((a, b) => (a.fileName < b.fileName ? -1 : 1));
  return models;
}

class ModelStorageService {
  private downloadStatus: LlmModelDownloadStatus = {
    active: false,
    modelId: DEFAULT_MODEL.modelId,
    fileName: DEFAULT_MODEL.fileName,
    downloadedBytes: 0,
    totalBytes: null,
    percent: null,
  };

  private encryptToken(token: string): string {
    if (safeStorage.isEncryptionAvailable()) {
      const cipher = safeStorage.encryptString(token).toString("base64");
      return `v2:enc:${cipher}`;
    }
    return `v2:plain:${Buffer.from(token, "utf8").toString("base64")}`;
  }

  private decryptToken(cipher: string | undefined): string | null {
    if (!cipher) return null;
    if (cipher.startsWith("v2:enc:")) {
      const encoded = cipher.slice("v2:enc:".length);
      const payload = Buffer.from(encoded, "base64");
      return safeStorage.decryptString(payload);
    }
    if (cipher.startsWith("v2:plain:")) {
      const encoded = cipher.slice("v2:plain:".length);
      return Buffer.from(encoded, "base64").toString("utf8");
    }
    return null;
  }

  getDefaultModelsDir(): string {
    return path.join(app.getPath("userData"), "models");
  }

  getConfiguredModelsDir(): string {
    return (
      settingsManager.getLlmSettings().modelsDir ?? this.getDefaultModelsDir()
    );
  }

  async getView(): Promise<LlmModelSettingsView> {
    const llm = settingsManager.getLlmSettings();
    const modelsDir = llm.modelsDir ?? this.getDefaultModelsDir();
    const defaultModelPath = llm.defaultModelPath ?? null;
    const models = await listGgufFiles(modelsDir, defaultModelPath);
    return {
      modelsDir,
      defaultModelPath,
      defaultModelId: llm.defaultModelId ?? null,
      defaultEmbeddingModelPath: llm.defaultEmbeddingModelPath ?? null,
      defaultEmbeddingModelId: llm.defaultEmbeddingModelId ?? null,
      models,
      hasHuggingFaceToken: Boolean(llm.hfTokenCipher),
      contextSize: llm.contextSize,
      gpuLayers: llm.gpuLayers,
      ragTemperature: llm.ragTemperature,
      ragMaxTokens: llm.ragMaxTokens,
    };
  }

  getDownloadStatus(): LlmModelDownloadStatus {
    return { ...this.downloadStatus };
  }

  setHuggingFaceToken(token: string): { saved: boolean } {
    const normalized = token.trim();
    if (!normalized) {
      settingsManager.setLlmSettings({ hfTokenCipher: undefined });
      return { saved: false };
    }
    settingsManager.setLlmSettings({
      hfTokenCipher: this.encryptToken(normalized),
    });
    return { saved: true };
  }

  async setDefaultModel(input: {
    modelPath: string;
    modelId?: string;
  }): Promise<LlmModelSettingsView> {
    const resolved = path.resolve(input.modelPath);
    await fs.access(resolved);
    settingsManager.setLlmSettings({
      defaultModelPath: resolved,
      defaultModelId:
        input.modelId ?? path.basename(resolved, path.extname(resolved)),
      llmProviderHint: "llamacpp",
    });
    return this.getView();
  }

  async setDefaultEmbeddingModel(input: {
    modelPath: string;
    modelId?: string;
  }): Promise<LlmModelSettingsView> {
    const resolved = path.resolve(input.modelPath);
    await fs.access(resolved);
    settingsManager.setLlmSettings({
      defaultEmbeddingModelPath: resolved,
      defaultEmbeddingModelId:
        input.modelId ?? path.basename(resolved, path.extname(resolved)),
    });
    return this.getView();
  }

  async downloadDefaultModel(): Promise<{
    downloaded: boolean;
    modelPath: string;
    modelId: string;
  }> {
    if (this.downloadStatus.active) {
      const llm = settingsManager.getLlmSettings();
      const modelsDir = llm.modelsDir ?? this.getDefaultModelsDir();
      return {
        downloaded: false,
        modelPath: path.join(modelsDir, DEFAULT_MODEL.fileName),
        modelId: DEFAULT_MODEL.modelId,
      };
    }
    const llm = settingsManager.getLlmSettings();
    const modelsDir = llm.modelsDir ?? this.getDefaultModelsDir();
    await ensureDir(modelsDir);
    const modelPath = path.join(modelsDir, DEFAULT_MODEL.fileName);
    const partPath = `${modelPath}.part`;
    const url = `https://huggingface.co/${DEFAULT_MODEL.repo}/resolve/main/${encodeURIComponent(DEFAULT_MODEL.fileName)}`;

    try {
      await fs.access(modelPath);
      settingsManager.setLlmSettings({
        defaultModelPath: modelPath,
        defaultModelId: DEFAULT_MODEL.modelId,
        llmProviderHint: "llamacpp",
      });
      return { downloaded: false, modelPath, modelId: DEFAULT_MODEL.modelId };
    } catch {
      // continue
    }

    logger.info("Downloading default model", { url, modelPath });
    this.downloadStatus = {
      active: true,
      modelId: DEFAULT_MODEL.modelId,
      fileName: DEFAULT_MODEL.fileName,
      downloadedBytes: 0,
      totalBytes: null,
      percent: null,
      startedAt: new Date().toISOString(),
    };
    const hfToken = this.decryptToken(llm.hfTokenCipher);
    const response = await fetch(url, {
      headers: hfToken ? { Authorization: `Bearer ${hfToken}` } : undefined,
    });
    if (!response.ok || !response.body) {
      this.downloadStatus = {
        ...this.downloadStatus,
        active: false,
        error: `HTTP ${response.status} ${response.statusText}`,
      };
      throw new Error(
        `Model download failed: ${response.status} ${response.statusText}`,
      );
    }

    const total = Number(response.headers.get("content-length") ?? "0");
    const stream = response.body;
    const writer = await fs.open(partPath, "w");
    let downloaded = 0;
    try {
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        await writer.write(value);
        downloaded += value.byteLength;
        this.downloadStatus = {
          ...this.downloadStatus,
          downloadedBytes: downloaded,
          totalBytes: total > 0 ? total : null,
          percent: total > 0 ? Math.min(100, (downloaded / total) * 100) : null,
        };
      }
    } finally {
      await writer.close();
    }

    await fs.rename(partPath, modelPath);
    const sha256 = await hashFileSha256(modelPath);
    await fs.writeFile(
      `${modelPath}.sha256`,
      `${sha256}  ${DEFAULT_MODEL.fileName}\n`,
      "utf8",
    );

    settingsManager.setLlmSettings({
      defaultModelPath: modelPath,
      defaultModelId: DEFAULT_MODEL.modelId,
      llmProviderHint: "llamacpp",
    });

    this.downloadStatus = {
      ...this.downloadStatus,
      active: false,
      downloadedBytes: downloaded,
      totalBytes: total > 0 ? total : null,
      percent: 100,
    };
    logger.info("Default model download completed", {
      modelPath,
      downloaded,
      total,
    });
    return { downloaded: true, modelPath, modelId: DEFAULT_MODEL.modelId };
  }

  async downloadDefaultEmbeddingModel(): Promise<{
    downloaded: boolean;
    modelPath: string;
    modelId: string;
  }> {
    if (this.downloadStatus.active) {
      const llm = settingsManager.getLlmSettings();
      const modelsDir = llm.modelsDir ?? this.getDefaultModelsDir();
      return {
        downloaded: false,
        modelPath: path.join(modelsDir, DEFAULT_EMBEDDING_MODEL.fileName),
        modelId: DEFAULT_EMBEDDING_MODEL.modelId,
      };
    }
    const llm = settingsManager.getLlmSettings();
    const modelsDir = llm.modelsDir ?? this.getDefaultModelsDir();
    await ensureDir(modelsDir);
    const modelPath = path.join(modelsDir, DEFAULT_EMBEDDING_MODEL.fileName);
    const partPath = `${modelPath}.part`;
    const url = `https://huggingface.co/${DEFAULT_EMBEDDING_MODEL.repo}/resolve/main/${encodeURIComponent(DEFAULT_EMBEDDING_MODEL.fileName)}`;

    try {
      await fs.access(modelPath);
      settingsManager.setLlmSettings({
        defaultEmbeddingModelPath: modelPath,
        defaultEmbeddingModelId: DEFAULT_EMBEDDING_MODEL.modelId,
      });
      return { downloaded: false, modelPath, modelId: DEFAULT_EMBEDDING_MODEL.modelId };
    } catch {
      // continue
    }

    logger.info("Downloading default embedding model", { url, modelPath });
    this.downloadStatus = {
      active: true,
      modelId: DEFAULT_EMBEDDING_MODEL.modelId,
      fileName: DEFAULT_EMBEDDING_MODEL.fileName,
      downloadedBytes: 0,
      totalBytes: null,
      percent: null,
      startedAt: new Date().toISOString(),
    };
    const hfToken = this.decryptToken(llm.hfTokenCipher);
    const response = await fetch(url, {
      headers: hfToken ? { Authorization: `Bearer ${hfToken}` } : undefined,
    });
    if (!response.ok || !response.body) {
      this.downloadStatus = {
        ...this.downloadStatus,
        active: false,
        error: `HTTP ${response.status} ${response.statusText}`,
      };
      throw new Error(
        `Embedding model download failed: ${response.status} ${response.statusText}`,
      );
    }

    const total = Number(response.headers.get("content-length") ?? "0");
    const stream = response.body;
    const writer = await fs.open(partPath, "w");
    let downloaded = 0;
    try {
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        await writer.write(value);
        downloaded += value.byteLength;
        this.downloadStatus = {
          ...this.downloadStatus,
          downloadedBytes: downloaded,
          totalBytes: total > 0 ? total : null,
          percent: total > 0 ? Math.min(100, (downloaded / total) * 100) : null,
        };
      }
    } finally {
      await writer.close();
    }

    await fs.rename(partPath, modelPath);
    const sha256 = await hashFileSha256(modelPath);
    await fs.writeFile(
      `${modelPath}.sha256`,
      `${sha256}  ${DEFAULT_EMBEDDING_MODEL.fileName}\n`,
      "utf8",
    );

    settingsManager.setLlmSettings({
      defaultEmbeddingModelPath: modelPath,
      defaultEmbeddingModelId: DEFAULT_EMBEDDING_MODEL.modelId,
    });

    this.downloadStatus = {
      ...this.downloadStatus,
      active: false,
      downloadedBytes: downloaded,
      totalBytes: total > 0 ? total : null,
      percent: 100,
    };
    logger.info("Default embedding model download completed", {
      modelPath,
      downloaded,
      total,
    });
    return { downloaded: true, modelPath, modelId: DEFAULT_EMBEDDING_MODEL.modelId };
  }

  async searchHfModels(query: string): Promise<HfModelSearchResult[]> {
    const llm = settingsManager.getLlmSettings();
    const hfToken = this.decryptToken(llm.hfTokenCipher);
    const url = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&filter=gguf&library=gguf&limit=20&sort=downloads&direction=-1`;
    const response = await fetch(url, {
      headers: hfToken ? { Authorization: `Bearer ${hfToken}` } : undefined,
    });
    if (!response.ok) throw new Error(`HF search failed: ${response.status}`);
    const raw = await response.json() as Array<{
      modelId?: string;
      id?: string;
      downloads?: number;
      likes?: number;
      lastModified?: string;
    }>;
    return raw.map((m) => ({
      modelId: m.modelId ?? m.id ?? "",
      downloads: m.downloads ?? 0,
      likes: m.likes ?? 0,
      lastModified: m.lastModified ?? "",
    }));
  }

  async getHfModelFiles(repoId: string): Promise<HfModelFile[]> {
    const llm = settingsManager.getLlmSettings();
    const hfToken = this.decryptToken(llm.hfTokenCipher);
    const url = `https://huggingface.co/api/models/${encodeURIComponent(repoId)}`;
    const response = await fetch(url, {
      headers: hfToken ? { Authorization: `Bearer ${hfToken}` } : undefined,
    });
    if (!response.ok) throw new Error(`HF model info failed: ${response.status}`);
    const raw = await response.json() as {
      siblings?: Array<{ rfilename?: string; size?: number }>;
    };
    return (raw.siblings ?? [])
      .filter((s) => s.rfilename?.toLowerCase().endsWith(".gguf"))
      .map((s) => ({ filename: s.rfilename ?? "", size: s.size ?? null }))
      .sort((a, b) => a.filename.localeCompare(b.filename));
  }

  async downloadHfModel(repoId: string, filename: string, modelId: string): Promise<void> {
    if (this.downloadStatus.active) {
      throw new Error("Download already in progress");
    }
    const llm = settingsManager.getLlmSettings();
    const modelsDir = llm.modelsDir ?? this.getDefaultModelsDir();
    await ensureDir(modelsDir);
    const modelPath = path.join(modelsDir, filename);
    const partPath = `${modelPath}.part`;
    const url = `https://huggingface.co/${repoId}/resolve/main/${encodeURIComponent(filename)}`;
    const hfToken = this.decryptToken(llm.hfTokenCipher);

    try {
      await fs.access(modelPath);
      settingsManager.setLlmSettings({ defaultModelPath: modelPath, defaultModelId: modelId, llmProviderHint: "llamacpp" });
      return;
    } catch { /* not cached, download */ }

    logger.info("Downloading HF model", { url, modelPath });
    this.downloadStatus = {
      active: true,
      modelId,
      fileName: filename,
      downloadedBytes: 0,
      totalBytes: null,
      percent: null,
      startedAt: new Date().toISOString(),
    };

    void (async () => {
      try {
        const response = await fetch(url, {
          headers: hfToken ? { Authorization: `Bearer ${hfToken}` } : undefined,
        });
        if (!response.ok || !response.body) {
          this.downloadStatus = { ...this.downloadStatus, active: false, error: `HTTP ${response.status} ${response.statusText}` };
          return;
        }
        const total = Number(response.headers.get("content-length") ?? "0");
        const writer = await fs.open(partPath, "w");
        let downloaded = 0;
        try {
          const reader = response.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value) continue;
            await writer.write(value);
            downloaded += value.byteLength;
            this.downloadStatus = {
              ...this.downloadStatus,
              downloadedBytes: downloaded,
              totalBytes: total > 0 ? total : null,
              percent: total > 0 ? Math.min(100, (downloaded / total) * 100) : null,
            };
          }
        } finally {
          await writer.close();
        }
        await fs.rename(partPath, modelPath);
        settingsManager.setLlmSettings({ defaultModelPath: modelPath, defaultModelId: modelId, llmProviderHint: "llamacpp" });
        this.downloadStatus = { ...this.downloadStatus, active: false, downloadedBytes: downloaded, totalBytes: total > 0 ? total : null, percent: 100 };
        logger.info("HF model download completed", { modelPath });
      } catch (err) {
        this.downloadStatus = { ...this.downloadStatus, active: false, error: err instanceof Error ? err.message : String(err) };
        logger.error("HF model download failed", { error: err });
        try { await fs.unlink(partPath); } catch { /* ignore */ }
      }
    })();
  }
}

export const modelStorageService = new ModelStorageService();
