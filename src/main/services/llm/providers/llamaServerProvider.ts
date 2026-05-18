import { createLogger } from "../../../../shared/logger/index.js";
import type { GenerateOptions, ModelRuntimeClient } from "../modelRuntimeClient.js";
import { sidecarManager } from "../sidecarManager.js";

const logger = createLogger("LlamaServerProvider");

type LlamaServerProviderOptions = {
  modelPath: string;
};

export class LlamaServerProvider implements ModelRuntimeClient {
  readonly providerName = "llamaserver";

  constructor(private readonly options: LlamaServerProviderOptions) {}

  async isAvailable(): Promise<boolean> {
    try {
      const port = await sidecarManager.start(this.options.modelPath);
      return port > 0;
    } catch (error) {
      logger.warn("Failed to start sidecar on availability check", { error });
      return false;
    }
  }

  isModelLoaded(): boolean {
    return sidecarManager.getPort() !== null;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const chunks: string[] = [];
    for await (const delta of this.generateStream(prompt, options)) {
      chunks.push(delta);
    }
    return chunks.join("");
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    const port = await sidecarManager.start(this.options.modelPath);
    sidecarManager.resetIdleTimer();
    const response = await fetch(`http://127.0.0.1:${port}/v1/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        stream: true,
        max_tokens: options?.maxTokens ?? 256,
        temperature: options?.temperature ?? 0.2,
      }),
    });
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
          if (payload === "[DONE]") {
            return;
          }
          if (!payload) continue;
          try {
            const parsed = JSON.parse(payload) as {
              choices?: Array<{ text?: string; delta?: { content?: string } }>;
            };
            const chunk =
              parsed.choices?.[0]?.text ??
              parsed.choices?.[0]?.delta?.content ??
              "";
            if (chunk.length > 0) {
              yield chunk;
            }
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
