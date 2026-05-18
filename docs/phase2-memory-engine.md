# Phase 2 — Memory Engine: LLM Runtime + ChapterSummary

## 목표
화 저장 시 200자 요약 자동 생성. 외부 앱(Ollama, LM Studio) 없이 GGUF 파일 하나로 동작.

---

## 구성 요소

### 1. LLM Runtime 레이어

```
src/main/services/llm/
  ├── modelRuntimeClient.ts        ← interface (공통 계약)
  ├── modelRuntimeFactory.ts       ← provider 선택 로직
  └── providers/
      ├── llamaCppProvider.ts      ← node-llama-cpp (핵심, 외부 앱 불필요)
      ├── openAiCompatProvider.ts  ← LM Studio / Ollama 선택적 감지
      └── deterministicProvider.ts ← fallback (모델 없을 때)
```

#### interface (modelRuntimeClient.ts)
```typescript
export interface ModelRuntimeClient {
  isAvailable(): Promise<boolean>;
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  generateStream(prompt: string): AsyncIterable<string>;
}

export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
}
```

#### provider 우선순위 (modelRuntimeFactory.ts)
```
1. LlamaCppProvider   → llmModelPath 설정 있음 + 파일 존재
2. OpenAiCompatProvider → localhost:1234 (LM Studio) 또는 :11434 (Ollama) 응답
3. DeterministicProvider → 항상 가능, 첫 500자 절단
```

#### LlamaCppProvider (핵심)
- `npm install node-llama-cpp`
- GGUF 파일 직접 로드 (HTTP 없음, 별도 프로세스 없음)
- `getLlama()` 호출 시 Metal / CUDA / Vulkan / CPU 자동 선택
- 모델은 싱글톤 유지 (앱 생애주기 동안 1회 로드)

#### OpenAiCompatProvider (선택적)
- LM Studio: `GET http://localhost:1234/v1/models` 로 생존 감지
- Ollama: `GET http://localhost:11434/api/tags` 로 생존 감지
- 둘 다 OpenAI 호환 API 사용 (`/v1/chat/completions`)
- 설정 없이 자동 감지, 있으면 씀

#### DeterministicProvider (fallback)
- LLM 없을 때 첫 500자 + `[요약 생략 — 모델 미설정]` 반환
- 항상 `isAvailable() = true`
- 청크 검색은 되고 요약만 없는 상태 유지

---

### 2. DB 변경

#### ChapterSummary 테이블 (새 migration)
```sql
-- drizzle/main/0001_chapter_summary.sql
CREATE TABLE IF NOT EXISTS "ChapterSummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL UNIQUE,
    "chapterNumber" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT NOT NULL,
    "isFallback" INTEGER NOT NULL DEFAULT 0,  -- 1 = deterministic fallback
    "model" TEXT,                              -- 생성에 사용한 모델명
    "generatedAt" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "ChapterSummary_chapterId_fkey"
        FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ChapterSummary_projectId_idx" ON "ChapterSummary"("projectId");
```

#### ProjectSettings 컬럼 추가 (column patch)
```typescript
// packagedSchema.ts PACKAGED_SCHEMA_COLUMN_PATCHES 에 추가
{ table: "ProjectSettings", column: "llmModelPath",
  sql: 'ALTER TABLE "ProjectSettings" ADD COLUMN "llmModelPath" TEXT;' },
{ table: "ProjectSettings", column: "llmProviderHint",
  sql: 'ALTER TABLE "ProjectSettings" ADD COLUMN "llmProviderHint" TEXT;' },
  // 값: null | "llamacpp" | "lmstudio" | "ollama" | "none"
```

#### MemoryBuildJob jobType 확장
- 기존: `"rebuild_chunks"`
- 추가: `"rebuild_summary"`

---

### 3. ChapterSummaryProjector

```
src/main/services/features/memory/chapterSummaryProjector.ts
```

**흐름:**
```
챕터 저장 (chapter.update)
  → MemoryBuildJob { jobType: "rebuild_summary", targetId: chapterId } enqueue
  → derivedJobWorker tick
  → chapterSummaryProjector.processPendingSummaryJobs()
      → modelRuntimeFactory.getClient()
      → client.generate(SUMMARY_PROMPT)
      → ChapterSummary upsert
```

