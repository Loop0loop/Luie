/**
 * embeddingModelConstants — 전용 로컬 임베딩 모델(bge-m3) 정의.
 *
 * 선정: BAAI/bge-m3 (다국어, 한국어 양호, 8192 토큰, 출력 차원 1024).
 * 배포: gpustack/bge-m3-GGUF (llama-server `--embeddings` 호환 검증된 GGUF).
 * quant: Q4_K_M — 크기(~438MB)/품질 균형. 앱 설치 시 동봉(bundled)된다.
 *
 * 동봉 경로(런타임):
 *   packaged: <process.resourcesPath>/models/<filename>
 *   dev:      <repoRoot>/resources/models/<filename>  (prebuild 스크립트가 채움)
 *
 * 차원(1024)은 MemoryEmbedding.dimension 및 벡터검색 필터의 기준이 된다.
 * 모델 식별자(modelId)는 MemoryEmbedding.model signature 에 사용되어,
 * 모델 교체 시 자동 재임베딩을 트리거한다.
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
