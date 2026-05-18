import fs from "node:fs/promises";
import type { GenerateOptions, ModelRuntimeClient } from "../modelRuntimeClient.js";

type LlamaContext = {
  modelPath: string;
  model?: unknown;
  context?: unknown;
};

// Minimal runtime wrapper with lazy dynamic import to keep startup resilient
// when node-llama-cpp is not installed.
export class LlamaCppProvider implements ModelRuntimeClient {
  readonly providerName = "llamacpp";
  private context: LlamaContext;
  private modelPromise: Promise<void> | null = null;

  constructor(modelPath: string) {
    this.context = { modelPath };
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
        .createContext({ contextSize: 4096 });
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
}
