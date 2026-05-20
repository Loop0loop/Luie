import fs from "node:fs/promises";
import type { GenerateOptions, ModelRuntimeClient } from "../modelRuntimeClient.js";
import {
  LLM_DEFAULT_CONTEXT_SIZE,
  LLM_DEFAULT_GPU_LAYERS,
  LLM_DEFAULT_IDLE_UNLOAD_MS,
} from "../../../constants/llm.js";

type LlamaContext = {
  modelPath: string;
  embeddingModelPath: string | null;
  contextSize: number;
  gpuLayers: number;
  model?: unknown;
  context?: unknown;
  // LlamaCompletion class reference cached from dynamic import to avoid re-importing per call
  LlamaCompletion?: unknown;
  LlamaChatSession?: unknown;
  embeddingModel?: unknown;
  embeddingContext?: unknown;
};  

// Minimal runtime wrapper with lazy dynamic import to keep startup resilient
// when node-llama-cpp is not installed.
export class LlamaCppProvider implements ModelRuntimeClient {
  readonly providerName = "llamacpp";
  private context: LlamaContext;
  private modelPromise: Promise<void> | null = null;
  private embeddingPromise: Promise<void> | null = null;
  private modelIdleUnloadTimer: ReturnType<typeof setTimeout> | null = null;
  private embeddingIdleUnloadTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly idleUnloadMs: number;
  private inFlightGenerateCount = 0;
  private inFlightEmbedCount = 0;

  constructor(modelPath: string, embeddingModelPath?: string | null, contextSize?: number, gpuLayers?: number) {
    const configuredIdle = Number.parseInt(process.env.LUIE_LLM_IDLE_UNLOAD_MS ?? "", 10);
    this.idleUnloadMs =
      Number.isFinite(configuredIdle) && configuredIdle > 0
        ? configuredIdle
        : LLM_DEFAULT_IDLE_UNLOAD_MS;
    this.context = {
      modelPath,
      embeddingModelPath: embeddingModelPath ?? null,
      contextSize: Math.max(4096, contextSize ?? LLM_DEFAULT_CONTEXT_SIZE),
      gpuLayers: gpuLayers ?? LLM_DEFAULT_GPU_LAYERS,
    };
  }

  private scheduleModelIdleUnload(): void {
    if (this.idleUnloadMs <= 0) return;
    if (this.modelIdleUnloadTimer) {
      clearTimeout(this.modelIdleUnloadTimer);
    }
    this.modelIdleUnloadTimer = setTimeout(() => {
      if (this.inFlightGenerateCount > 0) {
        this.scheduleModelIdleUnload();
        return;
      }
      this.unloadModel();
    }, this.idleUnloadMs);
    if (typeof this.modelIdleUnloadTimer.unref === "function") {
      this.modelIdleUnloadTimer.unref();
    }
  }

  private scheduleEmbeddingIdleUnload(): void {
    if (this.idleUnloadMs <= 0) return;
    if (this.embeddingIdleUnloadTimer) {
      clearTimeout(this.embeddingIdleUnloadTimer);
    }
    this.embeddingIdleUnloadTimer = setTimeout(() => {
      if (this.inFlightEmbedCount > 0) {
        this.scheduleEmbeddingIdleUnload();
        return;
      }
      this.unloadEmbedding();
    }, this.idleUnloadMs);
    if (typeof this.embeddingIdleUnloadTimer.unref === "function") {
      this.embeddingIdleUnloadTimer.unref();
    }
  }

  private unloadModel(): void {
    this.modelPromise = null;
    this.context.model = undefined;
    this.context.context = undefined;
    this.context.LlamaCompletion = undefined;
    if (this.modelIdleUnloadTimer) {
      clearTimeout(this.modelIdleUnloadTimer);
      this.modelIdleUnloadTimer = null;
    }
  }

  private unloadEmbedding(): void {
    this.embeddingPromise = null;
    this.context.embeddingModel = undefined;
    this.context.embeddingContext = undefined;
    if (this.embeddingIdleUnloadTimer) {
      clearTimeout(this.embeddingIdleUnloadTimer);
      this.embeddingIdleUnloadTimer = null;
    }
  }

  dispose(): void {
    this.unloadModel();
    this.unloadEmbedding();
  }

