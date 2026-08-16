/* eslint-disable no-await-in-loop -- streaming response는 chunk 순서대로 읽어야 한다. */
import type {
  GenerateOptions,
  ModelRuntimeClient,
  RuntimeSupabaseProxyResolver,
} from "../modelRuntimeClient.js";

type ExternalApiConfig = {
  baseUrl: string;
  apiKey?: string;
  chatModel: string;
  embeddingModel?: string;
  supabaseProxy?: RuntimeSupabaseProxyResolver;
};

export class ExternalApiProvider implements ModelRuntimeClient {
  readonly providerName = "externalapi";
  readonly generationMode: ModelRuntimeClient["generationMode"];

  constructor(private readonly config: ExternalApiConfig) {
    this.generationMode = config.supabaseProxy && config.baseUrl.includes("openai.com") ? "buffered" : "streaming";
  }

  private get usesOpenAiApi(): boolean {
    return this.config.baseUrl.includes("openai.com");
  }

  private tokenLimitPayload(maxTokens: number): { max_tokens: number } | { max_completion_tokens: number } {
    return this.usesOpenAiApi
      ? { max_completion_tokens: maxTokens }
      : { max_tokens: maxTokens };
  }

  private async generateViaSupabase(
    input: { systemPrompt?: string; userPrompt: string },
    options?: GenerateOptions,
  ): Promise<string> {
    if (!this.config.supabaseProxy) {
      throw new Error("SUPABASE_PROXY_NOT_CONFIGURED: OpenAI proxy resolver is missing");
    }
    const proxy = await this.config.supabaseProxy();

    const res = await fetch(proxy.functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${proxy.accessToken}`,
      },
      signal: options?.signal,
      body: JSON.stringify({
        endpoint: "chat.completions",
        model: this.config.chatModel,
        stream: false,
        temperature: options?.temperature ?? 0.2,
        ...this.tokenLimitPayload(options?.maxTokens ?? 1024),
        messages: [
          ...(input.systemPrompt
            ? [{ role: "system", content: input.systemPrompt }]
            : []),
          { role: "user", content: input.userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(`OpenAI generate via Supabase Edge Function failed: HTTP ${res.status} ${errorText.slice(0, 200)}`);
    }

    const data = await res.json() as {
      choices?: Array<{
        message?: { content?: string };
      }>;
    };
    return data.choices?.[0]?.message?.content ?? "";
  }

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
    if (this.config.supabaseProxy && this.config.baseUrl.includes("openai.com")) {
      // NOTE: bundled OpenAI provider는 utility proxy를 통해서만 호출한다.
      return true;
    }
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
    for await (const delta of this.generateChatStream({ userPrompt: prompt }, options)) {
      chunks.push(delta);
    }
    return chunks.join("");
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    yield* this.generateChatStream({ userPrompt: prompt }, options);
  }

  async *generateChatStream(
    input: { systemPrompt?: string; userPrompt: string },
    options?: GenerateOptions,
  ): AsyncIterable<string> {
    if (this.config.supabaseProxy && this.config.baseUrl.includes("openai.com")) {
      const text = await this.generateViaSupabase(input, options);
      yield text;
      return;
    }
    const response = await fetch(this.buildUrl("/chat/completions"), {
      method: "POST",
      headers: this.headers,
      signal: options?.signal,
      body: JSON.stringify({
        model: this.config.chatModel,
        stream: true,
        temperature: options?.temperature ?? 0.2,
        ...this.tokenLimitPayload(options?.maxTokens ?? 1024),
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
      response.body?.cancel().catch(() => { });
      throw new Error(
        `External API chat completion failed: HTTP ${response.status} ${errorText.slice(0, 200)}`,
      );
    }
    yield* this.parseSseStream(response);
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

  private async *parseSseStream(response: Response): AsyncIterable<string> {
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
            const chunk = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.text ?? "";
            if (chunk.length > 0) {
              yield chunk;
            }
          } catch {
            // NOTE: malformed SSE chunk는 다음 chunk 처리에 영향을 주지 않는다.
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
