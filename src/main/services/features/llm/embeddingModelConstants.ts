/**
 * 한국어 품질과 llama-server 호환성을 기준으로 선택한 동봉 임베딩 모델이다.
 * `modelId`와 `dimension`은 embedding signature에 포함되므로 변경 시 재임베딩된다.
 */
export const DEFAULT_EMBEDDING_MODEL = {
  /** 안정적 식별자 — embedding signature 및 설정 기록에 사용. */
  modelId: "bge-m3-q4_k_m",
  /** Hugging Face repo (런타임/빌드타임 다운로드 폴백용). */
  repo: "gpustack/bge-m3-GGUF",
  /** GGUF 파일명. 동봉/다운로드 공통. */
  filename: "bge-m3-Q4_K_M.gguf",
  /** 파일 크기(bytes) — 무결성/진행률 표시용. */
  sizeBytes: 437_778_496,
  /** LFS sha256 — 무결성 검증용. */
  sha256: "6d39681b26c61279ac1f82db35a04a05009e94c415b51c858ff571489a82fc06",
  /** 출력 임베딩 차원. */
  dimension: 1024,
  /** 사용자 표시명. */
  displayName: "bge-m3 (다국어 임베딩)",
} as const;

export type EmbeddingModelDefinition = typeof DEFAULT_EMBEDDING_MODEL;

/** 동봉 모델이 위치하는 리소스 하위 디렉토리명. */
export const BUNDLED_MODELS_DIR = "models" as const;

/**
 * llama-server 임베딩 인스턴스 기동 기본값.
 * 임베딩 전용 인스턴스는 생성 sidecar 와 분리된 포트/프로세스로 띄운다.
 * `--embeddings` + mean pooling 으로 `/v1/embeddings` 를 활성화한다.
 */
export const EMBEDDING_SERVER_DEFAULTS = {
  /** bge-m3 최대 입력 토큰. 청크는 이보다 훨씬 작다. */
  contextSize: 8192,
  /** 임베딩은 CPU로도 충분히 빠르고 메모리 절약을 위해 GPU offload 최소화. */
  gpuLayers: 0,
  threads: 4,
  /** 임베딩 모드(mean pooling)로 /v1/embeddings 활성화. */
  pooling: "mean",
  /** 임베딩 잡이 없을 때 sidecar 를 내리는 idle 타임아웃(ms). 생성 모델과 분리. */
  idleShutdownMs: 60_000,
} as const;