  private async ensureLoaded(): Promise<void> {
    if (this.modelPromise) {
      await this.modelPromise;
      return;
    }
    this.modelPromise = (async () => {
      const dynamicImport = new Function("id", "return import(id)") as (id: string) => Promise<unknown>;
      const mod = await dynamicImport("node-llama-cpp");
      const { getLlama, LlamaCompletion, LlamaChatSession } = mod as {
        getLlama: (options?: { gpu?: string; useMmap?: boolean }) => Promise<unknown>;
        LlamaCompletion: unknown;
        LlamaChatSession?: unknown;
      };
      // gpu: "auto" lets node-llama-cpp pick Metal (macOS), CUDA, or Vulkan automatically.
      const llama = await getLlama({ gpu: "auto", useMmap: true });
      // The package API is intentionally accessed via loose typing to avoid
      // compile-time coupling across minor API differences.
      const model = await (llama as { loadModel: (input: { modelPath: string; gpuLayers?: number; defaultContextFlashAttention?: boolean }) => Promise<unknown> })
        .loadModel({ modelPath: this.context.modelPath, gpuLayers: this.context.gpuLayers, defaultContextFlashAttention: true });
      const context = await (model as { createContext: (input: { contextSize: number }) => Promise<unknown> })
        .createContext({ contextSize: this.context.contextSize });
      this.context.model = model;
      this.context.context = context;
      this.context.LlamaCompletion = LlamaCompletion;
      this.context.LlamaChatSession = LlamaChatSession;
    })();
    try {
      await this.modelPromise;
    } catch (error) {
      // Allow retry after transient/model initialization failures.
      this.modelPromise = null;
      throw error;
    }
  }

  private async ensureEmbeddingLoaded(): Promise<void> {
    if (this.embeddingPromise) {
      await this.embeddingPromise;
      return;
    }
    this.embeddingPromise = (async () => {
      const embeddingModelPath = this.context.embeddingModelPath ?? this.context.modelPath;
      const isSameModel = embeddingModelPath === this.context.modelPath;

      let model: unknown;
      if (isSameModel) {
        if (!this.context.model) {
          await this.ensureLoaded();
        }
        model = this.context.model;
      } else {
        const dynamicImport = new Function("id", "return import(id)") as (id: string) => Promise<unknown>;
        const mod = await dynamicImport("node-llama-cpp");
        const getLlama = (mod as { getLlama: (options?: { gpu?: string; useMmap?: boolean }) => Promise<unknown> }).getLlama;
        const llama = await getLlama({ gpu: "auto", useMmap: true });
        model = await (llama as { loadModel: (input: { modelPath: string; gpuLayers?: number; defaultContextFlashAttention?: boolean }) => Promise<unknown> })
          .loadModel({ modelPath: embeddingModelPath, gpuLayers: this.context.gpuLayers, defaultContextFlashAttention: true });
      }

      const embeddingContext = await (model as {
        createEmbeddingContext?: () => Promise<unknown>;
      }).createEmbeddingContext?.();
      if (!embeddingContext) {
        throw new Error("Embedding context is not supported by current model/runtime");
      }
      this.context.embeddingModel = model;
      this.context.embeddingContext = embeddingContext;
    })();
    try {
      await this.embeddingPromise;
    } catch (error) {
      this.embeddingPromise = null;
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await fs.access(this.context.modelPath);
      return true;
    } catch {
      return false;
    }
  }

  isModelLoaded(): boolean {
    return this.context.model !== undefined;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    this.inFlightGenerateCount += 1;
    try {
      if (options?.signal?.aborted) {
        throw new Error("Generation aborted");
      }
      await this.ensureLoaded();
      if (options?.signal?.aborted) {
        throw new Error("Generation aborted");
      }
      // node-llama-cpp v3 API: context.getSequence() → LlamaCompletion.generateCompletion()
      // (createSequence() does not exist in v3; replaced by getSequence() + LlamaCompletion)
      const ctx = this.context.context as { getSequence: () => { dispose: () => void } };
      const LlamaCompletionCls = this.context.LlamaCompletion as new (opts: {
        contextSequence: unknown;
      }) => {
        generateCompletion: (
          input: string,
          opts?: {
            maxTokens?: number;
            temperature?: number;
            signal?: AbortSignal;
            stopOnAbortSignal?: boolean;
          },
        ) => Promise<string>;
      };
      const sequence = ctx.getSequence();
      const completion = new LlamaCompletionCls({ contextSequence: sequence });
      try {
        const output = await completion.generateCompletion(prompt, {
          temperature: options?.temperature ?? 0.2,
          maxTokens: options?.maxTokens ?? 256,
          signal: options?.signal,
          stopOnAbortSignal: true,
        });
        if (options?.signal?.aborted) {
          throw new Error("Generation aborted");
        }
        return output;
      } finally {
        sequence.dispose();
      }
    } finally {
      this.inFlightGenerateCount = Math.max(0, this.inFlightGenerateCount - 1);
      this.scheduleModelIdleUnload();
    }
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

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    this.inFlightGenerateCount += 1;
    try {
      if (options?.signal?.aborted) {
        throw new Error("Generation aborted");
      }
      await this.ensureLoaded();

      const ctx = this.context.context as { getSequence: () => { dispose: () => void } };
      const LlamaCompletionCls = this.context.LlamaCompletion as new (opts: {
        contextSequence: unknown;
      }) => {
        generateCompletion: (
          input: string,
          opts?: {
            maxTokens?: number;
            temperature?: number;
            signal?: AbortSignal;
            stopOnAbortSignal?: boolean;
            onTextChunk?: (chunk: string) => void;
          },
        ) => Promise<string>;
      };
      const sequence = ctx.getSequence();
      const completion = new LlamaCompletionCls({ contextSequence: sequence });

      const queue: string[] = [];
      let finished = false;
      let generationError: unknown = null;
      let notify: (() => void) | null = null;
      const wake = () => {
        if (notify) {
          const fn = notify;
          notify = null;
          fn();
        }
      };

      const generationPromise = completion
        .generateCompletion(prompt, {
          temperature: options?.temperature ?? 0.2,
          maxTokens: options?.maxTokens ?? 256,
          signal: options?.signal,
          stopOnAbortSignal: true,
          onTextChunk: (chunk: string) => {
            if (!chunk) return;
            queue.push(chunk);
            wake();
          },
        })
        .catch((error) => {
          generationError = error;
        })
        .finally(() => {
          finished = true;
          wake();
        });

      try {
        while (!finished || queue.length > 0) {
          if (queue.length === 0) {
            await new Promise<void>((resolve) => {
              if (finished || queue.length > 0) {
                resolve();
                return;
              }
              notify = resolve;
            });
            continue;
          }
          const chunk = queue.shift();
          if (chunk) {
            yield chunk;
          }
        }
        await generationPromise;
        if (generationError) {
          throw generationError;
        }
      } finally {
        await generationPromise.catch(() => {});
        sequence.dispose();
      }
    } finally {
      this.inFlightGenerateCount = Math.max(0, this.inFlightGenerateCount - 1);
      this.scheduleModelIdleUnload();
    }
  }

