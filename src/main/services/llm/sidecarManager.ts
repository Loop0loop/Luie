import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { app } from "electron";
import { createLogger } from "../../../shared/logger/index.js";
import { LLAMA_SERVER_DEFAULTS } from "./sidecarConstants.js";

const logger = createLogger("SidecarManager");

const HEALTH_POLL_INTERVAL_MS = 500;
const HEALTH_POLL_TIMEOUT_MS = 30_000;
const IDLE_SHUTDOWN_MS = 3 * 60_000;

type SidecarState =
  | { status: "stopped" }
  | { status: "starting"; modelPath: string }
  | { status: "running"; modelPath: string; port: number; proc: ChildProcess };

export class SidecarManager {
  private state: SidecarState = { status: "stopped" };
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private startingPromise: Promise<string> | null = null;

  getBinDir(): string {
    return path.join(app.getPath("userData"), "llm-bin");
  }

  getModelsDir(): string {
    return path.join(app.getPath("userData"), "llm-models");
  }

  isRunning(): boolean {
    return this.state.status === "running";
  }

  getBaseUrl(): string | null {
    if (this.state.status !== "running") return null;
    return `http://127.0.0.1:${this.state.port}`;
  }

  async ensureStarted(binaryPath: string, modelPath: string, options?: {
    gpuLayers?: number;
    contextSize?: number;
    signal?: AbortSignal;
  }): Promise<string> {
    if (this.state.status === "running" && this.state.modelPath === modelPath) {
      this.resetIdleTimer();
      return `http://127.0.0.1:${this.state.port}`;
    }
    if (this.startingPromise) return this.startingPromise;

    this.startingPromise = this.doStart(binaryPath, modelPath, options).finally(() => {
      this.startingPromise = null;
    });
    return this.startingPromise;
  }

  private async doStart(binaryPath: string, modelPath: string, options?: {
    gpuLayers?: number;
    contextSize?: number;
    signal?: AbortSignal;
  }): Promise<string> {
    if (this.state.status === "running") {
      await this.stop();
    }

    this.state = { status: "starting", modelPath };
    const port = await this.findFreePort();
    const args = [
      "--model", modelPath,
      "--port", String(port),
      "--host", "127.0.0.1",
      "--ctx-size", String(options?.contextSize ?? LLAMA_SERVER_DEFAULTS.contextSize),
      "--n-gpu-layers", String(options?.gpuLayers ?? LLAMA_SERVER_DEFAULTS.gpuLayers),
      "--threads", String(LLAMA_SERVER_DEFAULTS.threads),
      "--parallel", String(LLAMA_SERVER_DEFAULTS.parallel),
      ...(LLAMA_SERVER_DEFAULTS.flashAttention ? ["--flash-attn"] : []),
      "--cache-type-k", LLAMA_SERVER_DEFAULTS.cacheTypeK,
      "--cache-type-v", LLAMA_SERVER_DEFAULTS.cacheTypeV,
      "--log-disable",
    ];

    logger.info("Spawning llama-server", { binaryPath, port, modelPath });
    const proc = spawn(binaryPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });

    proc.on("error", (error) => {
      logger.error("llama-server spawn error", { error });
      this.state = { status: "stopped" };
      this.clearIdleTimer();
    });
    proc.on("exit", (code) => {
      logger.info("llama-server exited", { code });
      this.state = { status: "stopped" };
      this.clearIdleTimer();
    });
    proc.stderr?.on("data", (data: Buffer) => {
      logger.debug("llama-server stderr", { msg: data.toString().slice(0, 200) });
    });

    this.state = { status: "running", modelPath, port, proc };
    try {
      await this.waitForHealth(port, options?.signal);
    } catch (error) {
      await this.stop();
      throw error;
    }

    this.resetIdleTimer();
    logger.info("llama-server ready", { port });
    return `http://127.0.0.1:${port}`;
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
    logger.info("llama-server stopped");
  }

  private async waitForHealth(port: number, signal?: AbortSignal): Promise<void> {
    const deadline = Date.now() + HEALTH_POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (signal?.aborted) throw new Error("SidecarManager: start aborted");
      try {
        // eslint-disable-next-line no-await-in-loop -- Health checks are intentionally sequential polls.
        const response = await fetch(`http://127.0.0.1:${port}/health`, {
          signal: AbortSignal.timeout(2_000),
        });
        if (response.ok) return;
      } catch {
        // The server is still starting.
      }
      // eslint-disable-next-line no-await-in-loop -- Poll interval must be applied between each health request.
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
      logger.info("llama-server idle timeout, stopping");
      void this.stop();
    }, IDLE_SHUTDOWN_MS);
  }

  private clearIdleTimer(): void {
    if (!this.idleTimer) return;
    clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }
}

export const sidecarManager = new SidecarManager();
