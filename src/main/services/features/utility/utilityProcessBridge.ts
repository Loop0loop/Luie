import path from "node:path";
import { app, utilityProcess, webContents } from "electron";
import type { UtilityProcess } from "electron";
import { IPC_CHANNELS } from "../../../../shared/ipc/channels.js";
import type {
  RagQaErrorPayload,
  RagQaRequest,
  RagQaRunHandle,
  RagQaStreamPayload,
} from "../../../../shared/types/index.js";
import { createLogger } from "../../../../shared/logger/index.js";

const logger = createLogger("UtilityProcessBridge");
const START_TIMEOUT_MS = 5_000;
const REQUEST_TIMEOUT_MS = 20_000;
const STOP_TIMEOUT_MS = 2_000;

type UtilityOutboundMessage =
  | { type: "pong"; requestId?: string; pid: number }
  | { type: "shutdown-ack"; requestId?: string }
  | { type: "response"; requestId: string; ok: true; result: unknown }
  | { type: "response"; requestId: string; ok: false; error: string }
  | { type: "event"; event: "ragQa.stream"; payload: RagQaStreamPayload }
  | { type: "event"; event: "ragQa.error"; payload: RagQaErrorPayload };

type UtilityInboundMessage =
  | { type: "ping"; requestId?: string }
  | { type: "shutdown"; requestId?: string }
  | { type: "request"; requestId: string; method: "ragQa.ask"; payload: RagQaRequest }
  | { type: "request"; requestId: string; method: "ragQa.stop"; payload?: { runId?: string } };

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
};

const unwrapMessage = (raw: unknown): unknown => {
  if (raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)) {
    return (raw as { data?: unknown }).data;
  }
  return raw;
};

export class UtilityProcessBridge {
  private utilityChild: UtilityProcess | null = null;
  private requestSeq = 0;
  private pendingRequests = new Map<string, PendingRequest>();
  private ragRunToWebContentsId = new Map<string, number>();
  private startingPromise: Promise<boolean> | null = null;

  async start(): Promise<boolean> {
    if (this.utilityChild) return true;
    if (this.startingPromise) return await this.startingPromise;

    const entryPath = app.isPackaged
      ? path.join(process.resourcesPath, "app.asar", "out", "main", "utilityProcessMain.js")
      : path.join(app.getAppPath(), "out", "main", "utilityProcessMain.js");

    const run = async (): Promise<boolean> => {
      try {
      const child = utilityProcess.fork(entryPath, [], {
        env: {
          ...process.env,
          LUIE_APP_IS_PACKAGED: app.isPackaged ? "1" : "0",
        },
      });
      child.on("spawn", () => {
        logger.info("Utility process spawned", { pid: child.pid, entryPath });
      });
      child.on("exit", (code) => {
        logger.info("Utility process exited", { pid: child.pid, code });
        this.clearPendingRequests("Utility process exited");
        this.ragRunToWebContentsId.clear();
        this.utilityChild = null;
      });
      child.on("message", (message) => this.onMessage(unwrapMessage(message) as UtilityOutboundMessage));
      this.utilityChild = child;
      const healthy = await this.ping();
      if (!healthy) {
        logger.warn("Utility process did not pass health check", { pid: child.pid });
        this.stop();
        return false;
      }
      logger.info("Utility process health check passed", { pid: child.pid });
      return true;
      } catch (error) {
        logger.error("Failed to start utility process", { entryPath, error });
        return false;
      } finally {
        this.startingPromise = null;
      }
    };
    this.startingPromise = run();
    return await this.startingPromise;
  }

  stop(): void {
    if (!this.utilityChild) return;
    try {
      const child = this.utilityChild;
      this.clearPendingRequests("Utility process is stopping");
      this.ragRunToWebContentsId.clear();
      const requestId = this.nextRequestId();
      const timeout = setTimeout(() => {
        try {
          child.kill();
        } catch (error) {
          logger.warn("Failed to kill utility process after timeout", { error });
        }
      }, STOP_TIMEOUT_MS);
      const onMessage = (raw: unknown) => {
        const message = unwrapMessage(raw) as UtilityOutboundMessage;
        if (message?.type === "shutdown-ack" && message.requestId === requestId) {
          clearTimeout(timeout);
          child.off("message", onMessage);
          try {
            child.kill();
          } catch (error) {
            logger.warn("Failed to kill utility process after shutdown ack", { error });
          }
        }
      };
      child.on("message", onMessage);
      child.postMessage({ type: "shutdown", requestId } satisfies UtilityInboundMessage);
    } catch (error) {
      logger.warn("Failed to stop utility process", { error });
    } finally {
      this.utilityChild = null;
    }
  }

