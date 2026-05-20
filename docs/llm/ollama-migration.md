# Ollama 마이그레이션 플랜

## 목표
로컬 LLM 실행 코드 전부 제거 → Ollama HTTP API만 사용  
UX: URL + 모델 선택 두 줄. 끝.

---

## Phase 1 — 철거 (삭제)

### 삭제할 파일 (전체)
| 파일 | 이유 |
|------|------|
| `src/main/services/llm/providers/llamaCppProvider.ts` | in-process 모델 로딩 전체 |
| `src/main/services/llm/providers/llamaServerProvider.ts` | sidecar HTTP wrapper |
| `src/main/services/llm/sidecarManager.ts` | llama-server spawn 관리 |
| `src/main/services/llm/modelStorageService.ts` | GGUF 다운로드/HuggingFace 연동 |

### `package.json`
```
제거: "node-llama-cpp": "3.18.1"
```
> node-llama-cpp 제거 → 앱 빌드 크기 대폭 감소, native 바이너리 빌드 불필요

### IPC channels 제거 (`src/shared/ipc/channels.ts`)
```
SETTINGS_GET_LLM_MODELS               ← Ollama /v1/models로 대체
SETTINGS_SET_LLM_DEFAULT_MODEL        ← 제거
SETTINGS_SET_LLM_EMBEDDING_MODEL      ← 제거 (추후 Ollama embed 지원 시 재추가)
SETTINGS_DOWNLOAD_DEFAULT_LLM_MODEL   ← 제거
SETTINGS_DOWNLOAD_DEFAULT_EMBEDDING_MODEL ← 제거
SETTINGS_GET_LLM_DOWNLOAD_STATUS      ← 제거
SETTINGS_SET_LLM_PROVIDER_HINT        ← 제거 (항상 externalapi)
SETTINGS_SEARCH_HF_MODELS             ← 제거
SETTINGS_GET_HF_MODEL_FILES           ← 제거
SETTINGS_DOWNLOAD_HF_MODEL            ← 제거
SETTINGS_SET_LLM_RUNTIME              ← 제거
```

추가:
```
SETTINGS_LIST_OLLAMA_MODELS    ← GET http://localhost:11434/v1/models
SETTINGS_TEST_OLLAMA_CONNECTION ← health check
```

---

## Phase 2 — 슬림화 (대규모 수정)

### `modelRuntimeFactory.ts` (339줄 → ~60줄)

제거:
- `llamacpp` / `llamaserver` 분기 전부
- `getOrCreateLlamaProvider` / `getOrCreateLlamaServerProvider`
- `resolveModelPathFromModelsDir` (GGUF 자동 탐색)
- `GlobalLlmSettings`의 모델 경로 관련 필드 전부

남길 것:
```typescript
// 핵심 로직 전부
export async function resolveModelRuntimeClient(projectId: string): Promise<ModelRuntimeClient> {
  const config = await loadOllamaConfig()
  if (config?.baseUrl && config?.chatModel) {
    return getOrCreateExternalApiProvider(config)
  }
  return deterministicProvider  // Ollama 미설정
}
```

### `settingsDefaults.ts` / `settingsManager.ts`

제거:
```
defaultModelPath, defaultModelId
defaultEmbeddingModelPath, defaultEmbeddingModelId
llmProviderHint
gpuLayers, contextSize
hfTokenCipher
```

남길 것:
```typescript
llm: {
  ollama: {
    baseUrl: "http://localhost:11434",
    chatModel: "",          // 미설정 시 deterministicProvider
    embeddingModel: "",     // 선택사항
  },
  ragTemperature: 0.2,
  ragMaxTokens: 1200,
}
```

### `ipcSettingsHandlers.ts` (386줄)

제거: HF 토큰, 모델 다운로드, GGUF 경로 관련 핸들러 전부

