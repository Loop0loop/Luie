import path from "node:path";
import { app, utilityProcess } from "electron";
import type { UtilityProcess } from "electron";
import type {
  RagQaRequest,
  RagQaRunHandle,
  UtilityRagQaRequest,
  UtilitySidecarPurpose,
  UtilitySidecarStatusEvent,
} from "../../../../../../shared/types/index.js";
import { createLogger } from "../../../../../../shared/logger/index.js";
import { resolveRuntimeRoutePlan } from "../../../../llm/modelRuntimeFactory.js";
import {
  START_TIMEOUT_MS,
  STOP_GRACE_MS,
  STOP_TIMEOUT_MS,
  unwrapMessage,
  type PendingRagEvent,
  type PendingRequest,
  type UtilityInboundMessage,
  type UtilityOutboundMessage,
  type UtilitySidecarStatusResult,
} from "../protocol.js";
import {
  clearPendingRequestsInternal,
  emitCrashErrorsToActiveRunsInternal,
  flushPendingRagEventsInternal,
  clearPendingRagEventsInternal,
  enqueuePendingRagEventInternal,
  setRagRunWatchdogInternal,
  clearRagRunWatchdogInternal,
  handleSidecarStatusEvent as handleSidecarStatusEventInternal,
  handleUtilityOutboundMessage,
  type UtilityProcessBridgeEventHost,
} from "./eventHandlers.js";
import {
  buildUtilityRequestMessage,
  getUtilityRequestTimeoutMs,
  type UtilityRequestMethod,
} from "./requestMessages.js";

const logger = createLogger("UtilityProcessBridge");

export class UtilityProcessBridge {
  private utilityChild: UtilityProcess | null = null;
  private requestSeq = 0;
  private pendingRequests = new Map<string, PendingRequest>();
  private ragRunToWindowId = new Map<string, number>();
  private ragRunWatchdogs = new Map<string, ReturnType<typeof setTimeout>>();
  private pendingRagEvents = new Map<string, PendingRagEvent[]>();
  private pendingRagEventTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private startingPromise: Promise<boolean> | null = null;
  private stoppingPromise: Promise<void> | null = null;
  private lastSidecarStatuses = new Map<UtilitySidecarPurpose, UtilitySidecarStatusResult>();

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
            LUIE_IS_UTILITY_PROCESS: "1",
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
          this.ragRunToWindowId.clear();
          this.clearPendingRagEvents();
          this.lastSidecarStatuses.clear();
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
          this.ragRunToWindowId.clear();
          for (const runId of this.ragRunWatchdogs.keys()) {
            this.clearRagRunWatchdog(runId);
          }
          this.clearPendingRagEvents();
          this.lastSidecarStatuses.clear();
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

  async askRagQa(input: RagQaRequest, targetWindowId: number): Promise<RagQaRunHandle> {
    if (!this.utilityChild) {
      const started = await this.start();
      if (!started || !this.utilityChild) {
        throw new Error("Utility process is not running");
      }
    }
    const { plan } = await resolveRuntimeRoutePlan();
    const payload: UtilityRagQaRequest = { ...input, runtimePlan: plan };
    const result = await this.request("ragQa.ask", payload);
    const runHandle = result as RagQaRunHandle;
    if (runHandle?.runId) {
      this.ragRunToWindowId.set(runHandle.runId, targetWindowId);
      this.setRagRunWatchdog(runHandle.runId);
      await this.flushPendingRagEvents(runHandle.runId);
    }
    return runHandle;
  }