  async askRagQa(input: RagQaRequest, targetWebContentsId: number): Promise<RagQaRunHandle> {
    if (!this.utilityChild) {
      const started = await this.start();
      if (!started || !this.utilityChild) {
        throw new Error("Utility process is not running");
      }
    }
    const result = await this.request("ragQa.ask", input);
    const runHandle = result as RagQaRunHandle;
    if (runHandle?.runId) {
      this.ragRunToWebContentsId.set(runHandle.runId, targetWebContentsId);
    }
    return runHandle;
  }

  async stopRagQa(runId?: string): Promise<{ stopped: boolean }> {
    return (await this.request("ragQa.stop", { runId })) as { stopped: boolean };
  }

  private async ping(): Promise<boolean> {
    const child = this.utilityChild;
    if (!child) return false;
    const requestId = this.nextRequestId();
    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        child.off("message", onMessage);
        resolve(false);
      }, START_TIMEOUT_MS);
      const onMessage = (raw: unknown) => {
        const message = unwrapMessage(raw) as UtilityOutboundMessage;
        if (message?.type === "pong" && message.requestId === requestId) {
          clearTimeout(timeout);
          child.off("message", onMessage);
          resolve(true);
        }
      };
      child.on("message", onMessage);
      child.postMessage({ type: "ping", requestId } satisfies UtilityInboundMessage);
    });
  }

  private async request(method: "ragQa.ask", payload: RagQaRequest): Promise<unknown>;
  private async request(method: "ragQa.stop", payload?: { runId?: string }): Promise<unknown>;
  private async request(
    method: "ragQa.ask" | "ragQa.stop",
    payload?: RagQaRequest | { runId?: string },
  ): Promise<unknown> {
    const child = this.utilityChild;
    if (!child) throw new Error("Utility process is not running");
    const requestId = this.nextRequestId();
    return await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Utility request timeout: ${method}`));
      }, REQUEST_TIMEOUT_MS);
      this.pendingRequests.set(requestId, { resolve, reject, timeout });
      if (method === "ragQa.ask") {
        child.postMessage({
          type: "request",
          requestId,
          method,
          payload: payload as RagQaRequest,
        } satisfies UtilityInboundMessage);
        return;
      }
      child.postMessage({
        type: "request",
        requestId,
        method,
        payload: payload as { runId?: string } | undefined,
      } satisfies UtilityInboundMessage);
    });
  }

  private onMessage(message: UtilityOutboundMessage): void {
    if (message.type === "response") {
      const pending = this.pendingRequests.get(message.requestId);
      if (!pending) return;
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(message.requestId);
      if (message.ok) {
        pending.resolve(message.result);
      } else {
        logger.error("Utility request failed", {
          requestId: message.requestId,
          error: message.error,
        });
        pending.reject(new Error(message.error));
      }
      return;
    }

    if (message.type === "event" && message.event === "ragQa.stream") {
      this.forwardRagStream(message.payload);
      return;
    }
    if (message.type === "event" && message.event === "ragQa.error") {
      this.forwardRagError(message.payload);
    }
  }

  private forwardRagStream(payload: RagQaStreamPayload): void {
    const targetId = this.ragRunToWebContentsId.get(payload.runId);
    if (!targetId) return;
    const target = webContents.fromId(targetId);
    if (!target || target.isDestroyed()) {
      this.ragRunToWebContentsId.delete(payload.runId);
      return;
    }
    target.send(IPC_CHANNELS.RAG_QA_STREAM, payload);
    if (payload.done) {
      this.ragRunToWebContentsId.delete(payload.runId);
    }
  }

  private forwardRagError(payload: RagQaErrorPayload): void {
    if (!payload.runId) return;
    const targetId = this.ragRunToWebContentsId.get(payload.runId);
    if (!targetId) return;
    const target = webContents.fromId(targetId);
    if (!target || target.isDestroyed()) {
      this.ragRunToWebContentsId.delete(payload.runId);
      return;
    }
    target.send(IPC_CHANNELS.RAG_QA_ERROR, payload);
    this.ragRunToWebContentsId.delete(payload.runId);
  }

  private clearPendingRequests(message: string): void {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(message));
    }
    this.pendingRequests.clear();
  }

  private nextRequestId(): string {
    this.requestSeq += 1;
    return `req-${this.requestSeq}`;
  }
}

export const utilityProcessBridge = new UtilityProcessBridge();
