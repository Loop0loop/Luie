# Plan: Embedding Model Separation (RAM 절감 Phase 1)

## 배경 / 문제

LLM 구동 시 Electron utility helper 프로세스가 6GB+ RAM을 점유하고 유지된다.

근본 원인 (조사 결과):
1. **임베딩이 생성용 4B LLM을 그대로 사용한다.** `embedTexts` → `resolveModelRuntimeClient().embed()` → `LlamaCppProvider.embed()`. 임베딩 전용 모델이 없어 Qwen3-4B(Q4_K_M, ~2.5GB)를 임베딩에 동원한다.
2. **`llmEmbeddingModelPath`가 코드 어디서도 set되지 않는다** → 항상 null → `ensureEmbeddingLoaded()`에서 `embeddingModelPath ?? modelPath`로 귀결 → 완성 모델과 동일 모델 재사용(`isSameModel = true`).
3. **백그라운드 임베딩 job이 idle unload를 무력화한다.** `embeddingProjector`가 주기적으로 `embed()`를 호출 → `scheduleIdleUnload()` 타이머가 계속 리셋 → 채팅을 안 해도 4B 모델이 helper에 영구 상주.

목표: 임베딩을 4B LLM에서 분리해 전용 소형 임베딩 모델로 처리한다. 그러면 백그라운드 임베딩이 4B를 핀하지 않고, helper 상주 메모리가 (소형 임베딩 모델) 수준으로 떨어진다. 채팅 시에만 4B가 풀로드된다.

범위: **Phase 1만.** `llamacpp` in-process 유지. llamaserver 전환(C안)은 별도 플랜.

## 현재 vs 목표

| | 현재 | 목표 |
|---|---|---|
| 임베딩 모델 | Qwen3-4B (생성 LLM 공유) | 전용 소형 GGUF (별도) |
| 백그라운드 임베딩 시 상주 | 4B (~2.5GB+) | 소형 임베딩 (~0.3~0.6GB) |
| 채팅 시 상주 | 4B | 4B (변화 없음) |
| 임베딩 차원 | 4B hidden dim | 임베딩 모델 dim (예: bge-m3=1024) |
| `MemoryEmbedding.model` | `"utility"` 하드코딩 | 임베딩 모델 id |

## 임베딩 모델 선정

요구: 한국어 소설 텍스트 → **다국어 임베딩 필수**. 소형.

- 1순위(권장): **bge-m3** GGUF (Q8/Q4). 다국어 강함, 한국어 양호, dim 1024. 파일 ~0.3~0.6GB(quant별).
- 대안(더 가벼움): **multilingual-e5-small** GGUF. dim 384, 더 작음. 한국어 품질은 bge-m3보다 낮음.

선정은 Task 0에서 실제 GGUF 파일/repo 확정 후 고정. node-llama-cpp `createEmbeddingContext()` 지원(임베딩 capability) 모델이어야 함.

## 작업 분해 (Task)

### Task 0 — 임베딩 모델 확정
- bge-m3 GGUF의 HuggingFace repo/fileName/sha 확정.
- node-llama-cpp로 `createEmbeddingContext()` + `getEmbeddingFor()` 동작 + 차원 수동 검증(스크래치 스크립트).
- 검증: 임의 텍스트 임베딩 → Float32Array, length == 기대 dim.

### Task 1 — modelStorageService: 임베딩 모델 다운로드
파일: `src/main/services/llm/modelStorageService.ts`
- `DEFAULT_EMBEDDING_MODEL = { modelId, repo, fileName }` 추가.
- `downloadDefaultEmbeddingModel()` 추가 (기존 `downloadDefaultModel` 로직 재사용: .part 재개 + sha256 + 진행 상태). 다운로드 완료 시 `settingsManager.setLlmSettings({ defaultEmbeddingModelPath, defaultEmbeddingModelId })`.
- `getView()`에 임베딩 모델 상태 노출.
- 검증: 다운로드 → 파일 존재 + sha 일치 + 설정에 경로 기록.

### Task 2 — settings: 임베딩 모델 경로 배선
파일: `src/main/manager/settingsManager.ts`
- `getLlmSettings()` / `setLlmSettings()`에 `defaultEmbeddingModelPath`, `defaultEmbeddingModelId` 필드 추가.
- 검증: set 후 get 라운드트립, settings.json 기록.

### Task 3 — modelRuntimeFactory: 임베딩 경로 해석
파일: `src/main/services/llm/modelRuntimeFactory.ts`
- `GlobalLlmSettings`에 `defaultEmbeddingModelPath` 추가, `loadGlobalLlmSettingsFromFile()`에서 파싱.
- `resolveModelRuntimeClient()`의 `embeddingConfiguredPath` 해석 순서:
  `projectSettings.llmEmbeddingModelPath ?? env LUIE_LLM_EMBEDDING_MODEL_PATH ?? globalLlm.defaultEmbeddingModelPath ?? null`.
- 이 값을 `getOrCreateLlamaProvider(modelPath, embeddingConfiguredPath, ...)`로 전달(이미 시그니처 존재).
- 주의: provider 캐시 key가 `modelPath::embeddingModelPath::ctx::gpu` → 임베딩 경로 포함되므로 자동 분리.
- 검증: 로그 `Resolving model runtime client`에 `hasEmbeddingModelPath: true` 확인.

