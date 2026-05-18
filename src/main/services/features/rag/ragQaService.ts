import type { BrowserWindow } from "electron";
import { IPC_CHANNELS } from "../../../../shared/ipc/channels.js";
import { createLogger } from "../../../../shared/logger/index.js";
import { ErrorCode } from "../../../../shared/constants/errorCode.js";
import type {
  RagQaErrorPayload,
  RagQaRequest,
  RagQaResult,
  RagQaRunHandle,
  RagQaStreamPayload,
} from "../../../../shared/types/index.js";
import { resolveModelRuntimeClient } from "../../llm/modelRuntimeFactory.js";
import { assembleRagContext } from "./contextAssembler.js";

const logger = createLogger("RagQaService");

type ActiveRun = {
  runId: string;
  window: BrowserWindow;
  request: RagQaRequest;
  aborted: boolean;
};

class RagQaService {
  private activeRuns = new Map<string, ActiveRun>();

  private emitStream(window: BrowserWindow, payload: RagQaStreamPayload): void {
    if (window.isDestroyed()) return;
    window.webContents.send(IPC_CHANNELS.RAG_QA_STREAM, payload);
  }

  private emitError(window: BrowserWindow, payload: RagQaErrorPayload): void {
    if (window.isDestroyed()) return;
    window.webContents.send(IPC_CHANNELS.RAG_QA_ERROR, payload);
  }

  private buildRunId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  async ask(input: RagQaRequest, window: BrowserWindow): Promise<RagQaRunHandle> {
    const runId = this.buildRunId();
    const run: ActiveRun = { runId, window, request: input, aborted: false };
    this.activeRuns.set(runId, run);

    void this.execute(run).finally(() => {
      this.activeRuns.delete(runId);
    });

    return { runId };
  }

  stop(runId?: string): { stopped: boolean } {
    if (runId) {
      const run = this.activeRuns.get(runId);
      if (!run) return { stopped: false };
      run.aborted = true;
      return { stopped: true };
    }
    let stopped = false;
    for (const run of this.activeRuns.values()) {
      run.aborted = true;
      stopped = true;
    }
    return { stopped };
  }

  private async execute(run: ActiveRun): Promise<void> {
    try {
      const { assembledPrompt, evidence } = await assembleRagContext({
        projectId: run.request.projectId,
        question: run.request.question,
        chapterId: run.request.chapterId,
      });

      if (run.aborted) return;

      const runtime = await resolveModelRuntimeClient(run.request.projectId);
      const chunks: string[] = [];

      for await (const delta of runtime.generateStream(assembledPrompt, {
        temperature: 0.2,
        maxTokens: 1200,
      })) {
        if (run.aborted) return;
        chunks.push(delta);
        this.emitStream(run.window, {
          runId: run.runId,
          delta,
          done: false,
        });
      }

      if (run.aborted) return;

      const result: RagQaResult = {
        runId: run.runId,
        projectId: run.request.projectId,
        question: run.request.question,
        answer: chunks.join(""),
        evidence,
        createdAt: new Date().toISOString(),
      };

      this.emitStream(run.window, {
        runId: run.runId,
        done: true,
        result,
      });
      logger.info("RAG QA completed", {
        runId: run.runId,
        projectId: run.request.projectId,
        evidenceCount: evidence.length,
      });
    } catch (error) {
      logger.error("RAG QA failed", {
        runId: run.runId,
        projectId: run.request.projectId,
        error,
      });
      this.emitError(run.window, {
        runId: run.runId,
        code: ErrorCode.SEARCH_QUERY_FAILED,
        message: error instanceof Error ? error.message : "RAG QA failed",
      });
    }
  }
}

export const ragQaService = new RagQaService();
