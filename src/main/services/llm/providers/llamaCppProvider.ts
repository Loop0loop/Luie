import fs from "node:fs/promises";
import type { GenerateOptions, ModelRuntimeClient } from "../modelRuntimeClient.js";

type LlamaContext = {
  modelPath: string;
  embeddingModelPath: string | null;
  contextSize: number;
  model?: unknown;
  context?: unknown;
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

  constructor(modelPath: string, embeddingModelPath?: string | null, contextSize?: number) {
    this.context = {
      modelPath,
      embeddingModelPath: embeddingModelPath ?? null,
      contextSize: Math.max(2048, contextSize ?? 131_072),
    };
  }

  private async ensureLoaded(): Promise<void> {
    if (this.modelPromise) {
      await this.modelPromise;
      return;
    }
    this.modelPromise = (async () => {
      const dynamicImport = new Function("id", "return import(id)") as (id: string) => Promise<unknown>;
      const mod = await dynamicImport("node-llama-cpp");
      const getLlama = (mod as { getLlama: () => Promise<unknown> }).getLlama;
      const llama = await getLlama();
      // The package API is intentionally accessed via loose typing to avoid
      // compile-time coupling across minor API differences.
      const model = await (llama as { loadModel: (input: { modelPath: string }) => Promise<unknown> })
        .loadModel({ modelPath: this.context.modelPath });
      const context = await (model as { createContext: (input: { contextSize: number }) => Promise<unknown> })
        .createContext({ contextSize: this.context.contextSize });
      this.context.model = model;
      this.context.context = context;
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
        const getLlama = (mod as { getLlama: () => Promise<unknown> }).getLlama;
        const llama = await getLlama();
        model = await (llama as { loadModel: (input: { modelPath: string }) => Promise<unknown> })
          .loadModel({ modelPath: embeddingModelPath });
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
      await this.ensureLoaded();
      return true;
    } catch {
      return false;
    }
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    await this.ensureLoaded();
    const sequence = await (this.context.context as {
      createSequence: () => Promise<{
        evaluate: (input: string, options?: { temperature?: number; maxTokens?: number }) => Promise<string>;
        dispose?: () => Promise<void> | void;
        free?: () => Promise<void> | void;
        release?: () => Promise<void> | void;
      }>;
    }).createSequence();
    try {
      return await sequence.evaluate(prompt, {
        temperature: options?.temperature ?? 0.2,
        maxTokens: options?.maxTokens ?? 256,
      });
    } finally {
      const cleanup = sequence.dispose ?? sequence.free ?? sequence.release;
      if (cleanup) {
        await cleanup.call(sequence);
      }
    }
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    yield await this.generate(prompt, options);
  }

  async embed(texts: string[]): Promise<Float32Array[] | null> {
    if (texts.length === 0) return [];
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
    }
  }
}