**요약 프롬프트 (한국어 웹소설 특화):**
```
다음 소설 텍스트를 200자 이내로 요약하세요.
등장인물, 사건, 감정 변화를 중심으로 간결하게 작성하세요.

텍스트:
{content_first_2000_chars}

요약:
```

**처리 규칙:**
- 최대 2,000자만 프롬프트에 넣음 (context 절약)
- 이미 동일 contentHash 요약 있으면 skip
- 실패 시 MAX_ATTEMPTS=3, exponential backoff
- fallback: 첫 500자 절단 + `isFallback=1` 저장

---

### 4. derivedJobWorker 변경

```typescript
// 기존 tick에 추가
const summaryResult = await chapterSummaryProjector.processPendingSummaryJobs({
  projectId,
  limit: SUMMARY_BATCH_SIZE,  // 스트레스: 2, 일반: 1 (LLM은 느림)
});
```

**SUMMARY_BATCH_SIZE를 1로 작게 잡는 이유:**
- LLM 추론은 chunk job과 달리 수백ms~수초 소요
- 이벤트루프 블로킹 방지 (node-llama-cpp는 async)
- 한 번에 1개씩 처리, 다음 tick에 1개

---

### 5. IPC 핸들러 추가

```typescript
// ipcSearchHandlers.ts 에 추가
MEMORY_GET_CHAPTER_SUMMARY: "memory:get-chapter-summary"
MEMORY_GET_SUMMARY_STATUS:  "memory:get-summary-status"

// api:
api.memory.getChapterSummary(chapterId)  → { summary, isFallback, model }
api.memoryAdmin.getSummaryStatus(projectId) → { pendingCount, completedCount }
```

---

## 파일 변경 목록

| 파일 | 변경 |
|------|------|
| `package.json` | `node-llama-cpp` 추가 |
| `drizzle/main/0001_chapter_summary.sql` | 신규 |
| `src/main/database/schema.ts` | `chapterSummary` 테이블 추가 |
| `src/main/database/packagedSchema.ts` | ProjectSettings 컬럼 패치 2개 추가 |
| `src/main/services/llm/modelRuntimeClient.ts` | 신규 |
| `src/main/services/llm/modelRuntimeFactory.ts` | 신규 |
| `src/main/services/llm/providers/llamaCppProvider.ts` | 신규 |
| `src/main/services/llm/providers/openAiCompatProvider.ts` | 신규 |
| `src/main/services/llm/providers/deterministicProvider.ts` | 신규 |
| `src/main/services/features/memory/chapterSummaryProjector.ts` | 신규 |
| `src/main/services/features/derivedJobWorker.ts` | summary job 처리 추가 |
| `src/main/handler/search/ipcSearchHandlers.ts` | IPC 핸들러 2개 추가 |
| `src/shared/ipc/channels.ts` | 채널 상수 2개 추가 |

---

## 완료 기준

```
✅ chapter.update → 백그라운드에서 요약 생성 → ChapterSummary 저장
✅ node-llama-cpp + GGUF 경로 설정 → 요약 생성
✅ 모델 없음 → fallback(첫 500자) 저장, 에러 없음
✅ LM Studio 실행 중 → 자동 감지, LM Studio로 요약 생성
✅ api.memory.getChapterSummary(chapterId) → 요약 반환
```

---

## 주의사항

- **node-llama-cpp Electron 빌드**: `electron-builder`에서 네이티브 애드온 처리 필요
  - `asarUnpack: ["node_modules/node-llama-cpp/**"]` 설정 필수
- **모델 로딩 시간**: 첫 요약 생성 전 모델 로드 1~5초 소요 (백그라운드 job이라 UX 무관)
- **메모리**: qwen3:4b GGUF ≈ 2.5GB RAM 점유 (모델 로드 중 유지)
  - 유휴 시 unload 옵션 고려 (Phase 2에서는 단순하게 유지)
