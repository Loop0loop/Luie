import { BrowserWindow } from "electron";
import { z } from "zod";
import { IPC_CHANNELS } from "../../../../shared/ipc/channels.js";
import type { IpcHandlerConfig } from "../../core/ipcRegistrar.js";
import {
  embeddingModelService,
  invalidateModelRuntimeCache,
  llmfitInstaller,
  llmfitService,
} from "../../../domains/settings/llm.js";

type EmbeddingDownloadStage = "downloading" | "complete" | "error";

const emitEmbeddingDownloadProgress = (
  stage: EmbeddingDownloadStage,
  pct: number,
  error?: string,
) => {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.EMBEDDING_MODEL_DOWNLOAD_PROGRESS, {
        stage,
        pct,
        error,
      });
    }
  }
};

export function createLlmfitEmbeddingHandlers(): IpcHandlerConfig[] {
  return [
    {
      channel: IPC_CHANNELS.LLMFIT_GET_RECOMMENDATIONS,
      logTag: "LLMFIT_GET_RECOMMENDATIONS",
      failMessage: "Failed to get llmfit recommendations",
      argsSchema: z.tuple([
        z
          .strictObject({
            limit: z.number().int().min(1).max(50).optional(),
            useCase: z
              .enum([
                "general",
                "coding",
                "reasoning",
                "chat",
                "multimodal",
                "embedding",
              ])
              .optional(),
            minFit: z
              .enum(["perfect", "good", "marginal", "too_tight"])
              .optional(),
          })
          .optional(),
      ]),
      // NOTE: llmfitService 실패는 예외 대신 available=false 계약으로 전달한다.
      handler: async (options?: {
        limit?: number;
        useCase?: string;
        minFit?: string;
      }) => await llmfitService.recommend(options ?? {}),
    },
    {
      channel: IPC_CHANNELS.LLMFIT_INSTALL,
      logTag: "LLMFIT_INSTALL",
      failMessage: "Failed to install llmfit",
      argsSchema: z.tuple([]),
      // NOTE: installer 실패는 예외 대신 installed=false 계약으로 전달한다.
      handler: async () => await llmfitInstaller.ensureInstalled(),
    },
    {
      channel: IPC_CHANNELS.LLMFIT_STATUS,
      logTag: "LLMFIT_STATUS",
      failMessage: "Failed to get llmfit status",
      argsSchema: z.tuple([]),
      handler: async () => await llmfitInstaller.getStatus(),
    },
    {
      channel: IPC_CHANNELS.EMBEDDING_MODEL_STATUS,
      logTag: "EMBEDDING_MODEL_STATUS",
      failMessage: "Failed to get embedding model status",
      argsSchema: z.tuple([]),
      handler: async () => {
        const status = embeddingModelService.getStatus();
        // NOTE: renderer 경계에는 설치 binary의 절대 경로를 노출하지 않는다.
        return {
          modelId: status.modelId,
          displayName: status.displayName,
          installed: status.installed,
          source: status.source,
          dimension: status.dimension,
          downloading: status.downloading,
          progressPct: status.progressPct,
        };
      },
    },
    {
      channel: IPC_CHANNELS.EMBEDDING_MODEL_DOWNLOAD,
      logTag: "EMBEDDING_MODEL_DOWNLOAD",
      failMessage: "Failed to download embedding model",
      argsSchema: z.tuple([]),
      handler: async () => {
        // NOTE: 원격 설치는 settings 응답을 막지 않도록 background에서 실행한다.
        void (async () => {
          try {
            await embeddingModelService.ensureModel((progress) => {
              if (progress.phase === "downloading") {
                emitEmbeddingDownloadProgress("downloading", progress.pct);
              }
            });
            emitEmbeddingDownloadProgress("complete", 100);
            invalidateModelRuntimeCache();
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            emitEmbeddingDownloadProgress("error", 0, message);
          }
        })();

        return { ok: true };
      },
    },
  ];
}
