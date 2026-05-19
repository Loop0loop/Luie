import { createLogger } from "../../shared/logger/index.js";
import type { RagQaRequest } from "../../shared/types/index.js";
import { db } from "../database/index.js";
import { cacheDb } from "../database/cacheDb.js";

const logger = createLogger("UtilityProcessMain");
let ragWorkerPromise: Promise<typeof import("./ragQaWorker.js")["ragQaWorker"]> | null = null;
let readyPromise: Promise<void> | null = null;

const ensureReady = async (): Promise<void> => {
  if (!readyPromise) {
    readyPromise = Promise.all([db.initialize(), cacheDb.initialize()])
      .then(() => {
        logger.info("Utility database bootstrap completed");
      })
      .catch((error) => {
        readyPromise = null;
        throw error;
      });
  }
  await readyPromise;
};

const getRagQaWorker = async () => {
  if (!ragWorkerPromise) {
    ragWorkerPromise = import("./ragQaWorker.js").then((mod) => mod.ragQaWorker);
  }
  return await ragWorkerPromise;
};

type UtilityInboundMessage =
  | { type: "ping"; requestId?: string }
  | { type: "shutdown"; requestId?: string }
  | {
      type: "request";
      requestId: string;
      method: "ragQa.ask";
      payload: RagQaRequest;
    }
  | {
      type: "request";
      requestId: string;
      method: "ragQa.stop";
      payload?: { runId?: string };
    };

type UtilityOutboundMessage =
  | { type: "pong"; requestId?: string; pid: number }
  | { type: "shutdown-ack"; requestId?: string }
  | { type: "response"; requestId: string; ok: true; result: unknown }
  | { type: "response"; requestId: string; ok: false; error: string };

type MessagePortLike = {
  postMessage: (message: UtilityOutboundMessage) => void;
  on: (event: "message", listener: (message: unknown) => void) => void;
};

const processWithParentPort = process as typeof process & { parentPort?: MessagePortLike };
const processWithSend = process as typeof process & {
  send?: (message: UtilityOutboundMessage) => void;
};

const inboundPort: MessagePortLike | null = processWithParentPort.parentPort ?? null;

const unwrapInbound = (raw: unknown): unknown => {
  if (raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)) {
    return (raw as { data?: unknown }).data;
  }
  return raw;
};

const post = (message: UtilityOutboundMessage): void => {
  if (inboundPort) {
    inboundPort.postMessage(message);
    return;
  }
  if (typeof processWithSend.send === "function") {
    processWithSend.send(message);
  }
};

const onMessage = (raw: unknown): void => {
  const message = unwrapInbound(raw) as UtilityInboundMessage;
  if (message?.type === "ping") {
    post({ type: "pong", requestId: message.requestId, pid: process.pid });
    return;
  }
  if (message?.type === "shutdown") {
    post({ type: "shutdown-ack", requestId: message.requestId });
    setTimeout(() => process.exit(0), 0);
    return;
  }
  if (message?.type === "request") {
    void (async () => {
      try {
        await ensureReady();
        if (message.method === "ragQa.ask") {
          const ragQaWorker = await getRagQaWorker();
          const result = await ragQaWorker.ask(message.payload);
          post({ type: "response", requestId: message.requestId, ok: true, result });
          return;
        }
        if (message.method === "ragQa.stop") {
          const ragQaWorker = await getRagQaWorker();
          const result = ragQaWorker.stop(message.payload?.runId);
          post({ type: "response", requestId: message.requestId, ok: true, result });
          return;
        }
      } catch (error) {
        post({
          type: "response",
          requestId: message.requestId,
          ok: false,
          error: error instanceof Error ? error.message : "Utility request failed",
        });
      }
    })();
  }
};

if (inboundPort) {
  inboundPort.on("message", onMessage);
} else {
  process.on("message", onMessage);
}
logger.info("Utility process online", { pid: process.pid });
