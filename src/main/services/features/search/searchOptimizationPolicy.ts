export type SearchOptimizationMode =
  | "low-end"
  | "standard"
  | "high-end"
  | "quality";

export type SearchVectorMode = "enabled" | "skip-when-lexical-hits";
export type SearchStaleEmbeddingMode = "skip";

export type SearchOptimizationPolicy = {
  mode: SearchOptimizationMode;
  resultLimit: number;
  candidateCap: number;
  rrfTopK: number;
  contextBudgetChars: number;
  rerankCacheTtlMs: number;
  vectorSearchMode: SearchVectorMode;
  staleEmbeddingMode: SearchStaleEmbeddingMode;
};

type SearchOptimizationProfile = {
  maxResultLimit: number;
  maxCandidateCap: number;
  maxContextBudgetChars: number;
  rerankCacheTtlMs: number;
  vectorSearchMode: SearchVectorMode;
  staleEmbeddingMode: SearchStaleEmbeddingMode;
};

export const DEFAULT_SEARCH_OPTIMIZATION_MODE: SearchOptimizationMode =
  "standard";

const MIN_CONTEXT_BUDGET_CHARS = 4_096;

const SEARCH_OPTIMIZATION_PROFILES: Record<
  SearchOptimizationMode,
  SearchOptimizationProfile
> = {
  "low-end": {
    maxResultLimit: 40,
    maxCandidateCap: 40,
    maxContextBudgetChars: 6_144,
    rerankCacheTtlMs: 300_000,
    vectorSearchMode: "skip-when-lexical-hits",
    staleEmbeddingMode: "skip",
  },
  standard: {
    maxResultLimit: 80,
    maxCandidateCap: 80,
    maxContextBudgetChars: 8_192,
    rerankCacheTtlMs: 180_000,
    vectorSearchMode: "enabled",
    staleEmbeddingMode: "skip",
  },
  "high-end": {
    maxResultLimit: 100,
    maxCandidateCap: 120,
    maxContextBudgetChars: 12_288,
    rerankCacheTtlMs: 120_000,
    vectorSearchMode: "enabled",
    staleEmbeddingMode: "skip",
  },
  quality: {
    maxResultLimit: 100,
    maxCandidateCap: 160,
    maxContextBudgetChars: 16_384,
    rerankCacheTtlMs: 60_000,
    vectorSearchMode: "enabled",
    staleEmbeddingMode: "skip",
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isSearchOptimizationMode(
  value: string | undefined,
): value is SearchOptimizationMode {
  return (
    value === "low-end" ||
    value === "standard" ||
    value === "high-end" ||
    value === "quality"
  );
}

export function resolveSearchOptimizationMode(
  mode?: SearchOptimizationMode,
): SearchOptimizationMode {
  if (mode) return mode;
  return isSearchOptimizationMode(process.env.LUIE_SEARCH_OPTIMIZATION_MODE)
    ? process.env.LUIE_SEARCH_OPTIMIZATION_MODE
    : DEFAULT_SEARCH_OPTIMIZATION_MODE;
}

export function resolveSearchOptimizationPolicy(input: {
  mode?: SearchOptimizationMode;
  requestedLimit?: number;
  requestedContextBudget?: number;
} = {}): SearchOptimizationPolicy {
  const mode = resolveSearchOptimizationMode(input.mode);
  const profile = SEARCH_OPTIMIZATION_PROFILES[mode];
  const requestedLimit = input.requestedLimit ?? 20;
  const resultLimit = clamp(
    Math.trunc(Number.isFinite(requestedLimit) ? requestedLimit : 20),
    1,
    profile.maxResultLimit,
  );
  const candidateCap = clamp(
    Math.max(resultLimit * 3, 50),
    resultLimit,
    profile.maxCandidateCap,
  );
  const requestedContextBudget =
    input.requestedContextBudget ?? profile.maxContextBudgetChars;
  const contextBudgetChars = clamp(
    Math.trunc(
      Number.isFinite(requestedContextBudget)
        ? requestedContextBudget
        : profile.maxContextBudgetChars,
    ),
    MIN_CONTEXT_BUDGET_CHARS,
    profile.maxContextBudgetChars,
  );

  return {
    mode,
    resultLimit,
    candidateCap,
    rrfTopK: resultLimit,
    contextBudgetChars,
    rerankCacheTtlMs: profile.rerankCacheTtlMs,
    vectorSearchMode: profile.vectorSearchMode,
    staleEmbeddingMode: profile.staleEmbeddingMode,
  };
}