  async stopRagQa(runId?: string): Promise<{ stopped: boolean }> {
    if (runId) {
      this.clearRagRunWatchdog(runId);
      this.ragRunToWindowId.delete(runId);
    } else {
      for (const key of this.ragRunToWindowId.keys()) {
        this.clearRagRunWatchdog(key);
      }
      this.ragRunToWindowId.clear();
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
    const { plan } = await resolveRuntimeRoutePlan();
    return (await this.request("embedding.embed", { projectId, texts, runtimePlan: plan })) as number[][] | null;
  }

  async generateText(
    projectId: string,
    prompt: string,
    options?: { maxTokens?: number; temperature?: number },
  ): Promise<{ text: string; providerName: string }> {
    if (!this.utilityChild) {
      const started = await this.start();
      if (!started || !this.utilityChild) {
        throw new Error("Utility process is not running");
      }
    }
    const { plan } = await resolveRuntimeRoutePlan();
    return (await this.request("llm.generateText", {
      projectId,
      prompt,
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
      runtimePlan: plan,
    })) as { text: string; providerName: string };
  }

  async startSidecar(
    binaryPath: string,
    modelPath: string,
    options?: {
      gpuLayers?: number;
      contextSize?: number;
      cacheRamMiB?: number;
      cacheReuse?: number;
    },
  ): Promise<string> {
    if (!this.utilityChild) {
      const started = await this.start();
      if (!started || !this.utilityChild) {
        throw new Error("Utility process is not running");
      }
    }
    const result = await this.request("sidecar.start", { binaryPath, modelPath, options });
    return (result as { baseUrl: string }).baseUrl;
  }

  async stopSidecar(): Promise<void> {
    if (!this.utilityChild) return;
    await this.request("sidecar.stop");
  }

  async getSidecarStatus(): Promise<UtilitySidecarStatusResult> {
    if (!this.utilityChild) {
      return { status: "stopped" };
    }
    const status = (await this.request("sidecar.status")) as UtilitySidecarStatusResult;
    this.lastSidecarStatuses.set("chat", status);
    return status;
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

  private async request(method: "ragQa.ask", payload: UtilityRagQaRequest): Promise<unknown>;
  private async request(method: "ragQa.stop", payload?: { runId?: string }): Promise<unknown>;
  private async request(
    method: "embedding.embed",
    payload: { projectId: string; texts: string[]; runtimePlan?: UtilityRagQaRequest["runtimePlan"] },
  ): Promise<unknown>;
  private async request(
    method: "llm.generateText",
    payload: {
      projectId: string;
      prompt: string;
      maxTokens?: number;
      temperature?: number;
      runtimePlan?: UtilityRagQaRequest["runtimePlan"];
    },
  ): Promise<unknown>;
  private async request(
    method: "sidecar.start",
    payload: {
      binaryPath: string;
      modelPath: string;
      options?: {
        gpuLayers?: number;
        contextSize?: number;
        cacheRamMiB?: number;
        cacheReuse?: number;
      };
    },
  ): Promise<unknown>;
  private async request(method: "sidecar.status"): Promise<unknown>;
  private async request(method: "sidecar.stop"): Promise<unknown>;
  private async request(
    method: UtilityRequestMethod,
    payload?: unknown,
  ): Promise<unknown> {
    const child = this.utilityChild;
    if (!child) throw new Error("Utility process is not running");
    const requestId = this.nextRequestId();
    return await new Promise<unknown>((resolve, reject) => {
      const timeoutMs = getUtilityRequestTimeoutMs(method);
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Utility request timeout: ${method}`));
      }, timeoutMs);
      this.pendingRequests.set(requestId, { resolve, reject, timeout });
      child.postMessage(buildUtilityRequestMessage({ requestId, method, payload }));
    });
  }

  private onMessage(message: UtilityOutboundMessage): void {
    if (message.type === "event" && message.event === "sidecar.status") {
      this.handleSidecarStatusEvent(message.payload);
      return;
    }
    void handleUtilityOutboundMessage(this.eventHost, message).catch((error) => {
      logger.warn("Failed to handle utility outbound message", { error });
    });
  }

  private get eventHost(): UtilityProcessBridgeEventHost {
    return {
      pendingRequests: this.pendingRequests,
      ragRunToWindowId: this.ragRunToWindowId,
      ragRunWatchdogs: this.ragRunWatchdogs,
      pendingRagEvents: this.pendingRagEvents,
      pendingRagEventTimers: this.pendingRagEventTimers,
      lastSidecarStatuses: this.lastSidecarStatuses,
      setRagRunWatchdog: (runId) => this.setRagRunWatchdog(runId),
      clearRagRunWatchdog: (runId) => this.clearRagRunWatchdog(runId),
      flushPendingRagEvents: (runId) => this.flushPendingRagEvents(runId),
      enqueuePendingRagEvent: (runId, event) => this.enqueuePendingRagEvent(runId, event),
      clearPendingRagEvents: () => this.clearPendingRagEvents(),
      emitCrashErrorsToActiveRuns: (message) => this.emitCrashErrorsToActiveRuns(message),
      stopRagQaAsync: (runId) => {
        void this.stopRagQa(runId).catch((error) => {
          logger.warn("Failed to stop timed-out RAG run", { runId, error });
        });
      },
    };
  }

  private handleSidecarStatusEvent(payload: UtilitySidecarStatusEvent): void {
    handleSidecarStatusEventInternal(this.eventHost, payload);
  }

  private clearPendingRequests(message: string): void {
    clearPendingRequestsInternal(this.eventHost, message);
  }

  private emitCrashErrorsToActiveRuns(message: string): void {
    emitCrashErrorsToActiveRunsInternal(this.eventHost, message);
  }

  private enqueuePendingRagEvent(runId: string, event: PendingRagEvent): void {
    enqueuePendingRagEventInternal(this.eventHost, runId, event);
  }

  private async flushPendingRagEvents(runId: string): Promise<void> {
    await flushPendingRagEventsInternal(this.eventHost, runId);
  }

  private clearPendingRagEvents(): void {
    clearPendingRagEventsInternal(this.eventHost);
  }

  private setRagRunWatchdog(runId: string): void {
    setRagRunWatchdogInternal(this.eventHost, runId, this.eventHost.stopRagQaAsync);
  }

  private clearRagRunWatchdog(runId: string): void {
    clearRagRunWatchdogInternal(this.eventHost, runId);
  }

  private nextRequestId(): string {
    this.requestSeq += 1;
    return `req-${this.requestSeq}`;
  }
}

export const utilityProcessBridge = new UtilityProcessBridge();
