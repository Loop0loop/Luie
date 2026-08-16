export type GenerateOptions = {
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
};

export type GenerationMode = "streaming" | "buffered";

export type RuntimeSupabaseProxyConfig = {
  functionUrl: string;
  accessToken: string;
};

export type RuntimeSupabaseProxyResolver = () => Promise<RuntimeSupabaseProxyConfig>;

export interface ModelRuntimeClient {
  readonly providerName: string;
  readonly generationMode?: GenerationMode;
  /** model을 load하지 않고 파일과 runtime의 사용 가능 여부만 확인한다. */
  isAvailable(): Promise<boolean>;
  /** background job이 사용할 수 있도록 model이 memory에 load됐는지 반환한다. */
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
