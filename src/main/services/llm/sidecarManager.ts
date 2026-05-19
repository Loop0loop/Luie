import { spawn } from "child_process";
import type { ChildProcess } from "child_process";
import { createLogger } from "../../../shared/logger/index.js";

const logger = createLogger("SidecarManager");
const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_GPU_LAYERS = 999;
const DEFAULT_CONTEXT_SIZE = 4096;


type SidecarState =
  | { status: "stopped" }
  | { status: "starting"; promise: Promise<string> }
  | { status: "running"; baseUrl: string; proc: ChildProcess | null };

export class SidecarManager {
  private state: SidecarState = { status: "stopped" };
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly idleTimeoutMs: number = DEFAULT_IDLE_TIMEOUT_MS) {}

  /** Start sidecar if needed. Returns base URL (e.g. "http://127.0.0.1:8080"). */
  async start(modelPath: string): Promise<string> {
    if (this.state.status === "running") {
      this.resetIdleTimer();
      return this.state.baseUrl;
    }
    if (this.state.status === "starting") {
      return this.state.promise;
    }

    const promise = this.doStart(modelPath);
    this.state = { status: "starting", promise };

    try {
      const baseUrl = await promise;
      return baseUrl;
    } catch (error) {
      this.state = { status: "stopped" };
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.clearIdleTimer();
    if (this.state.status !== "running") return;
    const { proc } = this.state;
    this.state = { status: "stopped" };
    if (proc && !proc.killed) {
      proc.kill("SIGTERM");
      await new Promise<void>((resolve) => {
        proc.once("exit", () => resolve());
        setTimeout(resolve, 3000);
      });
    }
    logger.info("Llama sidecar stopped");
  }

  resetIdleTimer(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      logger.info("Llama sidecar idle timeout, stopping");
      void this.stop().catch((err) => logger.warn("Stop failed", { err }));
    }, this.idleTimeoutMs);
  }

  /** Returns base URL if sidecar is running, null otherwise. */
  getBaseUrl(): string | null {
    return this.state.status === "running" ? this.state.baseUrl : null;
  }

  /** Legacy compat: parse port from baseUrl. */
  getPort(): number | null {
    const url = this.getBaseUrl();
    if (!url) return null;
    try {
      return Number(new URL(url).port) || null;
    } catch {
      return null;
    }
  }

  private clearIdleTimer(): void {
    if (!this.idleTimer) return;
    clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  private async doStart(modelPath: string): Promise<string> {
    // 1. Explicit base URL override — connect to external server, no spawn.
    const envUrl = process.env.LLAMA_SERVER_BASE_URL;
    if (envUrl) {
      const baseUrl = envUrl.replace(/\/$/, "");
      logger.info("Using LLAMA_SERVER_BASE_URL", { baseUrl });
      this.state = { status: "running", baseUrl, proc: null };
      this.resetIdleTimer();
      return baseUrl;
    }

    // 2. Spawn llama-server binary from LLAMA_SERVER_PATH or PATH.
    const binaryPath = process.env.LLAMA_SERVER_PATH ?? "llama-server";
    return this.spawnServer(binaryPath, modelPath);
  }

  private async spawnServer(binaryPath: string, modelPath: string): Promise<string> {
    const port = await this.findFreePort();
    logger.info("Spawning llama-server", { binaryPath, modelPath, port });

    const proc = spawn(binaryPath, [
      "--model", modelPath,
      "--port", String(port),
      "--ctx-size", String(DEFAULT_CONTEXT_SIZE),
      "--n-gpu-layers", String(DEFAULT_GPU_LAYERS),
      "--parallel", "1",
    ], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });

    // Fail fast if binary not found (ENOENT) or not executable (EACCES).
    await new Promise<void>((resolve, reject) => {
      proc.once("error", reject);
      proc.once("spawn", () => { proc.off("error", reject); resolve(); });
    });

    proc.stdout?.on("data", (d: Buffer) => logger.debug("sidecar stdout", { msg: d.toString().trim() }));
    proc.stderr?.on("data", (d: Buffer) => logger.debug("sidecar stderr", { msg: d.toString().trim() }));

    proc.on("exit", (code, sig) => {
      logger.warn("Llama sidecar exited", { code, sig });
      if (this.state.status === "running") {
        this.state = { status: "stopped" };
      }
      this.clearIdleTimer();
    });

    // Wait for health endpoint to become ready (60s timeout).
    const baseUrl = `http://127.0.0.1:${port}`;
    const ready = await this.waitForReady(baseUrl + "/health", 60_000, proc);
    if (!ready) {
      proc.kill("SIGTERM");
      throw new Error(
        `llama-server failed to become ready on port ${port}. ` +
        `Binary: "${binaryPath}". Check LLAMA_SERVER_PATH or set LLAMA_SERVER_BASE_URL.`
      );
    }

    this.state = { status: "running", baseUrl, proc };
    this.resetIdleTimer();
    logger.info("Llama sidecar ready", { baseUrl });
    return baseUrl;
  }

  private async probe(url: string, timeoutMs = 1500): Promise<boolean> {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      return resp.ok;
    } catch {
      return false;
    }
  }

  private async waitForReady(
    healthUrl: string,
    timeoutMs: number,
    proc: ChildProcess,
  ): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (proc.exitCode !== null) return false; // already exited
      if (await this.probe(healthUrl, 500)) return true;
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  }

  private async findFreePort(): Promise<number> {
    const { createServer } = await import("net");
    return new Promise((resolve, reject) => {
      const srv = createServer();
      srv.listen(0, "127.0.0.1", () => {
        const addr = srv.address();
        const port = typeof addr === "object" && addr ? addr.port : 0;
        srv.close(() => resolve(port));
      });
      srv.on("error", reject);
    });
  }
}

export const sidecarManager = new SidecarManager();
