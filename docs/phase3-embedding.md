# Phase 3 — Embedding + Hybrid Retrieval

## 목표
의미 검색 ("분위기 어두운 장면", "유란이 고독하게 있는 씬") 지원.
FTS5 키워드 검색 + Dense 벡터 검색 → RRF 통합 → 상위 20청크 반환.

---

## 아키텍처 결정

### 임베딩 모델 전략
```
llmEmbeddingModelPath 설정 있음 → 전용 embedding GGUF 사용
llmEmbeddingModelPath 없음      → llmModelPath(요약 모델) 폴백
둘 다 없음                      → 임베딩 skip, FTS5만 사용
```

- 전용 모델(nomic-embed-text, qwen3-embedding:0.6b): 품질 최고
- qwen3:4b 폴백: 다운로드 하나로 요약+임베딩 모두 동작
- 작가가 설정 안 해도 FTS5로 기본 동작 유지 (에러 없음)

### 벡터 저장
`sqlite-vec` 확장을 `better-sqlite3`에 로드.
`MemoryEmbedding` 일반 테이블에 `vec BLOB` 컬럼 저장.
KNN 검색: `vec_distance_cosine(vec, ?)` — 소설 1편 기준 청크 10만개 이하, SIMD brute-force 충분.

`vec0` virtual table(HNSW) 미사용 이유: 차원이 모델마다 달라(768/1024/1536) 테이블 생성 시점에 고정해야 함 → 모델 교체 시 테이블 재생성 필요. BLOB + 함수 방식이 더 유연.

---

## 구성 요소

### 1. DB 변경

#### MemoryEmbedding 테이블 (새 migration)
```sql
-- drizzle/main/0003_memory_embedding.sql
CREATE TABLE IF NOT EXISTS "MemoryEmbedding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chunkId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL DEFAULT '',
    "vec" BLOB NOT NULL,
    "dimension" INTEGER NOT NULL,
    "model" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "MemoryEmbedding_chunkId_key" UNIQUE ("chunkId"),
    CONSTRAINT "MemoryEmbedding_chunkId_fkey"
        FOREIGN KEY ("chunkId") REFERENCES "MemoryChunk"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "MemoryEmbedding_projectId_idx" ON "MemoryEmbedding"("projectId");
```

#### ProjectSettings 컬럼 추가
```typescript
// packagedSchema.ts PACKAGED_SCHEMA_COLUMN_PATCHES
{ table: "ProjectSettings", column: "llmEmbeddingModelPath",
  sql: 'ALTER TABLE "ProjectSettings" ADD COLUMN "llmEmbeddingModelPath" TEXT;' },
{ table: "ProjectSettings", column: "llmEmbeddingDimension",
  sql: 'ALTER TABLE "ProjectSettings" ADD COLUMN "llmEmbeddingDimension" INTEGER NOT NULL DEFAULT 1024;' },
```

#### MemoryBuildJob jobType 확장
- 기존: `"rebuild_chunks"`, `"rebuild_summary"`
- 추가: `"rebuild_embedding"`

---

### 2. LLM Runtime 확장

#### modelRuntimeClient.ts 인터페이스 추가
```typescript
export interface ModelRuntimeClient {
  isAvailable(): Promise<boolean>;
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string>;
  embed(texts: string[]): Promise<Float32Array[] | null>; // null = 임베딩 미지원
}
```

#### LlamaCppProvider 확장
```typescript
// 기존: generationContext (createContext)
// 추가: embeddingContext (createEmbeddingContext)

private embeddingModelPath: string | null;
private embeddingContext?: unknown;
private embeddingPromise: Promise<void> | null = null;

// node-llama-cpp API:
// const embCtx = await model.createEmbeddingContext();
// const result = await embCtx.getEmbeddingFor(text);
// result.vector → Float32Array

async embed(texts: string[]): Promise<Float32Array[] | null>
```

임베딩 모델 경로:
- `LlamaCppProvider(modelPath, embeddingModelPath?)` 생성자 확장
- `embeddingModelPath` 없으면 `modelPath`(요약 모델)로 임베딩 context 생성

#### DeterministicProvider
```typescript
async embed(_texts: string[]): Promise<Float32Array[] | null> {
  return null; // 임베딩 미지원 → embeddingProjector가 skip
}
```

#### modelRuntimeFactory.ts 확장
`resolveModelRuntimeClient(projectId)` 에서 `llmEmbeddingModelPath` 도 읽어서
`LlamaCppProvider(modelPath, embeddingModelPath)` 로 전달.

---

### 3. sqlite-vec 통합

