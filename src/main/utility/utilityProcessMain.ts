import { createLogger } from "../../shared/logger/index.js";
import type { RagQaRequest } from "../../shared/types/index.js";
import { db } from "../infra/database/index.js";
import { cacheDb } from "../infra/database/cache.js";
import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";

const logger = createLogger("UtilityProcessMain");
process.env.LUIE_IS_UTILITY_PROCESS = "1";
let ragWorkerPromise: Promise<unknown> | null = null;
let readyPromise: Promise<void> | null = null;
const METRICS_INTERVAL_MS = 30_000;

const toMb = (bytes: number): number => Number((bytes / (1024 * 1024)).toFixed(1));

const logProcessMetrics = (): void => {
  const usage = process.memoryUsage();
  logger.info("Utility process memory snapshot", {
    pid: process.pid,
    rssMb: toMb(usage.rss),
    heapUsedMb: toMb(usage.heapUsed),
    externalMb: toMb(usage.external),
    arrayBuffersMb: toMb(usage.arrayBuffers),
  });
};

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
    ragWorkerPromise = import("./ragQaWorker.js").then((mod) => mod.ragQaWorker) as Promise<unknown>;
  }
  return (await ragWorkerPromise) as {
    ask: (payload: RagQaRequest) => Promise<unknown>;
    stop: (runId?: string) => { stopped: boolean };
  };
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
    }
  | {
      type: "request";
      requestId: string;
      method: "embedding.embed";
      payload: { projectId: string; texts: string[] };
    }
  | {
      type: "request";
      requestId: string;
      method: "sidecar.start";
      payload: { binaryPath: string; modelPath: string; options?: { gpuLayers?: number; contextSize?: number } };
    }
  | {
      type: "request";
      requestId: string;
      method: "sidecar.stop";
      payload?: never;
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isValidInboundMessage = (value: unknown): value is UtilityInboundMessage => {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "ping" || value.type === "shutdown") return true;
  if (value.type !== "request") return false;
  if (typeof value.requestId !== "string") return false;
  if (value.method === "ragQa.ask") {
    return isRecord(value.payload);
  }
  if (value.method === "ragQa.stop") {
    return value.payload === undefined || isRecord(value.payload);
  }
  if (value.method === "embedding.embed") {
    return (
      isRecord(value.payload) &&
      typeof value.payload.projectId === "string" &&
      Array.isArray(value.payload.texts)
    );
  }
  if (value.method === "sidecar.start") {
    return (
      isRecord(value.payload) &&
      typeof value.payload.binaryPath === "string" &&
      typeof value.payload.modelPath === "string"
    );
  }
  if (value.method === "sidecar.stop") {
    return true;
  }
  return false;
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
  const unwrapped = unwrapInbound(raw);
  if (!isValidInboundMessage(unwrapped)) {
    if (isRecord(unwrapped) && typeof unwrapped.requestId === "string") {
      post({
        type: "response",
        requestId: unwrapped.requestId,
        ok: false,
        error: "Invalid utility request payload",
      });
    }
    logger.warn("Invalid utility inbound message received", {
      rawType: typeof unwrapped,
    });
    return;
  }
  const message = unwrapped;
  if (message?.type === "ping") {
    post({ type: "pong", requestId: message.requestId, pid: process.pid });
    return;
  }
  if (message?.type === "shutdown") {
    void (async () => {
      try {
        const ragQaWorker = await getRagQaWorker();
        ragQaWorker.stop();
      } catch (error) {
        logger.warn("Failed to stop RAG worker before shutdown", { error });
      }
      try {
        await utilitySidecarManager.stop();
      } catch (error) {
        logger.warn("Failed to stop sidecar before shutdown", { error });
      } finally {
        post({ type: "shutdown-ack", requestId: message.requestId });
        setTimeout(() => process.exit(0), 150);
      }
    })();
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
        if (message.method === "embedding.embed") {
          const mod = await import("./ragQaWorker.js");
          const result = await mod.embedTexts(message.payload);
          post({ type: "response", requestId: message.requestId, ok: true, result });
          return;
        }
        if (message.method === "sidecar.start") {
          const result = await utilitySidecarManager.ensureStarted(
            message.payload.binaryPath,
            message.payload.modelPath,
            message.payload.options,
          );
          post({ type: "response", requestId: message.requestId, ok: true, result });
          return;
        }
        if (message.method === "sidecar.stop") {
          await utilitySidecarManager.stop();
          post({ type: "response", requestId: message.requestId, ok: true, result: undefined });
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

const sidecarLogger = createLogger("UtilitySidecarManager");
const HEALTH_POLL_INTERVAL_MS = 500;
const HEALTH_POLL_TIMEOUT_MS = 30_000;
const IDLE_SHUTDOWN_MS = 3 * 60_000;

type SidecarState =
  | { status: "stopped" }
  | { status: "starting"; modelPath: string }
  | { status: "running"; modelPath: string; port: number; proc: ChildProcess };

class UtilitySidecarManager {
  private state: SidecarState = { status: "stopped" };
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private startingPromise: Promise<{ baseUrl: string }> | null = null;

  isRunning(): boolean {
    return this.state.status === "running";
  }

  getBaseUrl(): string | null {
    if (this.state.status !== "running") return null;
    return `http://127.0.0.1:${this.state.port}`;
  }

  async ensureStarted(
    binaryPath: string,
    modelPath: string,
    options?: { gpuLayers?: number; contextSize?: number }
  ): Promise<{ baseUrl: string }> {
    if (this.state.status === "running" && this.state.modelPath === modelPath) {
      this.resetIdleTimer();
      return { baseUrl: `http://127.0.0.1:${this.state.port}` };
    }
    if (this.startingPromise) return this.startingPromise;

    this.startingPromise = this.doStart(binaryPath, modelPath, options).finally(() => {
      this.startingPromise = null;
    });
    return this.startingPromise;
  }

  private async doStart(
    binaryPath: string,
    modelPath: string,
    options?: { gpuLayers?: number; contextSize?: number }
  ): Promise<{ baseUrl: string }> {
    if (this.state.status === "running") {
      await this.stop();
    }

    this.state = { status: "starting", modelPath };
    const port = await this.findFreePort();
    const contextSize = options?.contextSize ?? 4096;
    const gpuLayers = options?.gpuLayers ?? -1;

    const args = [
      "--model", modelPath,
      "--port", String(port),
      "--host", "127.0.0.1",
      "--ctx-size", String(contextSize),
      "--n-gpu-layers", String(gpuLayers),
      "--threads", "4",
      "--parallel", "1",
      "--flash-attn",
      "--cache-type-k", "q8_0",
      "--cache-type-v", "q8_0",
      "--log-disable",
    ];

    sidecarLogger.info("Spawning llama-server inside utilityProcess", { binaryPath, port, modelPath });
    const proc = spawn(binaryPath, args, {
      stdio: ["pipe", "ignore", "pipe"],
      detached: false,
    });

    proc.on("error", (error) => {
      sidecarLogger.error("llama-server spawn error in utilityProcess", { error });
      this.state = { status: "stopped" };
      this.clearIdleTimer();
    });
    proc.on("exit", (code) => {
      sidecarLogger.info("llama-server exited in utilityProcess", { code });
      this.state = { status: "stopped" };
      this.clearIdleTimer();
    });
    proc.stderr?.on("data", (data: Buffer) => {
      sidecarLogger.debug("llama-server stderr in utilityProcess", { msg: data.toString().slice(0, 200) });
    });

    this.state = { status: "running", modelPath, port, proc };
    try {
      await this.waitForHealth(port);
    } catch (error) {
      await this.stop();
      throw error;
    }

    this.resetIdleTimer();
    sidecarLogger.info("llama-server ready in utilityProcess", { port });
    return { baseUrl: `http://127.0.0.1:${port}` };
  }

  async stop(): Promise<void> {
    this.clearIdleTimer();
    if (this.state.status !== "running") return;
    const { proc } = this.state;
    this.state = { status: "stopped" };
    proc.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        proc.kill("SIGKILL");
        resolve();
      }, 3_000);
      proc.on("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
    sidecarLogger.info("llama-server stopped in utilityProcess");
  }

  private async waitForHealth(port: number): Promise<void> {
    const deadline = Date.now() + HEALTH_POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      try {
        // eslint-disable-next-line no-await-in-loop -- sequential health polls
        const response = await fetch(`http://127.0.0.1:${port}/health`, {
          signal: AbortSignal.timeout(2_000),
        });
        if (response.ok) return;
      } catch {
        // starting
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, HEALTH_POLL_INTERVAL_MS));
    }
    throw new Error("llama-server health check timed out");
  }

  private async findFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        server.close(() => {
          if (address && typeof address === "object") {
            resolve(address.port);
            return;
          }
          reject(new Error("Failed to find free port"));
        });
      });
      server.on("error", reject);
    });
  }

  private resetIdleTimer(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      sidecarLogger.info("llama-server idle timeout, stopping in utilityProcess");
      void this.stop();
    }, IDLE_SHUTDOWN_MS);
  }

  private clearIdleTimer(): void {
    if (!this.idleTimer) return;
    clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }
}

export const utilitySidecarManager = new UtilitySidecarManager();

if (inboundPort) {
  inboundPort.on("message", onMessage);
} else {
  process.on("message", onMessage);
}
logger.info("Utility process online", { pid: process.pid });
setInterval(logProcessMetrics, METRICS_INTERVAL_MS).unref();
