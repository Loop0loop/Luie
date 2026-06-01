import path from "node:path";
import { app } from "electron";
import { createLogger } from "../../../shared/logger/index.js";
import { utilityProcessBridge } from "../features/utility/utilityProcessBridge.js";

const logger = createLogger("SidecarManager");

type SidecarState =
  | { status: "stopped" }
  | { status: "starting"; modelPath: string }
  | { status: "running"; modelPath: string; baseUrl: string };

export class SidecarManager {
  private state: SidecarState = { status: "stopped" };
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
    return this.state.baseUrl;
  }

  async ensureStarted(binaryPath: string, modelPath: string, options?: {
    gpuLayers?: number;
    contextSize?: number;
    signal?: AbortSignal;
  }): Promise<string> {
    if (this.state.status === "running" && this.state.modelPath === modelPath) {
      return this.state.baseUrl;
    }
    if (this.startingPromise) return this.startingPromise;

    this.startingPromise = this.doStart(binaryPath, modelPath, options).finally(() => {
      this.startingPromise = null;
    });
    return this.startingPromise;
  }

  private async handleSpawnFailure(error: unknown): Promise<void> {
    try {
      const errCode = (error as { code?: string })?.code;
      const isTargetError = errCode === "EACCES" || errCode === "ENOENT" || errCode === "EPERM";
      
      logger.warn("Handling llama-server spawn failure...", { errCode, isTargetError });
      
      if (isTargetError) {
        const settingsManager = (await import("../../manager/settingsManager.js")).settingsManager;
        const currentSettings = settingsManager.getLocalLlmSettings();
        if (currentSettings) {
          settingsManager.setLocalLlmSettings({
            ...currentSettings,
            enabled: false,
            binaryPath: undefined,
          });
        }
        
        const binDir = this.getBinDir();
        const fsp = await import("node:fs/promises");
        await fsp.rm(binDir, { recursive: true, force: true }).catch((rmErr) => {
          logger.error("Failed to remove corrupted bin directory", { error: rmErr });
        });
        
        logger.info("Local LLM settings initialized and corrupted binaries removed due to spawn error.");
      }
    } catch (err) {
      logger.error("Failed to handle spawn failure recovery", { error: err });
    }
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
    logger.info("Requesting utilityProcess to spawn llama-server", { binaryPath, modelPath });

    try {
      if (options?.signal?.aborted) {
        throw new Error("SidecarManager: start aborted");
      }
      
      const baseUrl = await utilityProcessBridge.startSidecar(binaryPath, modelPath, options);
      this.state = { status: "running", modelPath, baseUrl };
      logger.info("llama-server sidecar spawned and active via utilityProcess", { baseUrl });
      return baseUrl;
    } catch (error) {
      logger.error("llama-server sidecar start via utilityProcess failed", { error });
      this.state = { status: "stopped" };
      await this.handleSpawnFailure(error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.state.status !== "running") return;
    this.state = { status: "stopped" };
    try {
      await utilityProcessBridge.stopSidecar();
      logger.info("llama-server sidecar stopped via utilityProcess");
    } catch (error) {
      logger.warn("Failed to clean up sidecar via utilityProcessBridge during stop", { error });
    }
  }
}

export const sidecarManager = new SidecarManager();
