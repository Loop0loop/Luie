export type GenerateOptions = {
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
};

export interface ModelRuntimeClient {
  readonly providerName: string;
  /** True if the model file exists and the runtime can be used. Does NOT load the model. */
  isAvailable(): Promise<boolean>;
  /** True if the model is already loaded in memory. Background jobs should skip when false. */
  isModelLoaded(): boolean;
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string>;
  generateChat?: (
    input: { systemPrompt?: string; userPrompt: string },
    options?: GenerateOptions,
  ) => Promise<string>;
  generateChatStream?: (
    input: { systemPrompt?: string; userPrompt: string },
    options?: GenerateOptions,
  ) => AsyncIterable<string>;
  embed(texts: string[]): Promise<Float32Array[] | null>;
}

export type GenerateResultMeta = {
  provider: string;
  model?: string | null;
  isFallback: boolean;
};
