import type {
  RagQaErrorPayload,
  RagQaRequest,
  RagQaStreamPayload,
} from "../../../../../shared/types/index.js";

export const START_TIMEOUT_MS = 5_000;
export const REQUEST_TIMEOUT_ASK_MS = 20_000;
export const REQUEST_TIMEOUT_STOP_MS = 2_000;
export const REQUEST_TIMEOUT_EMBED_MS = 30_000;
export const STOP_TIMEOUT_MS = 5_000;
export const STOP_GRACE_MS = 120;
export const RAG_RUN_WATCHDOG_MS = 3 * 60_000;

export type UtilityOutboundMessage =
  | { type: "pong"; requestId?: string; pid: number }
  | { type: "shutdown-ack"; requestId?: string }
  | { type: "response"; requestId: string; ok: true; result: unknown }
  | { type: "response"; requestId: string; ok: false; error: string }
  | { type: "event"; event: "ragQa.stream"; payload: RagQaStreamPayload }
  | { type: "event"; event: "ragQa.error"; payload: RagQaErrorPayload };

export type UtilityInboundMessage =
  | { type: "ping"; requestId?: string }
  | { type: "shutdown"; requestId?: string }
  | { type: "request"; requestId: string; method: "ragQa.ask"; payload: RagQaRequest }
  | { type: "request"; requestId: string; method: "ragQa.stop"; payload?: { runId?: string } }
  | { type: "request"; requestId: string; method: "embedding.embed"; payload: { projectId: string; texts: string[] } }
  | {
      type: "request";
      requestId: string;
      method: "sidecar.start";
      payload: { binaryPath: string; modelPath: string; options?: { gpuLayers?: number; contextSize?: number } };
    }
  | { type: "request"; requestId: string; method: "sidecar.stop"; payload?: never };

export type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
};

export type PendingRagEvent =
  | { kind: "stream"; payload: RagQaStreamPayload }
  | { kind: "error"; payload: RagQaErrorPayload };

export const unwrapMessage = (raw: unknown): unknown => {
  if (raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)) {
    return (raw as { data?: unknown }).data;
  }
  return raw;
};
