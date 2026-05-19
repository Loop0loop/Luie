import { ErrorCode } from "../../shared/constants/errorCode.js";
import path from "node:path";
import { readFile } from "node:fs/promises";
import type {
  RagQaErrorPayload,
  RagQaRequest,
  RagQaResult,
  RagQaRunHandle,
  RagQaStreamPayload,
} from "../../shared/types/index.js";
import { createLogger } from "../../shared/logger/index.js";
import { resolveModelRuntimeClient } from "../services/llm/modelRuntimeFactory.js";
import { assembleRagContext } from "../services/features/rag/contextAssembler.js";
import { normalizeCoreAnswer } from "../services/features/rag/normalizeCoreAnswer.js";
import { resolveUserDataPath } from "../utils/userDataPath.js";

const logger = createLogger("UtilityRagQaWorker");

type ActiveRun = {
  runId: string;
  request: RagQaRequest;
  aborted: boolean;
  abortController: AbortController;
};

type UtilityEventEnvelope =
  | { type: "event"; event: "ragQa.stream"; payload: RagQaStreamPayload }
  | { type: "event"; event: "ragQa.error"; payload: RagQaErrorPayload };

type MessagePortLike = {
  postMessage: (message: UtilityEventEnvelope) => void;
};

const processWithParentPort = process as typeof process & { parentPort?: MessagePortLike };
const processWithSend = process as typeof process & {
  send?: (message: UtilityEventEnvelope) => void;
};

const outboundPort: MessagePortLike | null = processWithParentPort.parentPort ?? null;

class RagQaWorker {
  private activeRuns = new Map<string, ActiveRun>();
  private generationConfigCache:
    | { expiresAt: number; temperature: number; maxTokens: number }
    | null = null;
  private static readonly DEFAULT_TEMPERATURE = 0.2;
  private static readonly DEFAULT_MAX_TOKENS = 1200;
  private static readonly GENERATION_CONFIG_TTL_MS = 10_000;

  private clampTemperature(value: unknown): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return RagQaWorker.DEFAULT_TEMPERATURE;
    }
    return Math.min(2, Math.max(0, value));
  }

  private clampMaxTokens(value: unknown): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return RagQaWorker.DEFAULT_MAX_TOKENS;
    }
    return Math.min(4096, Math.max(128, Math.floor(value)));
  }

  private async loadGenerationConfig(): Promise<{
    temperature: number;
    maxTokens: number;
  }> {
    const now = Date.now();
    if (this.generationConfigCache && this.generationConfigCache.expiresAt > now) {
      return {
        temperature: this.generationConfigCache.temperature,
        maxTokens: this.generationConfigCache.maxTokens,
      };
    }
    const envTemperature = Number.parseFloat(process.env.LUIE_RAG_TEMPERATURE ?? "");
    const envMaxTokens = Number.parseInt(process.env.LUIE_RAG_MAX_TOKENS ?? "", 10);
    let temperature = this.clampTemperature(envTemperature);
    let maxTokens = this.clampMaxTokens(envMaxTokens);
    try {
      const settingsPath = path.join(resolveUserDataPath(), "settings.json");
      const raw = await readFile(settingsPath, "utf8");
      const parsed = JSON.parse(raw) as {
        llm?: { ragTemperature?: unknown; ragMaxTokens?: unknown };
      };
      if (Number.isFinite(envTemperature) === false) {
        temperature = this.clampTemperature(parsed.llm?.ragTemperature);
      }
      if (Number.isFinite(envMaxTokens) === false) {
        maxTokens = this.clampMaxTokens(parsed.llm?.ragMaxTokens);
      }
    } catch {
      // defaults/env만 사용
    }
    this.generationConfigCache = {
      expiresAt: now + RagQaWorker.GENERATION_CONFIG_TTL_MS,
      temperature,
      maxTokens,
    };
    return { temperature, maxTokens };
  }

  private isAbortError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const candidate = error as { name?: unknown; message?: unknown };
    if (candidate.name === "AbortError") return true;
    if (typeof candidate.message === "string" && /aborted/i.test(candidate.message)) {
      return true;
    }
    return false;
  }

  private post(message: UtilityEventEnvelope): void {
    if (outboundPort) {
      outboundPort.postMessage(message);
      return;
    }
    if (typeof processWithSend.send === "function") {
      processWithSend.send(message);
      return;
    }
    logger.warn("Utility RAG QA event dropped: no outbound channel", {
      event: message.event,
    });
  }

  private emitStream(payload: RagQaStreamPayload): void {
    this.post({ type: "event", event: "ragQa.stream", payload });
  }

  private emitError(payload: RagQaErrorPayload): void {
    this.post({ type: "event", event: "ragQa.error", payload });
  }

  private buildRunId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  async ask(input: RagQaRequest): Promise<RagQaRunHandle> {
    const runId = this.buildRunId();
    const run: ActiveRun = {
      runId,
      request: input,
      aborted: false,
      abortController: new AbortController(),
    };
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
      run.abortController.abort();
      return { stopped: true };
    }
    let stopped = false;
    for (const run of this.activeRuns.values()) {
      run.aborted = true;
      run.abortController.abort();
      stopped = true;
    }
    return { stopped };
  }

  private async execute(run: ActiveRun): Promise<void> {
    try {
      const generationConfig = await this.loadGenerationConfig();
      const { assembledPrompt, evidence } = await assembleRagContext({
        projectId: run.request.projectId,
        question: run.request.question,
        chapterId: run.request.chapterId,
        signal: run.abortController.signal,
      });

      if (run.aborted) {
        this.emitError({
          runId: run.runId,
          code: ErrorCode.RAG_QA_ABORTED,
          message: "RAG QA aborted",
        });
        return;
      }

      const runtime = await resolveModelRuntimeClient(run.request.projectId);
      const chunks: string[] = [];

      for await (const delta of runtime.generateStream(assembledPrompt, {
        temperature: generationConfig.temperature,
        maxTokens: generationConfig.maxTokens,
        signal: run.abortController.signal,
      })) {
        if (run.aborted) {
          this.emitError({
            runId: run.runId,
            code: ErrorCode.RAG_QA_ABORTED,
            message: "RAG QA aborted",
          });
          return;
        }
        chunks.push(delta);
        this.emitStream({ runId: run.runId, delta, done: false });
      }

      if (run.aborted) {
        this.emitError({
          runId: run.runId,
          code: ErrorCode.RAG_QA_ABORTED,
          message: "RAG QA aborted",
        });
        return;
      }

      const result: RagQaResult = {
        runId: run.runId,
        projectId: run.request.projectId,
        question: run.request.question,
        answer: normalizeCoreAnswer(chunks.join("")),
        evidence,
        createdAt: new Date().toISOString(),
      };

      this.emitStream({ runId: run.runId, done: true, result });
      logger.info("RAG QA completed", {
        runId: run.runId,
        projectId: run.request.projectId,
        evidenceCount: evidence.length,
      });
    } catch (error) {
      if (this.isAbortError(error) || run.aborted) {
        this.emitError({
          runId: run.runId,
          code: ErrorCode.RAG_QA_ABORTED,
          message: "RAG QA aborted",
        });
        return;
      }
      logger.error("RAG QA failed", {
        runId: run.runId,
        projectId: run.request.projectId,
        error,
      });
      this.emitError({
        runId: run.runId,
        code: ErrorCode.RAG_QA_FAILED,
        message: error instanceof Error ? error.message : "RAG QA failed",
      });
    }
  }
}

export const ragQaWorker = new RagQaWorker();