  async *generateChatStream(
    input: { systemPrompt?: string; userPrompt: string },
    options?: GenerateOptions,
  ): AsyncIterable<string> {
    this.inFlightGenerateCount += 1;
    try {
      if (options?.signal?.aborted) {
        throw new Error("Generation aborted");
      }
      await this.ensureLoaded();

      const ctx = this.context.context as { getSequence: () => { dispose: () => void } };
      const ChatSessionCls = this.context.LlamaChatSession as
        | (new (opts: { contextSequence: unknown; systemPrompt?: string }) => {
            prompt: (
              input: string,
              opts?: {
                maxTokens?: number;
                temperature?: number;
                signal?: AbortSignal;
                stopOnAbortSignal?: boolean;
                onTextChunk?: (chunk: string) => void;
              },
            ) => Promise<string>;
          })
        | undefined;
      if (!ChatSessionCls) {
        // Fallback when chat session class is unavailable in runtime package.
        yield* this.generateStream(
          `${input.systemPrompt ?? ""}\n\n${input.userPrompt}`.trim(),
          options,
        );
        return;
      }

      const sequence = ctx.getSequence();
      const session = new ChatSessionCls({
        contextSequence: sequence,
        ...(input.systemPrompt ? { systemPrompt: input.systemPrompt } : {}),
      });

      const queue: string[] = [];
      let finished = false;
      let generationError: unknown = null;
      let notify: (() => void) | null = null;
      const wake = () => {
        if (notify) {
          const fn = notify;
          notify = null;
          fn();
        }
      };

      const generationPromise = session
        .prompt(input.userPrompt, {
          temperature: options?.temperature ?? 0.2,
          maxTokens: options?.maxTokens ?? 256,
          signal: options?.signal,
          stopOnAbortSignal: true,
          onTextChunk: (chunk: string) => {
            if (!chunk) return;
            queue.push(chunk);
            wake();
          },
        })
        .catch((error) => {
          generationError = error;
        })
        .finally(() => {
          finished = true;
          wake();
        });

      try {
        while (!finished || queue.length > 0) {
          if (queue.length === 0) {
            await new Promise<void>((resolve) => {
              if (finished || queue.length > 0) {
                resolve();
                return;
              }
              notify = resolve;
            });
            continue;
          }
          const chunk = queue.shift();
          if (chunk) {
            yield chunk;
          }
        }
        await generationPromise;
        if (generationError) {
          throw generationError;
        }
      } finally {
        await generationPromise.catch(() => {});
        sequence.dispose();
      }
    } finally {
      this.inFlightGenerateCount = Math.max(0, this.inFlightGenerateCount - 1);
      this.scheduleModelIdleUnload();
    }
  }

  async embed(texts: string[]): Promise<Float32Array[] | null> {
    if (texts.length === 0) return [];
    this.inFlightEmbedCount += 1;
    try {
      await this.ensureEmbeddingLoaded();
      const context = this.context.embeddingContext as {
        getEmbeddingFor: (text: string) => Promise<{ vector: Float32Array } | Float32Array>;
      };
      const vectors: Float32Array[] = [];
      for (const text of texts) {
        const result = await context.getEmbeddingFor(text);
        if (result instanceof Float32Array) {
          vectors.push(result);
        } else {
          vectors.push(result.vector);
        }
      }
      return vectors;
    } catch {
      return null;
    } finally {
      this.inFlightEmbedCount = Math.max(0, this.inFlightEmbedCount - 1);
      this.scheduleEmbeddingIdleUnload();
    }
  }
}
