export const UTILITY_DEFAULT_EMBEDDING_MODEL = {
  modelId: "bge-m3-q4_k_m",
  filename: "bge-m3-Q4_K_M.gguf",
} as const;

export const UTILITY_BUNDLED_MODELS_DIR = "models" as const;

export const UTILITY_EMBEDDING_SERVER_DEFAULTS = {
  contextSize: 8192,
  gpuLayers: 0,
  threads: 4,
  pooling: "mean",
} as const;