#### database/index.ts 변경
```typescript
import { getLoadablePath } from 'sqlite-vec';

// DatabaseService.initialize() 에서:
const sqlite = new BetterSqliteDatabase(context.dbPath);
sqlite.loadExtension(getLoadablePath());
```

`sqlite-vec`는 네이티브 확장 → `electron-builder.json`에 추가:
```json
"asarUnpack": [
  "node_modules/node-llama-cpp/**",
  "node_modules/sqlite-vec/**"
]
```

---

### 4. EmbeddingProjector

```
src/main/services/features/memory/embeddingProjector.ts
```

**흐름:**
```
chapter.update
  → rebuild_chunks enqueue (기존)
  → rebuild_embedding enqueue (추가 — chapterService.ts)

derivedJobWorker tick:
  chunks → summary → embedding (순서 유지)

embeddingProjector.processPendingEmbeddingJobs({ projectId, limit })
  → MemoryBuildJob (jobType: rebuild_embedding) 조회
  → 해당 chapterId의 MemoryChunk 전체 조회
  → contentHash로 기존 embedding과 비교 → 변경된 청크만 처리
  → runtime.embed(chunkTexts[]) 호출 (배치)
  → MemoryEmbedding upsert
  → job completed
```

**배치 처리 방식:**
```typescript
// 청크 단위 배치 embed (청크 내용 배열 한 번에 전달)
const vectors = await runtime.embed(chunks.map(c => c.content));
// vectors[i] → null이면 임베딩 미지원, Float32Array면 저장
```

node-llama-cpp는 배열 임베딩 지원 여부 확인 필요.
지원 안 하면 순차 처리 (청크당 1회 호출).

**EMBEDDING_BATCH_SIZE:**
- stress: 5, normal: 2
- 임베딩은 생성보다 빠름 (no token generation, forward pass only)

**contentHash dedup:**
`MemoryChunk.contentHash` vs `MemoryEmbedding.contentHash` 비교.
같으면 skip.

**실패 처리:**
- MAX_ATTEMPTS=3, linear backoff (summary와 동일)
- `runtime.embed()` null 반환 → 해당 job `completed` (임베딩 없는 상태로 유지, 에러 아님)

---

### 5. Hybrid Retrieval

#### searchService.searchChunks() 수정

```typescript
async searchChunks(input: MemoryChunkSearchQuery): Promise<MemoryChunkSearchResult[]> {
  // Step 1: FTS5 BM25 검색 (기존 로직)
  const ftsResults = ... // top-50, {chunkId, rank}

  // Step 2: Dense KNN 검색 (임베딩 있을 때만)
  const queryVector = await runtime.embed([input.query]);
  let denseResults: { chunkId: string; rank: number }[] = [];
  if (queryVector?.[0]) {
    denseResults = await this.searchByVector(input.projectId, queryVector[0], 50);
  }

  // Step 3: RRF 통합
  return this.mergeWithRRF(ftsResults, denseResults, 20);
}

private mergeWithRRF(
  ftsResults: { chunkId: string; rank: number }[],
  denseResults: { chunkId: string; rank: number }[],
  topK: number,
): MemoryChunkSearchResult[] {
  const RRF_K = 60;
  const scores = new Map<string, number>();
  for (const { chunkId, rank } of ftsResults) {
    scores.set(chunkId, (scores.get(chunkId) ?? 0) + 1 / (RRF_K + rank));
  }
  for (const { chunkId, rank } of denseResults) {
    scores.set(chunkId, (scores.get(chunkId) ?? 0) + 1 / (RRF_K + rank));
  }
  const sorted = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK);
  // sorted chunkIds → DB에서 content/offset 조회 → 반환
}

private async searchByVector(
  projectId: string,
  queryVec: Float32Array,
  limit: number,
): Promise<{ chunkId: string; rank: number }[]> {
  // sqlite-vec: vec_distance_cosine(vec, ?) ASC
  const vecBlob = Buffer.from(queryVec.buffer);
  const rows = client.all<{ chunkId: string }>(sql`
    SELECT "chunkId"
    FROM "MemoryEmbedding"
    WHERE "projectId" = ${projectId}
    ORDER BY vec_distance_cosine("vec", ${vecBlob})
    LIMIT ${limit};
  `);
  return rows.map(({ chunkId }, i) => ({ chunkId, rank: i + 1 }));
}
```

**폴백 규칙:**
- 임베딩 없음 (queryVector null) → FTS5 결과만 반환 (기존 동작 유지)
- FTS5 결과 없음 → Dense만 반환
- 둘 다 없음 → 빈 배열

---

### 6. derivedJobWorker 변경

