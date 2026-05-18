export type GenerateOptions = {
  maxTokens?: number;
  temperature?: number;
};

export interface ModelRuntimeClient {
  readonly providerName: string;
  isAvailable(): Promise<boolean>;
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string>;
  embed?(texts: string[]): Promise<Float32Array[]>;
}

export type GenerateResultMeta = {
  provider: string;
  model?: string | null;
  isFallback: boolean;
};
