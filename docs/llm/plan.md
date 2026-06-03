# RAG → LLM 수정 계획

## 현황 요약

RAG context 조립(4계층)과 utility process 파이프라인은 **완성됨**.
문제는 LLM generation layer에 집중됨.

### 증상
- 원고 내용 질문 → LLM이 모른다고 답함
- "정확한 데이터가 뭐 있냐" → "없다"

### 근본 원인
GGUF 모델 미설정 → `resolveModelRuntimeClient` → `DeterministicProvider` 반환
→ `generateStream`이 prompt 앞 500자 echo + `[요약 생략 — 모델 미설정]` 뱉음
→ 4계층 context 전부 무시됨

---

## 수정 항목

### P0 — 즉각 차단 해제 (외부 API provider 추가)

현재 provider: `llamacpp` / `llamaserver` / `none(deterministic)`.
외부 API(OpenAI, Anthropic, 로컬 OpenAI-compat 등) **provider 없음**.
`llamaServerProvider`가 이미 OpenAI-compat HTTP 구조 → 최소 작업으로 외부 API 지원 가능.

#### [X] Task P0-1: `ExternalApiProvider` 구현

**파일**: `src/main/services/llm/providers/externalApiProvider.ts` (신규)

구현 인터페이스 (`ModelRuntimeClient`):
```typescript
interface ModelRuntimeClient {
  providerName: string
  isAvailable(): Promise<boolean>
  isModelLoaded(): boolean
  generate(prompt, options?): Promise<string>
  generateStream(prompt, options?): AsyncIterable<string>
  generateChatStream?(input, options?): AsyncIterable<string>  // ← RAG 주 경로
  embed(texts): Promise<Float32Array[] | null>
}
```

필요 설정값:
```typescript
type ExternalApiConfig = {
  baseUrl: string       // e.g. "https://api.openai.com/v1" or "http://localhost:11434/v1"
  apiKey?: string       // Authorization: Bearer
  chatModel: string     // e.g. "gpt-4o-mini", "claude-3-5-haiku"
  embeddingModel?: string
  maxTokens?: number
}
```

구현 포인트:
- `generateChatStream`: `POST /chat/completions` with `stream: true`, SSE 파싱
- `generateStream`: `POST /completions` with `stream: true` (fallback)
- `embed`: `POST /embeddings` → `Float32Array` 변환. 외부 API면 `null` 반환 허용(벡터검색 비활성화)
- `isModelLoaded()`: 항상 `true` (stateless HTTP)
- `isAvailable()`: `GET /models` 또는 baseUrl health check (timeout 3s)
- AbortSignal 전달 필수 (stream abort)

참고 코드: [`llamaServerProvider.ts:75-220`](../src/main/services/llm/providers/llamaServerProvider.ts)

---

#### [X] Task P0-2: `modelRuntimeFactory.ts` 분기 추가

**파일**: `src/main/services/llm/modelRuntimeFactory.ts`

1. `GlobalLlmSettings` 타입에 필드 추가:
```typescript
type GlobalLlmSettings = {
  // 기존...
  llmProviderHint: "llamacpp" | "llamaserver" | "externalapi" | "none" | null
  externalApiBaseUrl?: string
  externalApiKey?: string
  externalApiChatModel?: string
  externalApiEmbeddingModel?: string
}
```

2. `normalizeProviderHint`에 `"externalapi"` 추가

3. `resolveModelRuntimeClient`에 분기 추가:
```typescript
if (runtimeConfig.providerHint === "externalapi") {
  return getOrCreateExternalApiProvider(runtimeConfig)
}
```

4. `loadGlobalLlmSettingsFromFile`에서 `settings.json`의 `llm.externalApi.*` 읽기

---

#### [X] Task P0-3: `settings.json` 스키마 확장

`src/shared/schemas/settings.ts` (또는 동등 위치):
```typescript
externalApi: {
  baseUrl: string
  apiKey?: string
  chatModel: string
  embeddingModel?: string  // null이면 벡터검색 비활성화
}
```

