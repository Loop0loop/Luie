import path from "node:path";
import { app, utilityProcess, webContents } from "electron";
import type { UtilityProcess } from "electron";
import { IPC_CHANNELS } from "../../../../shared/ipc/channels.js";
import { ErrorCode } from "../../../../shared/constants/errorCode.js";
import type {
  RagQaErrorPayload,
  RagQaRequest,
  RagQaRunHandle,
  RagQaStreamPayload,
} from "../../../../shared/types/index.js";
import { createLogger } from "../../../../shared/logger/index.js";

const logger = createLogger("UtilityProcessBridge");
const START_TIMEOUT_MS = 5_000;
const REQUEST_TIMEOUT_ASK_MS = 20_000;
const REQUEST_TIMEOUT_STOP_MS = 2_000;
const REQUEST_TIMEOUT_EMBED_MS = 30_000;
const STOP_TIMEOUT_MS = 5_000;
const STOP_GRACE_MS = 120;
const RAG_RUN_WATCHDOG_MS = 3 * 60_000;

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
  | { type: "request"; requestId: string; method: "ragQa.stop"; payload?: { runId?: string } }
  | { type: "request"; requestId: string; method: "embedding.embed"; payload: { projectId: string; texts: string[] } };

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type PendingRagEvent =
  | { kind: "stream"; payload: RagQaStreamPayload }
  | { kind: "error"; payload: RagQaErrorPayload };

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
  private ragRunWatchdogs = new Map<string, ReturnType<typeof setTimeout>>();
  private pendingRagEvents = new Map<string, PendingRagEvent[]>();
  private pendingRagEventTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private startingPromise: Promise<boolean> | null = null;
  private stoppingPromise: Promise<void> | null = null;

  async start(): Promise<boolean> {
    if (this.stoppingPromise) {
      await this.stoppingPromise;
    }
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
          LUIE_USER_DATA_PATH: app.getPath("userData"),
        },
      });
      child.on("spawn", () => {
        logger.info("Utility process spawned", { pid: child.pid, entryPath });
      });
      child.on("exit", (code) => {
        logger.info("Utility process exited", { pid: child.pid, code });
        this.clearPendingRequests("Utility process exited");
        this.emitCrashErrorsToActiveRuns("RAG utility process exited unexpectedly");
        for (const runId of this.ragRunWatchdogs.keys()) {
          this.clearRagRunWatchdog(runId);
        }
        this.ragRunToWebContentsId.clear();
        this.clearPendingRagEvents();
        if (this.utilityChild === child) {
          this.utilityChild = null;
        }
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
    if (this.stoppingPromise) return;
    try {
      const child = this.utilityChild;
      const stopRequestId = this.nextRequestId();
      child.postMessage({
        type: "request",
        requestId: stopRequestId,
        method: "ragQa.stop",
      } satisfies UtilityInboundMessage);
      this.clearPendingRequests("Utility process is stopping");
      this.stoppingPromise = new Promise<void>((resolve) => {
        const requestId = this.nextRequestId();
        const graceTimer = setTimeout(() => {
          child.postMessage({ type: "shutdown", requestId } satisfies UtilityInboundMessage);
        }, STOP_GRACE_MS);
        const cleanup = () => {
          clearTimeout(graceTimer);
          clearTimeout(timeout);
          child.off("message", onMessage);
          this.ragRunToWebContentsId.clear();
          for (const runId of this.ragRunWatchdogs.keys()) {
            this.clearRagRunWatchdog(runId);
          }
          this.clearPendingRagEvents();
          this.utilityChild = null;
          this.stoppingPromise = null;
          resolve();
        };
        const timeout = setTimeout(() => {
          child.off("message", onMessage);
          try {
            child.kill();
          } catch (error) {
            logger.warn("Failed to kill utility process after timeout", { error });
          } finally {
            cleanup();
          }
        }, STOP_TIMEOUT_MS);
        const onMessage = (raw: unknown) => {
          const message = unwrapMessage(raw) as UtilityOutboundMessage;
          if (message?.type === "shutdown-ack" && message.requestId === requestId) {
            try {
              child.kill();
            } catch (error) {
              logger.warn("Failed to kill utility process after shutdown ack", { error });
            } finally {
              cleanup();
            }
          }
        };
        child.on("message", onMessage);
      });
    } catch (error) {
      logger.warn("Failed to stop utility process", { error });
      this.utilityChild = null;
      this.stoppingPromise = null;
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
      this.setRagRunWatchdog(runHandle.runId);
      this.flushPendingRagEvents(runHandle.runId);
    }
    return runHandle;
  }

  async stopRagQa(runId?: string): Promise<{ stopped: boolean }> {
    if (runId) {
      this.clearRagRunWatchdog(runId);
      this.ragRunToWebContentsId.delete(runId);
    } else {
      for (const key of this.ragRunToWebContentsId.keys()) {
        this.clearRagRunWatchdog(key);
      }
      this.ragRunToWebContentsId.clear();
    }
    return (await this.request("ragQa.stop", { runId })) as { stopped: boolean };
  }

  async embed(projectId: string, texts: string[]): Promise<number[][] | null> {
    if (!this.utilityChild) {
      const started = await this.start();
      if (!started || !this.utilityChild) {
        throw new Error("Utility process is not running");
      }
    }
    return (await this.request("embedding.embed", { projectId, texts })) as number[][] | null;
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
    method: "embedding.embed",
    payload: { projectId: string; texts: string[] },
  ): Promise<unknown>;
  private async request(
    method: "ragQa.ask" | "ragQa.stop" | "embedding.embed",
    payload?: RagQaRequest | { runId?: string } | { projectId: string; texts: string[] },
  ): Promise<unknown> {
    const child = this.utilityChild;
    if (!child) throw new Error("Utility process is not running");
    const requestId = this.nextRequestId();
    return await new Promise<unknown>((resolve, reject) => {
      const timeoutMs =
        method === "ragQa.stop"
          ? REQUEST_TIMEOUT_STOP_MS
          : method === "embedding.embed"
            ? REQUEST_TIMEOUT_EMBED_MS
            : REQUEST_TIMEOUT_ASK_MS;
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Utility request timeout: ${method}`));
      }, timeoutMs);
      this.pendingRequests.set(requestId, { resolve, reject, timeout });
      if (method === "ragQa.ask") {
        child.postMessage({
          type: "request",
          requestId,
          method: "ragQa.ask",
          payload: payload as RagQaRequest,
        } satisfies UtilityInboundMessage);
        return;
      }
      if (method === "embedding.embed") {
        child.postMessage({
          type: "request",
          requestId,
          method: "embedding.embed",
          payload: payload as { projectId: string; texts: string[] },
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
    if (!targetId) {
      this.enqueuePendingRagEvent(payload.runId, { kind: "stream", payload });
      return;
    }
    const target = webContents.fromId(targetId);
    if (!target || target.isDestroyed()) {
      this.ragRunToWebContentsId.delete(payload.runId);
      return;
    }
    this.setRagRunWatchdog(payload.runId);
    target.send(IPC_CHANNELS.RAG_QA_STREAM, payload);
    if (payload.done) {
      this.clearRagRunWatchdog(payload.runId);
      this.ragRunToWebContentsId.delete(payload.runId);
    }
  }

  private forwardRagError(payload: RagQaErrorPayload): void {
    if (!payload.runId) return;
    const targetId = this.ragRunToWebContentsId.get(payload.runId);
    if (!targetId) {
      this.enqueuePendingRagEvent(payload.runId, { kind: "error", payload });
      return;
    }
    const target = webContents.fromId(targetId);
    if (!target || target.isDestroyed()) {
      this.ragRunToWebContentsId.delete(payload.runId);
      return;
    }
    target.send(IPC_CHANNELS.RAG_QA_ERROR, payload);
    this.clearRagRunWatchdog(payload.runId);
    this.ragRunToWebContentsId.delete(payload.runId);
  }

  private clearPendingRequests(message: string): void {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(message));
    }
    this.pendingRequests.clear();
  }

  private emitCrashErrorsToActiveRuns(message: string): void {
    for (const [runId, webContentsId] of this.ragRunToWebContentsId.entries()) {
      const target = webContents.fromId(webContentsId);
      if (!target || target.isDestroyed()) continue;
      target.send(IPC_CHANNELS.RAG_QA_ERROR, {
        runId,
        code: ErrorCode.RAG_QA_UTILITY_EXITED,
        message,
      } satisfies RagQaErrorPayload);
    }
  }

  private enqueuePendingRagEvent(runId: string, event: PendingRagEvent): void {
    const events = this.pendingRagEvents.get(runId) ?? [];
    events.push(event);
    this.pendingRagEvents.set(runId, events);
    if (!this.pendingRagEventTimers.has(runId)) {
      const timer = setTimeout(() => {
        this.pendingRagEventTimers.delete(runId);
        this.pendingRagEvents.delete(runId);
      }, 500);
      this.pendingRagEventTimers.set(runId, timer);
    }
  }

  private flushPendingRagEvents(runId: string): void {
    const timer = this.pendingRagEventTimers.get(runId);
    if (timer) {
      clearTimeout(timer);
      this.pendingRagEventTimers.delete(runId);
    }
    const events = this.pendingRagEvents.get(runId);
    if (!events || events.length === 0) return;
    this.pendingRagEvents.delete(runId);
    for (const event of events) {
      if (event.kind === "stream") {
        this.forwardRagStream(event.payload);
      } else {
        this.forwardRagError(event.payload);
      }
    }
  }

  private clearPendingRagEvents(): void {
    for (const timer of this.pendingRagEventTimers.values()) {
      clearTimeout(timer);
    }
    this.pendingRagEventTimers.clear();
    this.pendingRagEvents.clear();
  }

  private setRagRunWatchdog(runId: string): void {
    this.clearRagRunWatchdog(runId);
    const timer = setTimeout(() => {
      const webContentsId = this.ragRunToWebContentsId.get(runId);
      if (!webContentsId) return;
      const target = webContents.fromId(webContentsId);
      if (!target || target.isDestroyed()) {
        this.ragRunToWebContentsId.delete(runId);
        this.clearRagRunWatchdog(runId);
        return;
      }
      target.send(IPC_CHANNELS.RAG_QA_ERROR, {
        runId,
        code: ErrorCode.RAG_QA_FAILED,
        message: "RAG generation timeout",
      } satisfies RagQaErrorPayload);
      this.ragRunToWebContentsId.delete(runId);
      this.clearRagRunWatchdog(runId);
      void this.stopRagQa(runId).catch((error) => {
        logger.warn("Failed to stop timed-out RAG run", { runId, error });
      });
    }, RAG_RUN_WATCHDOG_MS);
    if (typeof timer.unref === "function") {
      timer.unref();
    }
    this.ragRunWatchdogs.set(runId, timer);
  }

  private clearRagRunWatchdog(runId: string): void {
    const timer = this.ragRunWatchdogs.get(runId);
    if (!timer) return;
    clearTimeout(timer);
    this.ragRunWatchdogs.delete(runId);
  }

  private nextRequestId(): string {
    this.requestSeq += 1;
    return `req-${this.requestSeq}`;
  }
}

export const utilityProcessBridge = new UtilityProcessBridge();
