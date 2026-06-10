import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { createLogger } from "../../../shared/logger/index.js";
import type { UtilitySidecarPurpose, UtilitySidecarStatus } from "../../../shared/types/index.js";
import { UTILITY_EMBEDDING_SERVER_DEFAULTS } from "./embeddingModelConstants.js";

const sidecarLogger = createLogger("UtilitySidecarSupervisor");
const HEALTH_POLL_INTERVAL_MS = 500;
const HEALTH_POLL_TIMEOUT_MS = 30_000;
const IDLE_SHUTDOWN_MS = 3 * 60_000;
const COOLDOWN_BASE_MS = 5_000;
const COOLDOWN_MAX_MS = 60_000;
const STDERR_BUFFER_LIMIT = 2_000;
const STATUS_DIAGNOSTIC_LIMIT = 500;
const DEFAULT_CHAT_CACHE_RAM_MIB = 2048;
const DEFAULT_CHAT_CACHE_REUSE = 256;

const pathLabel = (value: string) => path.basename(value);
const redactPaths = (value: string): string =>
  value
    .replace(/\/Users\/[^\n\r]+?(?=\s(?:ENOENT|EACCES|EPERM|from|to|at|with|$))/g, "<path>")
    .replace(/(?:\/Users\/[^/\s]+|\/private\/var\/folders|\/var\/folders|\/tmp|\/[A-Za-z0-9._-]+)+(?:\/[^\s:'"]+)*/g, "<path>")
    .replace(/[A-Za-z]:\\[^\s:'"]+/g, "<path>");

type SidecarState =
  | { status: "stopped"; lastError?: string }
  | { status: "starting"; modelPath: string; configKey: string; lastError?: string }
  | { status: "running"; modelPath: string; configKey: string; port: number; proc: ChildProcess; lastError?: string }
  | { status: "stopping"; modelPath: string; lastError?: string }
  | { status: "crashed"; modelPath?: string; lastError: string; failureCount: number }
  | { status: "cooldown"; modelPath?: string; cooldownUntil: number; lastError: string; failureCount: number };

export type SidecarStartOptions = {
  gpuLayers?: number;
  contextSize?: number;
  cacheRamMiB?: number;
  cacheReuse?: number;
};

type SidecarStatusListener = (status: UtilitySidecarStatus) => void;

export class UtilitySidecarSupervisor {
  private state: SidecarState = { status: "stopped" };
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private startingPromise: Promise<{ baseUrl: string }> | null = null;
  private stderrBuffer = "";
  private statusListeners = new Set<SidecarStatusListener>();
  private consecutiveFailures = 0;

  constructor(private readonly purpose: UtilitySidecarPurpose = "chat") {}

  isRunning(): boolean {
    return this.state.status === "running";
  }

  getBaseUrl(): string | null {
    if (this.state.status !== "running") return null;
    return `http://127.0.0.1:${this.state.port}`;
  }

  status(): UtilitySidecarStatus {
    if (this.state.status === "running") {
      const status: UtilitySidecarStatus = {
        status: "running",
        modelPath: this.state.modelPath,
        baseUrl: `http://127.0.0.1:${this.state.port}`,
      };
      if (this.state.lastError) status.lastError = this.state.lastError;
      return status;
    }
    if (this.state.status === "starting") {
      const status: UtilitySidecarStatus = {
        status: "starting",
        modelPath: this.state.modelPath,
      };
      if (this.state.lastError) status.lastError = this.state.lastError;
      return status;
    }
    if (this.state.status === "stopping") {
      const status: UtilitySidecarStatus = {
        status: "stopping",
        modelPath: this.state.modelPath,
      };
      if (this.state.lastError) status.lastError = this.state.lastError;
      return status;
    }
    if (this.state.status === "crashed") {
      return {
        status: "crashed",
        modelPath: this.state.modelPath,
        lastError: this.state.lastError,
        failureCount: this.state.failureCount,
        diagnostic: this.safeDiagnosticTail(),
      };
    }
    if (this.state.status === "cooldown") {
      return {
        status: "cooldown",
        modelPath: this.state.modelPath,
        cooldownUntil: this.state.cooldownUntil,
        lastError: this.state.lastError,
        failureCount: this.state.failureCount,
        diagnostic: this.safeDiagnosticTail(),
      };
    }
    if (this.state.lastError) {
      return {
        status: "stopped",
        lastError: this.state.lastError,
        diagnostic: this.safeDiagnosticTail(),
      };
    }
    return { status: "stopped" };
  }

  onStatusChange(listener: SidecarStatusListener): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  async ensureStarted(
    binaryPath: string,
    modelPath: string,
    options?: SidecarStartOptions,
  ): Promise<{ baseUrl: string }> {
    const configKey = this.buildConfigKey(binaryPath, modelPath, options);
    if (this.state.status === "running" && this.state.configKey === configKey) {
      this.resetIdleTimer();
      return { baseUrl: `http://127.0.0.1:${this.state.port}` };
    }
    if (this.startingPromise) return this.startingPromise;
    if (this.state.status === "cooldown") {
      if (Date.now() < this.state.cooldownUntil) {
        throw new Error(this.state.lastError);
      }
      this.state = { status: "stopped", lastError: this.state.lastError };
      this.emitStatusChange();
    }

    this.startingPromise = this.doStart(binaryPath, modelPath, configKey, options).finally(() => {
      this.startingPromise = null;
    });
    return this.startingPromise;
  }

  private async doStart(
    binaryPath: string,
    modelPath: string,
    configKey: string,
    options?: SidecarStartOptions,
  ): Promise<{ baseUrl: string }> {
    if (this.state.status === "running") {
      await this.stop();
    }

    this.stderrBuffer = "";
    this.state = { status: "starting", modelPath, configKey };
    this.emitStatusChange();
    const port = await this.findFreePort();
    const args = this.buildSpawnArgs(modelPath, port, options);

    sidecarLogger.info("Spawning sidecar runtime inside utilityProcess", {
      route: "sidecar",
      backend: "local-sidecar",
      implementation: "llama-server",
      purpose: this.purpose,
      binary: pathLabel(binaryPath),
      port,
      model: pathLabel(modelPath),
    });
    const proc = spawn(binaryPath, args, {
      stdio: ["pipe", "ignore", "pipe"],
      detached: false,
    });

    proc.on("error", (error) => {
      const message = error instanceof Error ? error.message : String(error);
      const safeMessage = redactPaths(message);
      sidecarLogger.error("Sidecar runtime spawn error in utilityProcess", {
        route: "sidecar",
        backend: "local-sidecar",
        implementation: "llama-server",
        purpose: this.purpose,
        error: safeMessage,
      });
      this.markCooldown(modelPath, `SIDECAR_SPAWN_FAILED: ${safeMessage}`);
    });
    proc.on("exit", (code) => {
      sidecarLogger.info("Sidecar runtime exited in utilityProcess", {
        route: "sidecar",
        backend: "local-sidecar",
        implementation: "llama-server",
        purpose: this.purpose,
        code,
      });
      if (this.state.status === "running" || this.state.status === "starting") {
        const lastError = `SIDECAR_EXITED: llama-server exited with code ${code ?? "unknown"}`;
        this.consecutiveFailures += 1;
        this.state = {
          status: "crashed",
          modelPath,
          lastError,
          failureCount: this.consecutiveFailures,
        };
        this.emitStatusChange();
        this.markCooldown(modelPath, lastError, false);
      }
      this.clearIdleTimer();
    });
    proc.stderr?.on("data", (data: Buffer) => {
      this.appendStderr(data.toString());
      sidecarLogger.debug("Sidecar runtime stderr in utilityProcess", {
        route: "sidecar",
        backend: "local-sidecar",
        implementation: "llama-server",
        purpose: this.purpose,
        msg: redactPaths(data.toString()).slice(0, 200),
      });
    });

    this.state = { status: "running", modelPath, configKey, port, proc };
    try {
      await this.waitForHealth(port);
    } catch (error) {
      await this.stop();
      const message = error instanceof Error ? error.message : String(error);
      this.markCooldown(modelPath, `SIDECAR_HEALTH_TIMEOUT: ${message}`);
      throw error;
    }

    this.resetIdleTimer();
    this.consecutiveFailures = 0;
    sidecarLogger.info("Sidecar runtime ready in utilityProcess", {
      route: "sidecar",
      backend: "local-sidecar",
      implementation: "llama-server",
      purpose: this.purpose,
      port,
    });
    this.emitStatusChange();
    return { baseUrl: `http://127.0.0.1:${port}` };
  }

  async stop(): Promise<void> {
    this.clearIdleTimer();
    if (this.state.status !== "running") return;
    const { proc, modelPath, lastError } = this.state;
    this.state = { status: "stopping", modelPath, lastError };
    this.emitStatusChange();
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
    this.state = { status: "stopped", lastError };
    this.emitStatusChange();
    sidecarLogger.info("llama-server stopped in utilityProcess");
  }

  private buildConfigKey(
    binaryPath: string,
    modelPath: string,
    options?: SidecarStartOptions,
  ): string {
    return [
      this.purpose,
      binaryPath,
      modelPath,
      options?.gpuLayers ?? "",
      options?.contextSize ?? "",
      options?.cacheRamMiB ?? "",
      options?.cacheReuse ?? "",
    ].join("::");
  }

  private markCooldown(
    modelPath: string | undefined,
    lastError: string,
    incrementFailureCount = true,
  ): void {
    this.clearIdleTimer();
    if (incrementFailureCount) {
      this.consecutiveFailures += 1;
    }
    const cooldownMs = Math.min(
      COOLDOWN_BASE_MS * (2 ** Math.max(0, this.consecutiveFailures - 1)),
      COOLDOWN_MAX_MS,
    );
    this.state = {
      status: "cooldown",
      modelPath,
      cooldownUntil: Date.now() + cooldownMs,
      lastError: redactPaths(lastError),
      failureCount: this.consecutiveFailures,
    };
    this.emitStatusChange();
  }

  private emitStatusChange(): void {
    if (this.statusListeners.size === 0) return;
    const status = this.status();
    for (const listener of this.statusListeners) {
      try {
        listener(status);
      } catch (error) {
        sidecarLogger.warn("Utility sidecar status listener failed", { error });
      }
    }
  }

  private appendStderr(chunk: string): void {
    this.stderrBuffer = `${this.stderrBuffer}${chunk}`.slice(-STDERR_BUFFER_LIMIT);
  }

  private safeDiagnosticTail(): string | undefined {
    if (!this.stderrBuffer.trim()) return undefined;
    return redactPaths(this.stderrBuffer).slice(-STATUS_DIAGNOSTIC_LIMIT);
  }

  private buildSpawnArgs(
    modelPath: string,
    port: number,
    options?: SidecarStartOptions,
  ): string[] {
    if (this.purpose === "embedding") {
      return [
        "--model",
        modelPath,
        "--port",
        String(port),
        "--host",
        "127.0.0.1",
        "--embeddings",
        "--pooling",
        UTILITY_EMBEDDING_SERVER_DEFAULTS.pooling,
        "--ctx-size",
        String(options?.contextSize ?? UTILITY_EMBEDDING_SERVER_DEFAULTS.contextSize),
        "--n-gpu-layers",
        String(options?.gpuLayers ?? UTILITY_EMBEDDING_SERVER_DEFAULTS.gpuLayers),
        "--threads",
        String(UTILITY_EMBEDDING_SERVER_DEFAULTS.threads),
        "--log-disable",
      ];
    }

    const contextSize = options?.contextSize ?? 4096;
    const gpuLayers = options?.gpuLayers ?? -1;
    const cacheRamMiB = options?.cacheRamMiB ?? DEFAULT_CHAT_CACHE_RAM_MIB;
    const cacheReuse = options?.cacheReuse ?? DEFAULT_CHAT_CACHE_REUSE;
    const slotSavePath = path.join(
      process.env.LUIE_USER_DATA_PATH ?? process.cwd(),
      "llm-cache",
      this.purpose,
    );
    mkdirSync(slotSavePath, { recursive: true });
    return [
      "--model",
      modelPath,
      "--port",
      String(port),
      "--host",
      "127.0.0.1",
      "--ctx-size",
      String(contextSize),
      "--n-gpu-layers",
      String(gpuLayers),
      "--threads",
      "4",
      "--parallel",
      "1",
      "--flash-attn",
      "--cache-type-k",
      "q8_0",
      "--cache-type-v",
      "q8_0",
      "--cache-ram",
      String(cacheRamMiB),
      "--cache-reuse",
      String(cacheReuse),
      "--slot-save-path",
      slotSavePath,
      "--log-disable",
    ];
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

export const utilitySidecarSupervisor = new UtilitySidecarSupervisor();
export const utilityEmbeddingSidecarSupervisor = new UtilitySidecarSupervisor("embedding");
