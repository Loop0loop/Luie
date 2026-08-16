import type { GenerateOptions, ModelRuntimeClient } from "../modelRuntimeClient.js";

const FALLBACK_SUFFIX = "[요약 생략 — 모델 미설정]";

export class DeterministicProvider implements ModelRuntimeClient {
  readonly providerName = "deterministic";

  async isAvailable(): Promise<boolean> {
    return true;
  }

  isModelLoaded(): boolean {
    return true;
  }

  async generate(prompt: string, _options?: GenerateOptions): Promise<string> {
    const normalized = prompt.replace(/\s+/g, " ").trim();
    const head = normalized.slice(0, 500);
    return head.length > 0 ? `${head}\n\n${FALLBACK_SUFFIX}` : FALLBACK_SUFFIX;
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    yield await this.generate(prompt, options);
  }

  async embed(_texts: string[]): Promise<Float32Array[] | null> {
    return null;
  }
}
