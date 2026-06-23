export const LLAMA_CPP_BUILD = "b5620";

export const LLAMA_BINARY_URLS: Record<string, string> = {
  "darwin-arm64": `https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_CPP_BUILD}/llama-${LLAMA_CPP_BUILD}-bin-macos-arm64.zip`,
  "darwin-x64": `https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_CPP_BUILD}/llama-${LLAMA_CPP_BUILD}-bin-macos-x64.zip`,
  "win32-x64": `https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_CPP_BUILD}/llama-${LLAMA_CPP_BUILD}-bin-win-cpu-x64.zip`,
  "linux-x64": `https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_CPP_BUILD}/llama-${LLAMA_CPP_BUILD}-bin-ubuntu-x64.zip`,
};

export const LLAMA_BINARY_SHA256S: Record<string, string> = {
  "darwin-arm64": "aaaddc5f4a7ecf66ccb7501ed3a1980223c5bb72c17c9c2ffc3d8cdaff44699c",
  "darwin-x64": "2b5fef6b6120abea3eb11919e20eccd2c53670d39672e2ed3fc5aee78429c3d5",
  "win32-x64": "8075e4758bd45119a1cba9eb897d73c33206185c29f10e61ba100468be5ac64a",
  "linux-x64": "9adfe0dad79bc55812a936f9075666e162e571fa011f8416f24ab3212d7e7d46",
};

export const LLAMA_SERVER_BINARY_IN_ZIP = "llama-server";

export const DEFAULT_MODEL = {
  repo: "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
  filename: "qwen2.5-1.5b-instruct-q8_0.gguf",
  sizeBytes: 1_894_532_128,
  sha256: "d7efb072e7724d25048a4fda0a3e10b04bdef5d06b1403a1c93bd9f1240a63c8",
  displayName: "Qwen2.5 1.5B (기본)",
} as const;

export const HIGH_PERF_MODEL = {
  repo: "Qwen/Qwen3-4B-Instruct-GGUF",
  filename: "qwen3-4b-instruct-q4_k_m.gguf",
  sizeBytes: 2_700_000_000,
  displayName: "Qwen3 4B (고성능, GPU 권장)",
} as const;

export const LLAMA_SERVER_DEFAULTS = {
  contextSize: 4096,
  gpuLayers: -1,
  threads: 4,
  parallel: 1,
  flashAttention: true,
  cacheTypeK: "q8_0",
  cacheTypeV: "q8_0",
  cacheRamMiB: 2048,
  cacheReuse: 256,
} as const;