### Task 4 — LlamaCppProvider: 임베딩 전용 모델 idle 분리 (선택적 강화)
파일: `src/main/services/llm/providers/llamaCppProvider.ts`
- 현재 `embeddingModelPath`가 다르면 별도 `loadModel`로 소형 모델 로드 — **이미 구현됨**. Task 3로 경로만 들어오면 동작.
- 강화: `unload()`이 완성/임베딩 모델을 한꺼번에 내림. 임베딩(소형)과 완성(4B) idle을 **분리**해, 백그라운드 임베딩이 4B idle 타이머를 리셋하지 않게 한다.
  - `generate*`는 완성 모델 idle만, `embed`는 임베딩 모델 idle만 리셋하도록 타이머 2개로 분리.
  - 효과: 채팅 종료 후 백그라운드 임베딩이 돌아도 4B는 10분 뒤 unload.
- 검증: 채팅 1회 → 종료 → 백그라운드 임베딩 지속 → 10분 후 4B unload 로그(임베딩 모델은 유지).

### Task 5 — 임베딩 마이그레이션 (차원 변경 대응)
**필수.** 모델 교체 시 임베딩 차원이 바뀐다. 벡터검색 SQL은 `WHERE dimension = queryVec.length`로 필터하므로(`searchService.ts:297`) 옛 벡터는 조용히 무시되어 검색이 lexical fallback으로만 동작. contentHash 기반 재임베딩은 hash 동일 시 트리거되지 않음.
- `embeddingProjector`에서 `MemoryEmbedding.model` 컬럼에 **임베딩 모델 id 기록**(현재 `"utility"` 하드코딩 교체).
- 부팅/임베딩 처리 시: 현재 임베딩 모델 id와 다른 `model` 값을 가진 행 = stale → 재임베딩 대상.
- 마이그레이션 전략(택1):
  - (a) stale 행 삭제 + 해당 chunk에 `REBUILD_EMBEDDING` job enqueue.
  - (b) `model != current` 행을 changedChunks로 간주(contentHash 비교에 모델 id 조건 추가).
- 검증: 모델 교체 후 프로젝트 1개 → 재임베딩 job 처리 → 벡터검색이 다시 결과 반환(차원 일치).

### Task 6 — IPC / UI (필요 시)
파일: `src/main/handler/system/ipcSettingsHandlers.ts` (+ preload + renderer 설정 화면)
- 임베딩 모델 다운로드 트리거/상태 채널 추가(`SETTINGS_DOWNLOAD_EMBEDDING_MODEL`, 상태). 기존 LLM 모델 패턴 복제.
- UI: 설정에 "임베딩 모델" 다운로드/상태 표기.
- 검증: 설정에서 다운로드 → 진행률 → 완료 표시.

### Task 7 — 부팅 시 임베딩 모델 보장
- 앱 첫 실행/모델 미존재 시 임베딩 모델 자동 다운로드 또는 사용자 안내. 4B 다운로드 플로우와 동일 시점에.
- 검증: 클린 설치 → 임베딩 모델 확보 → RAG 임베딩 정상.

## 마이그레이션 / 호환성

- 기존 사용자: 옛 4B 임베딩 벡터는 차원 불일치로 무시됨 → Task 5로 재임베딩될 때까지 RAG 검색이 lexical fallback. 재임베딩은 백그라운드 점진 처리.
- 롤백: 임베딩 경로 설정을 비우면 다시 4B 공유로 회귀(코드 분기 유지). 단 벡터 차원이 또 바뀌므로 재임베딩 재발생.

## 검증 (전체 성공 기준)

1. **메모리**: 채팅 미사용 + 백그라운드 임베딩 활성 상태에서 helper RSS가 4B 상주(이전) 대비 크게 하락(임베딩 소형 모델 수준). Activity Monitor + 프로세스 RSS 로그로 측정.
2. **기능**: RAG QA가 evidence 기반 응답 정상. 벡터검색이 재임베딩 후 결과 반환(lexical fallback 아님).
3. **idle**: 채팅 종료 후 4B가 idle unload(Task 4), 임베딩 모델만 상주.
4. **회귀**: 검색/임베딩 job 실패율 0, 차원 불일치 에러 없음.

## 리스크

- bge-m3 등 임베딩 모델이 node-llama-cpp `createEmbeddingContext()`와 호환 안 될 수 있음 → Task 0에서 사전 검증(블로커면 e5-small 등 대체).
- 재임베딩 대량 발생 시 일시적 CPU/IO 부하 → 배치 크기/우선순위로 throttle(기존 `limit`, backoff 활용).
- 임베딩+완성 모델 동시 상주 시점(채팅 중 임베딩) 존재 → 단, 임베딩이 소형이라 총합은 현재보다 낮음.

## 비범위 (후속)

- llamaserver 전환(C안) 및 embed→`/v1/embeddings` 라우팅.
- contextSize/mmap/useMmap 튜닝.
- 메모리 계측 대시보드.
