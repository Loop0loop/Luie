import type { GenerateOptions, ModelRuntimeClient } from "../modelRuntimeClient.js";

type ExternalApiConfig = {
  baseUrl: string;
  apiKey?: string;
  chatModel: string;
  embeddingModel?: string;
};

export class ExternalApiProvider implements ModelRuntimeClient {
  readonly providerName = "externalapi";

  constructor(private readonly config: ExternalApiConfig) {}

  private get headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
    };
  }

  private buildUrl(path: string): string {
    return `${this.config.baseUrl.replace(/\/$/, "")}${path}`;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this.buildUrl("/models"), {
        method: "GET",
        headers: this.headers,
        signal: AbortSignal.timeout(3_000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  isModelLoaded(): boolean {
    return true;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const chunks: string[] = [];
    for await (const delta of this.generateStream(prompt, options)) {
      chunks.push(delta);
    }
    return chunks.join("");
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    const response = await fetch(this.buildUrl("/completions"), {
      method: "POST",
      headers: this.headers,
      signal: options?.signal,
      body: JSON.stringify({
        model: this.config.chatModel,
        prompt,
        stream: true,
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxTokens ?? 256,
      }),
    });
    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => "");
      response.body?.cancel().catch(() => {});
      throw new Error(
        `External API completion failed: HTTP ${response.status} ${errorText.slice(0, 200)}`,
      );
    }
    yield* this.parseSseStream(response, "completion");
  }

  async *generateChatStream(
    input: { systemPrompt?: string; userPrompt: string },
    options?: GenerateOptions,
  ): AsyncIterable<string> {
    const response = await fetch(this.buildUrl("/chat/completions"), {
      method: "POST",
      headers: this.headers,
      signal: options?.signal,
      body: JSON.stringify({
        model: this.config.chatModel,
        stream: true,
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxTokens ?? 256,
        messages: [
          ...(input.systemPrompt
            ? [{ role: "system", content: input.systemPrompt }]
            : []),
          { role: "user", content: input.userPrompt },
        ],
      }),
    });
    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => "");
      response.body?.cancel().catch(() => {});
      throw new Error(
        `External API chat completion failed: HTTP ${response.status} ${errorText.slice(0, 200)}`,
      );
    }
    yield* this.parseSseStream(response, "chat");
  }

  async generateChat(
    input: { systemPrompt?: string; userPrompt: string },
    options?: GenerateOptions,
  ): Promise<string> {
    const chunks: string[] = [];
    for await (const delta of this.generateChatStream(input, options)) {
      chunks.push(delta);
    }
    return chunks.join("");
  }

  private async *parseSseStream(
    response: Response,
    mode: "chat" | "completion",
  ): AsyncIterable<string> {
    const reader = response.body?.getReader();
    if (!reader) return;
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
          if (!payload || payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload) as {
              choices?: Array<{
                text?: string;
                delta?: { content?: string };
              }>;
            };
            const chunk =
              mode === "chat"
                ? (parsed.choices?.[0]?.delta?.content ?? "")
                : (parsed.choices?.[0]?.text ?? parsed.choices?.[0]?.delta?.content ?? "");
            if (chunk.length > 0) {
              yield chunk;
            }
          } catch {
            // ignore malformed SSE payload
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async embed(texts: string[]): Promise<Float32Array[] | null> {
    if (!this.config.embeddingModel) return null;
    if (texts.length === 0) return [];

    const response = await fetch(this.buildUrl("/embeddings"), {
      method: "POST",
      headers: this.headers,
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: this.config.embeddingModel,
        input: texts,
      }),
    });
    if (!response.ok) {
      return null;
    }
    const parsed = await response.json() as {
      data?: Array<{ embedding?: number[] }>;
    };
    const rows = parsed.data ?? [];
    if (rows.length === 0) return [];
    const vectors: Float32Array[] = [];
    for (const row of rows) {
      if (!Array.isArray(row.embedding)) continue;
      vectors.push(Float32Array.from(row.embedding));
    }
    return vectors;
  }
}

export type { ExternalApiConfig };
