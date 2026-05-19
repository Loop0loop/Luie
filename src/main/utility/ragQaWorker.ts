import { ErrorCode } from "../../shared/constants/errorCode.js";
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

const logger = createLogger("UtilityRagQaWorker");

type ActiveRun = {
  runId: string;
  request: RagQaRequest;
  aborted: boolean;
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

function normalizeCoreAnswer(raw: string): string {
  const withoutCodeFence = raw.replace(/```[\s\S]*?```/g, "").trim();
  const lines = withoutCodeFence
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const filtered = lines.filter(
    (line) =>
      !/^okay[,!]?/i.test(line) &&
      !/^let'?s\s+/i.test(line) &&
      !/^starting with/i.test(line) &&
      !/^the user/i.test(line),
  );
  const deduped: string[] = [];
  let repeatCount = 0;
  for (const line of filtered) {
    const last = deduped[deduped.length - 1];
    if (last === line) {
      repeatCount += 1;
      if (repeatCount > 1) continue;
    } else {
      repeatCount = 0;
    }
    deduped.push(line);
  }
  const merged = deduped.join("\n");
  return merged.slice(0, 1800).trim();
}


class RagQaWorker {
  private activeRuns = new Map<string, ActiveRun>();

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
    const run: ActiveRun = { runId, request: input, aborted: false };
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
        this.emitStream({ runId: run.runId, delta, done: false });
      }

      if (run.aborted) return;

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
