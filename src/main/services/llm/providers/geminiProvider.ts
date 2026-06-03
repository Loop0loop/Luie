/* eslint-disable no-await-in-loop */
import type { GenerateOptions, ModelRuntimeClient } from "../modelRuntimeClient.js";
import { isAppPackaged } from "../../../utils/appEnv.js";
import { getSupabaseConfig } from "../../features/sync/supabaseEnv.js";
import { ensureSyncAccessToken } from "../../features/sync/syncAccessToken.js";
import { settingsManager } from "../../../domains/settings/index.js";

type GeminiConfig = {
  apiKey: string;
  model: string;
  alternativeModel?: string;
  embeddingModel?: string;
};

type GeminiRequestBody = {
  contents: Array<{ parts: Array<{ text: string }> }>;
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
  };
  system_instruction?: {
    parts: Array<{ text: string }>;
  };
};

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

type GeminiStreamChunk = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

type GeminiEmbedResponse = {
  embedding?: {
    values?: number[];
  };
};

export class GeminiProvider implements ModelRuntimeClient {
  readonly providerName = "gemini";

  constructor(private readonly config: GeminiConfig) { }

  private async generateViaSupabase(
    input: { systemPrompt?: string; userPrompt: string },
    options?: GenerateOptions,
  ): Promise<string> {
    const supabaseConfig = getSupabaseConfig();
    if (!supabaseConfig) {
      throw new Error("SUPABASE_NOT_CONFIGURED: 번들 빌드 환경에서는 동기화 계정 연결이 필요합니다. 설정 > 동기화 탭에서 계정을 연결해 주세요.");
    }
    const syncSettings = settingsManager.getSyncSettings();
    const token = await ensureSyncAccessToken({
      syncSettings,
      isAuthFatalMessage: () => false,
    });

    const promptText = `${input.systemPrompt ? `${input.systemPrompt}\n\n` : ""}${input.userPrompt}`.trim();

    const res = await fetch(`${supabaseConfig.url}/functions/v1/gemini-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: options?.signal,
      body: JSON.stringify({
        model: this.config.model,
        prompt: promptText,
        temperature: options?.temperature ?? 0.2,
        maxOutputTokens: options?.maxTokens ?? 1024,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(`Gemini generate via Supabase Edge Function failed: HTTP ${res.status} ${errorText.slice(0, 200)}`);
    }

    const data = await res.json() as { text: string };
    return data.text ?? "";
  }

  private buildGenerateUrl(model: string): string {
    const encoded = encodeURIComponent(model);
    return `https://generativelanguage.googleapis.com/v1beta/models/${encoded}:generateContent?key=${encodeURIComponent(this.config.apiKey)}`;
  }

  private buildStreamGenerateUrl(model: string): string {
    const encoded = encodeURIComponent(model);
    return `https://generativelanguage.googleapis.com/v1beta/models/${encoded}:streamGenerateContent?alt=sse&key=${encodeURIComponent(this.config.apiKey)}`;
  }

  private buildEmbedUrl(model: string): string {
    const encoded = encodeURIComponent(model);
    return `https://generativelanguage.googleapis.com/v1beta/models/${encoded}:embedContent?key=${encodeURIComponent(this.config.apiKey)}`;
  }

  async isAvailable(): Promise<boolean> {
    if (isAppPackaged()) {
      return true; // 번들 환경에서는 항상 가용하다고 보고 프록시로 넘김
    }
    try {
      const res = await fetch(this.buildGenerateUrl(this.config.model), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5_000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 1, temperature: 0 },
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  isModelLoaded(): boolean {
    return true;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    return await this.generateChat(
      { userPrompt: prompt },
      options,
    );
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    yield* this.generateChatStream({ userPrompt: prompt }, options);
  }

  private buildRequestBody(
    input: { systemPrompt?: string; userPrompt: string },
    options?: GenerateOptions,
  ): GeminiRequestBody {
    const body: GeminiRequestBody = {
      contents: [{ parts: [{ text: input.userPrompt.trim() }] }],
      generationConfig: {
        temperature: options?.temperature ?? 0.2,
        maxOutputTokens: options?.maxTokens ?? 1024,
      },
    };
    const systemPrompt = input.systemPrompt?.trim();
    if (systemPrompt) {
      body.system_instruction = {
        parts: [{ text: systemPrompt }],
      };
    }
    return body;
  }

  async generateChat(
    input: { systemPrompt?: string; userPrompt: string },
    options?: GenerateOptions,
  ): Promise<string> {
    if (isAppPackaged()) {
      return await this.generateViaSupabase(input, options);
    }
    const modelOrder = [this.config.model, this.config.alternativeModel].filter(
      (v): v is string => typeof v === "string" && v.length > 0,
    );

    let lastError: Error | null = null;
    for (const model of modelOrder) {
      try {
        const res = await fetch(this.buildGenerateUrl(model), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: options?.signal,
          body: JSON.stringify(this.buildRequestBody(input, options)),
        });
        if (!res.ok) {
          const errorText = await res.text().catch(() => "");
          throw new Error(`Gemini generate failed: HTTP ${res.status} ${errorText.slice(0, 200)}`);
        }
        const data = (await res.json()) as GeminiGenerateResponse;
        const text =
          data.candidates?.[0]?.content?.parts
            ?.map((part) => part.text ?? "")
            .join("")
            .trim() ?? "";
        if (text.length > 0) {
          return text;
        }
        lastError = new Error(`Gemini generation returned empty text (model=${model})`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    throw lastError ?? new Error("Gemini generation failed");
  }

  async *generateChatStream(
    input: { systemPrompt?: string; userPrompt: string },
    options?: GenerateOptions,
  ): AsyncIterable<string> {
    if (isAppPackaged()) {
      const text = await this.generateViaSupabase(input, options);
      yield text;
      return;
    }
    const modelOrder = [this.config.model, this.config.alternativeModel].filter(
      (v): v is string => typeof v === "string" && v.length > 0,
    );

    let lastError: Error | null = null;
    for (const model of modelOrder) {
      try {
        let emitted = false;
        for await (const chunk of this.streamModel(model, input, options)) {
          emitted = true;
          yield chunk;
        }
        if (emitted) {
          return;
        }
        lastError = new Error(`Gemini stream returned empty text (model=${model})`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    throw lastError ?? new Error("Gemini streaming failed");
  }

  private async *streamModel(
    model: string,
    input: { systemPrompt?: string; userPrompt: string },
    options?: GenerateOptions,
  ): AsyncIterable<string> {
    const res = await fetch(this.buildStreamGenerateUrl(model), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: options?.signal,
      body: JSON.stringify(this.buildRequestBody(input, options)),
    });
    if (!res.ok || !res.body) {
      const errorText = await res.text().catch(() => "");
      throw new Error(`Gemini stream failed: HTTP ${res.status} ${errorText.slice(0, 200)}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assembled = "";
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
          if (!payload) continue;
          let parsed: GeminiStreamChunk | null = null;
          try {
            parsed = JSON.parse(payload) as GeminiStreamChunk;
          } catch {
            continue;
          }
          const text =
            parsed.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
          if (!text) continue;
          // API마다 chunk가 delta/fulltext로 다를 수 있어, fulltext면 diff만 내보냅니다.
          const delta = text.startsWith(assembled) ? text.slice(assembled.length) : text;
          if (delta.length > 0) {
            assembled = text.startsWith(assembled) ? text : `${assembled}${delta}`;
            yield delta;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async embed(texts: string[]): Promise<Float32Array[] | null> {
    const model = this.config.embeddingModel;
    if (!model) return null;
    if (texts.length === 0) return [];
    const results = await Promise.all(
      texts.map(async (text) => {
        const res = await fetch(this.buildEmbedUrl(model), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(30_000),
          body: JSON.stringify({
            content: { parts: [{ text }] },
          }),
        });
        if (!res.ok) {
          return null;
        }
        const data = (await res.json()) as GeminiEmbedResponse;
        const values = data.embedding?.values;
        if (!Array.isArray(values) || values.length === 0) {
          return null;
        }
        return Float32Array.from(values);
      }),
    );
    if (results.some((row) => row === null)) {
      return null;
    }
    return results as Float32Array[];
  }
}

export type { GeminiConfig };