---

#### [X] Task P0-4: providerHint 시리얼라이즈/역직렬화 확인

`src/main/database/schema/index.ts`의 `projectSettings.llmProviderHint` 컬럼에
`"externalapi"` 값 허용 확인. CHECK constraint 있으면 마이그레이션 필요.
현재 스키마는 `TEXT` 컬럼이며 CHECK constraint가 없어 `"externalapi"` 저장 가능. 추가 마이그레이션 불필요.

---

### [X] P1 — 임베딩 없을 때 graceful degradation

**현상**: 외부 API embed가 `null` 반환 → embeddingProjector가
`EMBEDDING_RUNTIME_RETURNED_NO_VECTOR` 던짐 → job 5회 실패 후 `failed` 고착

**파일**: `src/main/services/features/memory/embeddingProjector.ts`

수정 포인트 ([`embeddingProjector.ts:150-157`](../src/main/services/features/memory/embeddingProjector.ts#L150)):
```typescript
// 현재
const vectorsRaw = await utilityProcessBridge.embed(...)
if (!vectors || vectors.length === 0) {
  throw new Error("EMBEDDING_RUNTIME_RETURNED_NO_VECTOR")  // ← job fail
}

// 수정: embed 불가 provider면 job을 skip (completed 처리)
if (!vectors) {
  // provider doesn't support embedding — mark completed, skip vector
  await client.update(memoryBuildJob).set({ status: "completed" ... })
  continue
}
```

판별 방법: `resolveRuntimeModelConfig`의 `providerHint === "externalapi"` 이고 `embeddingModel` 없으면 skip.
또는 `embed` 메서드가 `null` 반환 시 retry하지 않고 skip.

---

### [X] P2 — deterministicProvider 노출 개선

**현재**: 응답이 prompt echo + `[요약 생략 — 모델 미설정]`. 사용자는 LLM이 context를 모른다고 인식함.

**파일**: `src/main/services/llm/providers/deterministicProvider.ts`
또는 `src/main/services/features/rag/normalizeCoreAnswer.ts`

수정 옵션 A — provider에서 명시적 에러 메시지:
```typescript
async *generateStream() {
  yield "LLM 모델이 설정되지 않았습니다. 설정 > AI 모델에서 모델을 구성해주세요."
}
```

수정 옵션 B — worker에서 provider 타입 체크 후 에러 코드 반환:
[`ragQaWorker.ts:192`](../src/main/utility/ragQaWorker.ts#L192) `execute`에서
`runtime.providerName === "deterministic"` 이면 `RAG_QA_FAILED` emit + 안내 메시지.

---

### [X] P3 — RAG QA 로그 강화 (디버깅용)

**파일**: `src/main/utility/ragQaWorker.ts`

`execute` 시작에 로그 추가:
```typescript
logger.info("RAG QA execute", {
  runId: run.runId,
  projectId: run.request.projectId,
  providerName: runtime.providerName,       // ← 어떤 provider 쓰는지
  isModelLoaded: runtime.isModelLoaded(),   // ← 모델 로드 상태
})
```

`assembleRagContext` 완료 후:
```typescript
logger.info("RAG context assembled", {
  layer0Chars: layer0.length,
  layer1Chars: layer1.length,
  layer2Chars: layer2.length,
  evidenceCount: layer3.evidence.length,    // ← 0이면 chunk 파이프라인 문제
})
```

---

## 실행 순서

```
P0-1 → P0-2 → P0-3 → P0-4   (한 PR, 외부 API 연결)
P1                             (별도 PR, embedding graceful skip)
P2 + P3                        (별도 PR, UX 개선 + 로그)
```

---

## 검증 방법

### 외부 API 연결 검증 (P0 완료 후)

1. `settings.json`에 설정:
```json
{
  "llm": {
    "llmProviderHint": "externalapi",
    "externalApi": {
      "baseUrl": "https://api.openai.com/v1",
      "apiKey": "sk-...",
      "chatModel": "gpt-4o-mini"
    }
  }
}
```

2. 앱 실행 → RAG QA 질문

3. 로그 확인:
   - `"Resolving model runtime client"` → `providerHint: "externalapi"`
   - `"RAG context assembled"` → `evidenceCount > 0`
   - `"RAG QA completed"` → 정상 answer

### 현재 상태 빠른 진단

앱 실행 후 로그에서 검색:
- `"LLM provider path is not configured, using deterministic fallback"` → P0 미적용 상태 확인
- `evidenceCount: 0` → chunk 파이프라인 문제 (derivedJobWorker 미실행 가능성)

---

## 비고 — 외부 API 시 데이터 프라이버시

외부 API provider 사용 시 원고 내용이 외부 서버로 전송됨.
UI에서 명시적 경고 표시 권장.
로컬 OpenAI-compat 서버(Ollama, LM Studio)도 동일 provider로 지원 가능 (`baseUrl`만 변경).

---

## Memory 문제 — electron-helper 6GB 원인 및 수정

### 원인 분석

현재 `llamacpp` provider는 `node-llama-cpp`를 **utility process 내부에서 직접 로드** (in-process).
모델 가중치(6GB)가 electron-helper의 native heap에 상주.

**버그: `unloadModel()`이 native 메모리를 실제 해제하지 않음**
```
파일: src/main/services/llm/providers/llamaCppProvider.ts:84-93
```
`model`/`context` JS 참조만 `undefined` 대입 → V8 GC가 eventually finalizer 실행하지만
언제 실행될지 보장 없음 (분 단위 지연). node-llama-cpp 객체는 `.dispose()` 호출 시
내부적으로 `llama_free()` / `llama_free_model()` 실행 → 즉시 native 메모리 해제.

### 수정 항목

#### [X] Task M0 — `unloadModel()` / `unloadEmbedding()` dispose 추가 (버그픽스)

**파일**: `src/main/services/llm/providers/llamaCppProvider.ts`

```typescript
// 현재 (native 메모리 해제 안 됨)
private unloadModel(): void {
  this.modelPromise = null;
  this.context.model = undefined;
  this.context.context = undefined;
}

// 수정 (dispose() 호출 후 null)
private unloadModel(): void {
  if (this.context.context) {
    (this.context.context as { dispose?: () => void }).dispose?.();
  }
  if (this.context.model) {
    (this.context.model as { dispose?: () => void }).dispose?.();
  }
  this.modelPromise = null;
  this.context.model = undefined;
  this.context.context = undefined;
  this.context.LlamaCompletion = undefined;
  this.context.LlamaChatSession = undefined;
  if (this.modelIdleUnloadTimer) {
    clearTimeout(this.modelIdleUnloadTimer);
    this.modelIdleUnloadTimer = null;
  }
}

private unloadEmbedding(): void {
  if (this.context.embeddingContext) {
    (this.context.embeddingContext as { dispose?: () => void }).dispose?.();
  }
  // embeddingModel이 mainModel과 다를 때만 dispose (공유 모델은 unloadModel이 처리)
  const isSeparateModel =
    this.context.embeddingModel !== undefined &&
    this.context.embeddingModel !== this.context.model;
  if (isSeparateModel) {
    (this.context.embeddingModel as { dispose?: () => void }).dispose?.();
  }
  this.embeddingPromise = null;
  this.context.embeddingModel = undefined;
  this.context.embeddingContext = undefined;
  if (this.embeddingIdleUnloadTimer) {
    clearTimeout(this.embeddingIdleUnloadTimer);
    this.embeddingIdleUnloadTimer = null;
  }
}
```

`dispose()` 역시 동일 수정:
```typescript
dispose(): void {
  this.unloadModel();
  this.unloadEmbedding();
}
```

이 하나로 TTL 만료 후 native 메모리가 즉시 해제됨.

---

#### [X] Task M1 — TTL 단축 + context size 조정

**파일**: `src/main/constants/llm.ts`

```typescript
// 현재
export const LLM_DEFAULT_IDLE_UNLOAD_MS = 10 * 60 * 1000;  // 10분
export const LLM_DEFAULT_CONTEXT_SIZE = 8_192;

// 권장
export const LLM_DEFAULT_IDLE_UNLOAD_MS = 2 * 60 * 1000;   // 2분
export const LLM_DEFAULT_CONTEXT_SIZE = 4_096;              // KV cache 절반
```

context size 8192 → 4096: KV cache 메모리 약 40-50% 절감. RAG 답변은 max 1200 tokens이므로 4096으로 충분.

---

#### [X] Task M2 (권장) — llamaserver sidecar를 기본 경로로 격상

**구조 목표** (LM Studio 방식):
```
[Utility Process — electron Helper, 경량]
    ↓ HTTP
[llama-server 프로세스 — 별도 OS 프로세스]
    모델 6GB 여기, electron-helper RAM과 무관
    응답 완료 → llama_kv_cache_clear() 즉시
```

`llamaServerProvider` + `sidecarManager`가 이미 구현됨. 필요한 것:

1. **llama-server 바이너리 번들링**
   - macOS: `resources/llama-server-darwin-arm64` (or universal)
   - Windows: `resources/llama-server-win-x64.exe`
   - `sidecarManager.doStart()`의 `LLAMA_SERVER_PATH` → 번들 경로 자동 resolve 로직 추가

2. **기본 providerHint 전환**
   ```typescript
   // modelRuntimeFactory.ts: effectiveModelPath 있을 때 기본을 llamaserver로
   const defaultHint = process.platform === "..." ? "llamaserver" : "llamacpp";
   ```
   또는 settings UI에서 선택 가능하게.

3. **sidecar idle timeout 조정**: 현재 5분 → 2분으로 단축

적용 완료:
- `sidecarManager`에 패키지 리소스 경로 자동 탐색(`LLAMA_SERVER_PATH` 미설정 시) 추가
- `settingsDefaults.llm.llmProviderHint` 기본값을 `"llamaserver"`로 전환
- `resolveModelRuntimeClient`에서 `providerHint === null`일 때 `llamaserver` 우선 선택
- sidecar idle timeout 기본값 2분으로 단축
- `llama-server` 실행 인자에 `--embedding` 추가
- `modelStorageService`의 모델 선택/다운로드 후 provider 강제값을 `"llamaserver"`로 정렬

---

### 메모리 예상 절감

| 조치 | 절감 |
|------|------|
| M0: dispose() 추가 | TTL 후 즉시 6GB 해제 (현재는 GC 지연) |
| M1: context 4096 | 활성 중 ~1-2GB 절감 |
| M2: llamaserver | electron-helper RAM ~50MB 수준, 모델은 별도 프로세스 |

**단기 최소 수정**: M0 + M1만으로도 TTL 만료 후 즉각 해제됨.
**장기 목표**: M2로 아키텍처를 LM Studio 수준으로.

---

### llamaserver 번들링 전략

자체 번들링 대신 **Ollama 활용**이 더 현실적:
- 사용자가 Ollama 설치 → `http://localhost:11434/v1` 로 `externalapi` provider 연결
- Ollama가 모델 수명주기 관리, RAM 해제 담당
- Luie는 HTTP만 → electron-helper 경량 유지
- P0 (ExternalApiProvider) 구현 완료 시 즉시 가능

---

## 운영 계측 (실측 보강)

#### [X] Task M3 — sidecar RSS 메모리 스냅샷 로그 추가

**파일**: `src/main/services/llm/sidecarManager.ts`

- sidecar 실행 중 30초 주기로 `ps -o rss=` 기반 RSS(MB) 로그 기록
- sidecar 종료/idle stop 시 계측 타이머 정리
- utility process 메모리 스냅샷 로그(`utilityProcessMain.ts`)와 함께
  helper/sidecar 메모리를 분리 관찰 가능
