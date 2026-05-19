import type { GenerateOptions, ModelRuntimeClient } from "../modelRuntimeClient.js";
import { sidecarManager } from "../sidecarManager.js";
import { createLogger } from "../../../../shared/logger/index.js";
import { LlamaCppProvider } from "./llamaCppProvider.js";

type LlamaServerProviderOptions = {
  modelPath: string;
};

export class LlamaServerProvider implements ModelRuntimeClient {
  readonly providerName = "llamaserver";
  private readonly logger = createLogger("LlamaServerProvider");
  private llamaCppFallback: LlamaCppProvider | null = null;

  constructor(private readonly options: LlamaServerProviderOptions) {}

  private isSpawnEnoent(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const candidate = error as { code?: unknown; message?: unknown };
    if (candidate.code === "ENOENT") return true;
    if (typeof candidate.message === "string" && candidate.message.includes("ENOENT")) {
      return true;
    }
    return false;
  }

  private getOrCreateFallback(): LlamaCppProvider {
    if (!this.llamaCppFallback) {
      this.llamaCppFallback = new LlamaCppProvider(this.options.modelPath);
    }
    return this.llamaCppFallback;
  }

  async isAvailable(): Promise<boolean> {
    // Do NOT start the sidecar here — background workers call isAvailable() frequently.
    // Only check if a sidecar is already running and reachable.
    const baseUrl = sidecarManager.getBaseUrl();
    if (!baseUrl) return false;
    try {
      const resp = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(2000) });
      return resp.ok;
    } catch {
      return false;
    }
  }

  isModelLoaded(): boolean {
    return sidecarManager.getBaseUrl() !== null;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const chunks: string[] = [];
    for await (const delta of this.generateStream(prompt, options)) {
      chunks.push(delta);
    }
    return chunks.join("");
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    let baseUrl: string;
    try {
      baseUrl = await sidecarManager.start(this.options.modelPath);
    } catch (error) {
      if (this.isSpawnEnoent(error)) {
        this.logger.warn("llama-server binary not found; falling back to llamacpp", {
          modelPath: this.options.modelPath,
        });
        const fallback = this.getOrCreateFallback();
        for await (const delta of fallback.generateStream(prompt, options)) {
          yield delta;
        }
        return;
      }
      throw error;
    }
    sidecarManager.resetIdleTimer();

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/v1/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          stream: true,
          max_tokens: options?.maxTokens ?? 256,
          temperature: options?.temperature ?? 0.2,
        }),
      });
    } catch (err) {
      // Network failure — sidecar may have died. Reset state so next call retries.
      void sidecarManager.stop().catch(() => {});
      throw err;
    }

    if (!response.ok || !response.body) {
      throw new Error(`Llama sidecar completion failed: HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice("data:".length).trim();
          if (payload === "[DONE]") return;
          if (!payload) continue;
          try {
            const parsed = JSON.parse(payload) as {
              choices?: Array<{ text?: string; delta?: { content?: string } }>;
            };
            const chunk =
              parsed.choices?.[0]?.text ??
              parsed.choices?.[0]?.delta?.content ??
              "";
            if (chunk.length > 0) yield chunk;
          } catch {
            // Ignore malformed SSE line.
          }
        }
      }
    } finally {
      reader.releaseLock();
      sidecarManager.resetIdleTimer();
    }
  }

  async embed(_texts: string[]): Promise<Float32Array[] | null> {
    return null;
  }
}