추가:
```typescript
// Ollama 모델 목록 조회
ipcMain.handle(SETTINGS_LIST_OLLAMA_MODELS, async (_, baseUrl: string) => {
  const res = await fetch(`${baseUrl}/v1/models`, { signal: AbortSignal.timeout(3000) })
  if (!res.ok) return []
  const data = await res.json()
  return data.models?.map(m => m.id) ?? data.data?.map(m => m.id) ?? []
})

// Ollama 연결 테스트
ipcMain.handle(SETTINGS_TEST_OLLAMA_CONNECTION, async (_, baseUrl: string) => {
  try {
    const res = await fetch(`${baseUrl}/v1/models`, { signal: AbortSignal.timeout(3000) })
    return { ok: res.ok }
  } catch {
    return { ok: false }
  }
})
```

---

## Phase 3 — 새 Settings UI (ModelTab.tsx 전면 재작성)

### 현재: 676줄 (GGUF 탐색, HF 다운로드, 모델 경로, provider 선택)
### 목표: ~150줄

```
┌─────────────────────────────────────────┐
│  AI 모델 설정                            │
│                                         │
│  Ollama 서버 URL                         │
│  [http://localhost:11434          ]     │
│                                         │
│  모델 선택                               │
│  [qwen3:4b                        ▼]   │  ← /v1/models에서 자동 로드
│                                         │
│  [연결 테스트]  ● 연결됨 / ✗ 연결 안 됨   │
│                                         │
│  Ollama 미설치?                          │
│  → ollama.com 에서 설치 후              │
│     ollama pull qwen3:4b 실행           │
└─────────────────────────────────────────┘
```

### Ollama 자동 감지 (앱 시작 시)
```typescript
// appReady.ts 또는 settingsManager.ts
const ollamaRunning = await fetch('http://localhost:11434/v1/models', { 
  signal: AbortSignal.timeout(1500) 
}).then(r => r.ok).catch(() => false)

if (ollamaRunning && !settings.llm.ollama.chatModel) {
  // 설정 UI에 "Ollama 감지됨" 배너 표시
}
```

---

## Phase 4 — 설정 파일 마이그레이션

기존 settings.json에 `defaultModelPath` 등 레거시 필드 있음.  
`settingsManager.ts`의 `loadSettings()`에 마이그레이션 로직 추가:

```typescript
// 마이그레이션: llamacpp → ollama
if (raw.llm?.defaultModelPath && !raw.llm?.ollama?.chatModel) {
  // 구 설정 필드 무시, 빈 ollama config로 초기화
  // 유저에게 재설정 안내
}
```

---

## 실행 순서

```
Phase 1: 파일 삭제 + package.json
  → npm install (node-llama-cpp 제거)
  → 빌드 통과 확인 (import 에러 수정)

Phase 2: factory + settings 슬림화
  → 타입 에러 수정
  → deterministicProvider가 Ollama 미설정 시 명확한 에러 반환 확인

Phase 3: ModelTab.tsx 재작성
  → 새 IPC 핸들러 연결

Phase 4: settings 마이그레이션
  → 기존 settings.json 호환성
```

---

## 검증

```
1. Ollama 설치 + ollama pull qwen3:4b
2. 앱 실행 → Settings → AI 모델
3. URL: http://localhost:11434 → 연결 테스트 → ● 연결됨
4. 모델 드롭다운에 qwen3:4b 표시 확인
5. RAG QA 질문 → 정상 응답 확인
6. Activity Monitor: electron-helper ~50MB, ollama 프로세스 별도
```

---

## 기대 효과

| 항목 | 이전 | 이후 |
|------|------|------|
| 삭제 코드 | — | ~1,700줄 |
| node-llama-cpp | 필요 (native 빌드) | 불필요 |
| electron-helper RAM | 2.5GB+ | ~50MB |
| 빌드 크기 | 큰 native 바이너리 포함 | 없음 |
| 모델 업데이트 | 앱 재배포 또는 수동 다운 | `ollama pull` |
