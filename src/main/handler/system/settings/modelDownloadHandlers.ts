import { BrowserWindow } from "electron";
import { z } from "zod";
import { IPC_CHANNELS } from "../../../../shared/ipc/channels.js";
import type { IpcHandlerConfig } from "../../core/ipcRegistrar.js";
import {
  DEFAULT_MODEL,
  LLAMA_BINARY_SHA256S,
  LLAMA_BINARY_URLS,
  LLAMA_SERVER_BINARY_IN_ZIP,
  downloadGguf,
  downloadLlamaServerBinary,
  getHfModelFiles,
  invalidateModelRuntimeCache,
  searchHfModels,
  sidecarManager,
} from "../../../domains/settings/llm.js";
import { loadSettingsManager } from "./managerLoader.js";

let activeDownloadAbort: AbortController | null = null;

type ModelDownloadStage = "binary" | "model" | "complete" | "error";

const modelDownloadInputSchema = z
  .strictObject({
    type: z.enum(["model", "binary"]),
    repo: z.string().min(1).max(512).optional(),
    filename: z.string().min(1).max(1024).optional(),
  })
  .refine(
    (value) => Boolean(value.repo) === Boolean(value.filename),
    "repo and filename must be provided together",
  );

const emitModelDownloadProgress = (
  stage: ModelDownloadStage,
  pct: number,
  error?: string,
) => {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.MODEL_DOWNLOAD_PROGRESS, {
        stage,
        pct,
        error,
      });
    }
  }
};

async function runModelDownload(input: {
  type: "model" | "binary";
  repo?: string;
  filename?: string;
  signal: AbortSignal;
}) {
  const platform = `${process.platform}-${process.arch}`;
  const binUrl = LLAMA_BINARY_URLS[platform];
  const expectedSha256 = LLAMA_BINARY_SHA256S[platform];
  if (!binUrl || !expectedSha256) {
    throw new Error(`지원하지 않는 플랫폼: ${platform}`);
  }

  const settingsManager = await loadSettingsManager();
  const current = settingsManager.getLocalLlmSettings();

  let binaryPath = current?.binaryPath;
  let modelPath = current?.modelPath;

  if (input.type === "binary") {
    binaryPath = await downloadLlamaServerBinary({
      zipUrl: binUrl,
      expectedSha256,
      destDir: sidecarManager.getBinDir(),
      binaryNameInZip: LLAMA_SERVER_BINARY_IN_ZIP,
      signal: input.signal,
      onProgress: (progress) =>
        emitModelDownloadProgress("binary", progress.pct),
    });
  } else {
    if (!binaryPath) {
      binaryPath = await downloadLlamaServerBinary({
        zipUrl: binUrl,
        expectedSha256,
        destDir: sidecarManager.getBinDir(),
        binaryNameInZip: LLAMA_SERVER_BINARY_IN_ZIP,
        signal: input.signal,
        onProgress: (progress) =>
          emitModelDownloadProgress("binary", progress.pct),
      });
    }
    modelPath = await downloadGguf({
      repo: input.repo ?? DEFAULT_MODEL.repo,
      filename: input.filename ?? DEFAULT_MODEL.filename,
      expectedSha256:
        input.repo || input.filename ? undefined : DEFAULT_MODEL.sha256,
      destDir: sidecarManager.getModelsDir(),
      signal: input.signal,
      onProgress: (progress) =>
        emitModelDownloadProgress("model", progress.pct),
    });
  }

  settingsManager.setLocalLlmSettings({
    enabled: Boolean(binaryPath && modelPath),
    binaryPath,
    modelPath,
    gpuLayers: current?.gpuLayers,
    contextSize: current?.contextSize,
    cacheRamMiB: current?.cacheRamMiB,
    cacheReuse: current?.cacheReuse,
  });
  invalidateModelRuntimeCache();
}

export function createModelDownloadHandlers(): IpcHandlerConfig[] {
  return [
    {
      channel: IPC_CHANNELS.MODEL_DOWNLOAD_START,
      logTag: "MODEL_DOWNLOAD_START",
      failMessage: "Failed to start model download",
      argsSchema: z.tuple([modelDownloadInputSchema]),
      handler: async (input: {
        type: "model" | "binary";
        repo?: string;
        filename?: string;
      }) => {
        activeDownloadAbort?.abort();
        activeDownloadAbort = new AbortController();
        const { signal } = activeDownloadAbort;

        void (async () => {
          try {
            await runModelDownload({ ...input, signal });
            emitModelDownloadProgress("complete", 100);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            emitModelDownloadProgress("error", 0, message);
          } finally {
            activeDownloadAbort = null;
          }
        })();

        return { ok: true };
      },
    },
    {
      channel: IPC_CHANNELS.MODEL_DOWNLOAD_CANCEL,
      logTag: "MODEL_DOWNLOAD_CANCEL",
      failMessage: "Failed to cancel model download",
      handler: async () => {
        activeDownloadAbort?.abort();
        activeDownloadAbort = null;
        return { ok: true };
      },
    },
    {
      channel: IPC_CHANNELS.MODEL_SEARCH_HF,
      logTag: "MODEL_SEARCH_HF",
      failMessage: "HF model search failed",
      argsSchema: z.tuple([
        z.strictObject({ query: z.string().min(1).max(200) }),
      ]),
      handler: async (input: { query: string }) =>
        await searchHfModels(input.query),
    },
    {
      channel: IPC_CHANNELS.MODEL_GET_HF_FILES,
      logTag: "MODEL_GET_HF_FILES",
      failMessage: "HF model files fetch failed",
      argsSchema: z.tuple([
        z.strictObject({ repoId: z.string().min(1).max(512) }),
      ]),
      handler: async (input: { repoId: string }) =>
        await getHfModelFiles(input.repoId),
    },
  ];
}
