import type { GenerateOptions, ModelRuntimeClient } from "./modelRuntimeClient.js";

/**
 * Routes generation requests to generationProvider (LlamaServerProvider/sidecar)
 * and embedding requests to embeddingProvider (LlamaCppProvider).
 */
export class SplitRuntimeProvider implements ModelRuntimeClient {
  readonly providerName = "split";

  constructor(
    private readonly generationProvider: ModelRuntimeClient,
    private readonly embeddingProvider: ModelRuntimeClient,
  ) {}

  async isAvailable(): Promise<boolean> {
    return this.generationProvider.isAvailable();
  }

  isModelLoaded(): boolean {
    return this.generationProvider.isModelLoaded();
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    return this.generationProvider.generate(prompt, options);
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    yield* this.generationProvider.generateStream(prompt, options);
  }

  async embed(texts: string[]): Promise<Float32Array[] | null> {
    return this.embeddingProvider.embed(texts);
  }
}
