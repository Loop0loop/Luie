import { createLogger } from "../../../shared/logger/index.js";

const logger = createLogger("SidecarManager");
const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_CONTEXT_SIZE = 4096;
const DEFAULT_GPU_LAYERS = 999;

type DisposableServer = {
  port?: number;
  start?: () => Promise<void>;
  dispose?: () => Promise<void>;
  close?: () => Promise<void>;
};

type SidecarState =
  | { status: "stopped" }
  | { status: "starting"; promise: Promise<number> }
  | { status: "running"; port: number; server: DisposableServer };

export class SidecarManager {
  private state: SidecarState = { status: "stopped" };
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly idleTimeoutMs: number = DEFAULT_IDLE_TIMEOUT_MS) {}

  async start(modelPath: string): Promise<number> {
    if (this.state.status === "running") {
      this.resetIdleTimer();
      return this.state.port;
    }
    if (this.state.status === "starting") {
      return this.state.promise;
    }

    const pending = this.doStart(modelPath);
    this.state = { status: "starting", promise: pending };

    try {
      const port = await pending;
      return port;
    } catch (error) {
      this.state = { status: "stopped" };
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.clearIdleTimer();
    if (this.state.status !== "running") return;
    const current = this.state;
    this.state = { status: "stopped" };
    if (typeof current.server.dispose === "function") {
      await current.server.dispose();
    } else if (typeof current.server.close === "function") {
      await current.server.close();
    }
    logger.info("Llama sidecar stopped");
  }

  resetIdleTimer(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      logger.info("Llama sidecar idle timeout reached, stopping process");
      void this.stop().catch((error) => {
        logger.warn("Failed to stop sidecar on idle timeout", { error });
      });
    }, this.idleTimeoutMs);
  }

  getPort(): number | null {
    return this.state.status === "running" ? this.state.port : null;
  }

  private clearIdleTimer(): void {
    if (!this.idleTimer) return;
    clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  private async doStart(modelPath: string): Promise<number> {
    const dynamicImport = new Function("id", "return import(id)") as (id: string) => Promise<unknown>;
    const mod = await dynamicImport("node-llama-cpp") as Record<string, unknown>;
    const getLlama = mod.getLlama as ((options?: { gpu?: string }) => Promise<unknown>) | undefined;
    if (!getLlama) {
      throw new Error("node-llama-cpp getLlama() API not found");
    }
    const llama = await getLlama({ gpu: "auto" });

    const maybeCreateServer = llama as {
      createServer?: (options: {
        modelPath: string;
        port?: number;
        contextSize?: number;
        gpuLayers?: number;
      }) => Promise<DisposableServer>;
    };

    let server: DisposableServer;
    if (typeof maybeCreateServer.createServer === "function") {
      server = await maybeCreateServer.createServer({
        modelPath,
        port: 0,
        contextSize: DEFAULT_CONTEXT_SIZE,
        gpuLayers: DEFAULT_GPU_LAYERS,
      });
    } else {
      const LlamaServer = mod.LlamaServer as
        | (new (options: {
          llama: unknown;
          modelPath: string;
          port?: number;
          contextSize?: number;
          gpuLayers?: number;
        }) => DisposableServer)
        | undefined;
      if (!LlamaServer) {
        throw new Error("node-llama-cpp server API not found");
      }
      server = new LlamaServer({
        llama,
        modelPath,
        port: 0,
        contextSize: DEFAULT_CONTEXT_SIZE,
        gpuLayers: DEFAULT_GPU_LAYERS,
      });
      if (typeof server.start === "function") {
        await server.start();
      }
    }

    const port = Number(server.port);
    if (!Number.isFinite(port) || port <= 0) {
      throw new Error("Invalid sidecar port");
    }

    this.state = { status: "running", port, server };
    this.resetIdleTimer();
    logger.info("Llama sidecar started", { modelPath, port });
    return port;
  }
}

export const sidecarManager = new SidecarManager();