```typescript
// 기존: chunks → summary
// 추가: chunks → summary → embedding

const embeddingResult = await embeddingProjector.processPendingEmbeddingJobs({
  projectId,
  limit: EMBEDDING_BATCH_SIZE,
});

const EMBEDDING_BATCH_SIZE = isStressMode ? 5 : 2;
const TICK_WARN_THRESHOLD_WITH_EMBEDDING_MS = 8000; // 임베딩 포함 tick
```

---

### 7. IPC 핸들러 추가

```typescript
// channels.ts
MEMORY_GET_EMBEDDING_STATUS: "memory:get-embedding-status"

// api:
api.memoryAdmin.getEmbeddingStatus(projectId)
  → { pendingCount, completedCount, failedCount }
```

---

## 파일 변경 목록

| 파일 | 변경 |
|------|------|
| `package.json` | `sqlite-vec` 추가 |
| `electron-builder.json` | `asarUnpack` sqlite-vec 추가 |
| `drizzle/main/0003_memory_embedding.sql` | 신규 |
| `src/main/database/schema.ts` | `memoryEmbedding` 테이블 추가 |
| `src/main/database/packagedSchema.ts` | MemoryEmbedding, 컬럼 패치 2개, BOOTSTRAP_SQL |
| `src/main/database/index.ts` | sqlite-vec loadExtension |
| `src/main/services/llm/modelRuntimeClient.ts` | `embed()` 메서드 추가 |
| `src/main/services/llm/providers/llamaCppProvider.ts` | `embed()` 구현, embeddingContext |
| `src/main/services/llm/providers/deterministicProvider.ts` | `embed()` null 반환 |
| `src/main/services/llm/modelRuntimeFactory.ts` | `llmEmbeddingModelPath` 읽기, LlamaCppProvider에 전달 |
| `src/main/services/features/memory/embeddingProjector.ts` | 신규 |
| `src/main/services/features/derivedJobWorker.ts` | embedding job 처리 추가 |
| `src/main/services/core/chapterService.ts` | `rebuild_embedding` enqueue 추가 |
| `src/main/services/features/searchService.ts` | hybrid retrieval |
| `src/main/handler/search/ipcSearchHandlers.ts` | IPC 핸들러 1개 추가 |
| `src/shared/ipc/channels.ts` | 채널 상수 1개 추가 |

---

## 완료 기준

```
✅ chapter.update → 청크 생성 → 임베딩 생성 → MemoryEmbedding 저장
✅ llmEmbeddingModelPath 설정 → 전용 embedding GGUF 사용
✅ llmEmbeddingModelPath 미설정 + llmModelPath 있음 → 요약 모델로 임베딩
✅ 모델 없음 → FTS5만 사용, 에러 없음
✅ api.memory.searchChunks({ query: "어두운 분위기" }) → hybrid 결과 반환
✅ contentHash 동일 청크 → 임베딩 재생성 skip
```

---

## 주의사항

### sqlite-vec Electron 빌드
```json
// electron-builder.json
"asarUnpack": [
  "node_modules/node-llama-cpp/**",
  "node_modules/sqlite-vec/**"
]
```
`sqlite-vec`는 네이티브 `.node` 확장이 아닌 `.so`/`.dylib` 파일.
`getLoadablePath()` 로 경로를 얻어 `db.loadExtension()` 호출.
ASAR 패키징 시 경로 깨짐 → `asarUnpack` 필수.

### 임베딩 컨텍스트 분리
요약용 `generationContext`와 임베딩용 `embeddingContext`는 별개 객체.
같은 GGUF 폴백 시에도 node-llama-cpp에서 다른 context type으로 생성.
메모리 점유 주의: 요약 모델 GGUF 하나에 두 context → RAM +500MB~1GB 추가.

### vec_distance_cosine 정확도
sqlite-vec의 BLOB 벡터 검색은 float32 기준.
`Float32Array.buffer` → `Buffer.from(...)` → SQL BLOB 변환 시 byte order 동일해야 함.
little-endian 환경(x86/ARM Mac) 기준 정상 동작.

### 검색 시 runtime resolve 비용
`searchChunks()` 는 실시간 API (유저 타이핑 중 호출 가능).
`resolveModelRuntimeClient()` 는 DB 쿼리 포함 → 검색 서비스에서 provider를 캐싱하거나,
`embed()` 실패 시 FTS만으로 즉시 폴백해서 UX 블로킹 방지.

### 청크당 임베딩 비용
1화 = 평균 10청크, 1000화 = 10,000청크.
qwen3-embedding:0.6b 기준 청크당 ~10-30ms → 전체 약 5-10분 (백그라운드 job).
최초 임베딩 완료 전까지 FTS 검색으로 동작 — 유저 경험 무관.
