/**
 * embeddingSidecarManager — 임베딩 전용 llama-server 인스턴스 관리.
 *
 * 생성(chat) sidecar 와 완전히 분리된 프로세스/포트/idle 타이머를 갖는다(R5 메모리 분리).
 * llama-server 를 `--embedding(s) --pooling mean` 으로 띄워 `/v1/embeddings` 를 활성화한다.
 *
 * 격리 원칙(P1/R2.1):
 *   스폰 실패/크래시 시 상태만 stopped 로 두고 throw 를 전파하지 않는다.
 *   호출측(resolveEmbeddingRuntimeClient/embed)은 baseUrl=null 이면 임베딩을 skip 한다.
 *
 * 자동 재시작(R2.4):
 *   연속 실패 시 백오프(1s→5s→30s)와 최대 시도 횟수로 무한 루프를 방지한다.
 */

import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import { createLogger } from "../../../shared/logger/index.js";
import { EMBEDDING_SERVER_DEFAULTS } from "./embeddingModelConstants.js";

const logger = createLogger("EmbeddingSidecarManager");

const HEALTH_POLL_INTERVAL_MS = 500;
const HEALTH_POLL_TIMEOUT_MS = 30_000;

const RESTART_BACKOFFS_MS = [1_000, 5_000, 30_000] as const;
const MAX_RESTART_ATTEMPTS = RESTART_BACKOFFS_MS.length;

type SidecarState =
  | { status: "stopped" }
  | { status: "starting"; modelPath: string }
  | { status: "running"; modelPath: string; port: number; proc: ChildProcess };

export class EmbeddingSidecarManager {
  private state: SidecarState = { status: "stopped" };
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private startingPromise: Promise<string | null> | null = null;
  private failedAttempts = 0;
  private cooldownUntil = 0;

  isRunning(): boolean {
    return this.state.status === "running";
  }

  getBaseUrl(): string | null {
    if (this.state.status !== "running") return null;
    return `http://127.0.0.1:${this.state.port}`;
  }

  /**
   * 임베딩 sidecar 를 보장한다. 성공 시 baseUrl, 실패 시 null(throw 금지).
   * 백오프 쿨다운 중에는 즉시 null 을 반환해 호출측이 FTS 폴백하도록 한다.
   */
  async ensureStarted(
    binaryPath: string,
    modelPath: string,
    options?: { signal?: AbortSignal },
  ): Promise<string | null> {
    if (this.state.status === "running" && this.state.modelPath === modelPath) {
      this.resetIdleTimer();
      return `http://127.0.0.1:${this.state.port}`;
    }
    if (this.startingPromise) return this.startingPromise;

    if (Date.now() < this.cooldownUntil) {
      // 백오프 쿨다운 중 — 임베딩은 잠시 비활성, FTS 폴백.
      return null;
    }

    this.startingPromise = this.doStart(binaryPath, modelPath, options).finally(() => {
      this.startingPromise = null;
    });
    return this.startingPromise;
  }

  private async doStart(
    binaryPath: string,
    modelPath: string,
    options?: { signal?: AbortSignal },
  ): Promise<string | null> {
    if (this.state.status === "running") {
      await this.stop();
    }

    this.state = { status: "starting", modelPath };
    try {
      const port = await this.findFreePort();
      const args = [
        "--model", modelPath,
        "--port", String(port),
        "--host", "127.0.0.1",
        "--embeddings",
        "--pooling", EMBEDDING_SERVER_DEFAULTS.pooling,
        "--ctx-size", String(EMBEDDING_SERVER_DEFAULTS.contextSize),
        "--n-gpu-layers", String(EMBEDDING_SERVER_DEFAULTS.gpuLayers),
        "--threads", String(EMBEDDING_SERVER_DEFAULTS.threads),
        "--log-disable",
      ];

      logger.info("Spawning embedding llama-server", { binaryPath, port });
      const proc = spawn(binaryPath, args, {
        stdio: ["ignore", "ignore", "pipe"],
        detached: false,
      });

      proc.on("error", (error) => {
        logger.warn("embedding llama-server spawn error", {
          error: error instanceof Error ? error.message : String(error),
        });
        this.state = { status: "stopped" };
        this.clearIdleTimer();
      });
      proc.on("exit", (code) => {
        logger.info("embedding llama-server exited", { code });
        this.state = { status: "stopped" };
        this.clearIdleTimer();
      });
      proc.stderr?.on("data", (data: Buffer) => {
        logger.debug("embedding llama-server stderr", {
          msg: data.toString().slice(0, 200),
        });
      });

      this.state = { status: "running", modelPath, port, proc };
      await this.waitForHealth(port, options?.signal);

      // 성공 — 실패 카운터 리셋.
      this.failedAttempts = 0;
      this.cooldownUntil = 0;
      this.resetIdleTimer();
      logger.info("embedding llama-server ready", { port });
      return `http://127.0.0.1:${port}`;
    } catch (error) {
      await this.stop();
      this.registerFailure();
      logger.warn("embedding sidecar start failed; embeddings temporarily disabled", {
        error: error instanceof Error ? error.message : String(error),
        failedAttempts: this.failedAttempts,
      });
      return null;
    }
  }

  /** 연속 실패 시 백오프 쿨다운을 설정한다(R2.4). */
  private registerFailure(): void {
    const idx = Math.min(this.failedAttempts, MAX_RESTART_ATTEMPTS - 1);
    const backoff = RESTART_BACKOFFS_MS[idx];
    this.failedAttempts += 1;
    this.cooldownUntil = Date.now() + backoff;
  }

  async stop(): Promise<void> {
    this.clearIdleTimer();
    if (this.state.status !== "running") {
      this.state = { status: "stopped" };
      return;
    }
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
    logger.info("embedding llama-server stopped");
  }

  private async waitForHealth(port: number, signal?: AbortSignal): Promise<void> {
    const deadline = Date.now() + HEALTH_POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (signal?.aborted) throw new Error("EmbeddingSidecarManager: start aborted");
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
    throw new Error("embedding llama-server health check timed out");
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
      logger.info("embedding llama-server idle timeout, stopping");
      void this.stop();
    }, EMBEDDING_SERVER_DEFAULTS.idleShutdownMs);
    if (typeof this.idleTimer.unref === "function") {
      this.idleTimer.unref();
    }
  }

  private clearIdleTimer(): void {
    if (!this.idleTimer) return;
    clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }
}

export const embeddingSidecarManager = new EmbeddingSidecarManager();
