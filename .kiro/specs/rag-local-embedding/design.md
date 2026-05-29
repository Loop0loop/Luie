# Design Document

## Overview

이 설계는 RAG 의미 검색을 로컬에서 동작시키기 위한 **전용 임베딩 모델 경로**와,
일반 사용자가 PC에 맞는 모델을 고르게 하는 **llmfit 통합**을 다룬다.
현재 아키텍처(llama-server sidecar + utility process 임베딩 브리지)를 최대한 재사용한다.

핵심 발견(현 코드 기준):
- 임베딩은 이미 `utilityProcessBridge.embed` → `resolveModelRuntimeClient().embed()`로 흐른다(프로세스 격리 존재).
- `embeddingProjector`는 `buildEmbeddingModelSignature`로 모델 변경 시 자동 재임베딩한다(차원 변경 대응 토대 존재).
- sidecar는 단일 인스턴스이며 `--embeddings` 미설정 + `embeddingModel: null`이라 임베딩이 항상 skip된다 → **이 단절이 핵심 수정 대상**.
- utility process는 `utilityProcess.fork`로 격리되고 crash 시 활성 run에 에러를 전파한다(R2 토대 존재).

## Architecture

```
┌────────────────────── Electron Main ──────────────────────┐
│  modelRuntimeFactory.resolveModelRuntimeClient(projectId)  │
│    ├─ 생성: llama-server sidecar (chat 8080)               │
│    └─ 임베딩: 전용 임베딩 sidecar (embeddings 8081) ◀── NEW │
│                                                            │
│  embeddingSidecarManager (NEW)  ── 독립 idle 타이머        │
│  llmfitService (NEW) ── 바이너리 1-shot 실행 → JSON 파싱   │
│  modelCatalog (확장) ── 임베딩 모델 정의 추가              │
└────────────────────────────────────────────────────────────┘
        │ IPC (격리: 실패가 앱에 전파되지 않음)
┌────────────────────── Renderer ──────────────────────┐
│  설정 > AI 모델 탭                                     │
│    - 하드웨어 추천 모델 ~10개 (llmfit)                 │
│    - 생성/임베딩 모델 상태 카드                        │
│    - 의미 검색 상태 게이트(준비됨/준비중/비활성)       │
└────────────────────────────────────────────────────────┘
```

### 임베딩을 위한 두 가지 sidecar 전략 결정

llama-server는 단일 인스턴스에서 `--embeddings` 모드를 켜면 chat completion pooling과
충돌할 수 있다(임베딩 모드는 mean-pooling). 따라서 **임베딩 전용 sidecar 인스턴스를 별도 포트로 분리**한다.

- 생성 sidecar: 기존 `sidecarManager` (chat 모델, `/v1/chat/completions`).
- 임베딩 sidecar: 신규 `embeddingSidecarManager` (소형 임베딩 GGUF, `--embeddings`, `/v1/embeddings`).
- 두 매니저는 독립적인 프로세스/포트/idle 타이머를 가져 R5(메모리 분리)를 충족.
- 임베딩 모델이 없으면 임베딩 sidecar를 띄우지 않고 `embed()`는 null → FTS 폴백(R1.2).

## Components and Interfaces

### C1. 임베딩 모델 카탈로그 (`sidecarConstants.ts` 확장 또는 신규 `embeddingModelConstants.ts`)
```ts
export const DEFAULT_EMBEDDING_MODEL = {
  repo: "...",          // bge-m3 GGUF repo (Task 0에서 확정)
  filename: "...",
  sizeBytes: number,
  sha256: "...",
  dimension: 1024,
  displayName: "bge-m3 (다국어 임베딩)",
} as const;
```

### C2. `embeddingSidecarManager.ts` (신규)
기존 `sidecarManager`와 동일 패턴이되:
- llama-server를 `--embeddings --pooling mean` 인자로 기동.
- 독립 포트(findFreePort), 독립 idle 타이머(생성 모델과 분리).
- `getBaseUrl()`, `ensureStarted(binaryPath, embModelPath)`, `stop()`.
- 크래시/스폰 실패 시 상태만 stopped로 — 앱에 throw 전파하지 않음(R2).

### C3. `modelRuntimeFactory` 확장
- `resolveRuntimeModelConfig`가 sidecar에 대해 임베딩 모델 경로/식별자를 반환하도록 수정:
  - 해석 순서: `projectSettings.llmEmbeddingModelPath ?? env LUIE_LLM_EMBEDDING_MODEL_PATH ?? global defaultEmbeddingModelPath ?? null`.
- 임베딩 요청 시 임베딩 전용 `ExternalApiProvider`(embeddings baseUrl + embeddingModel set)를 반환하는 별도 경로
  `resolveEmbeddingRuntimeClient(projectId)` 추가. 기존 `resolveModelRuntimeClient`는 생성용 유지.
- utility process의 `embedTexts`가 `resolveEmbeddingRuntimeClient`를 쓰도록 변경.

### C4. `llmfitService.ts` (신규, main)
- 바이너리 위치 해석: `LUIE_LLMFIT_PATH` env → userData 설치 경로(`<userData>/bin/llmfit[.exe]`) → PATH(`llmfit`).
- 1-shot 실행: `llmfit recommend --json --limit 10 --use-case embedding|general` (자식 프로세스, 타임아웃, 격리).
- stdout JSON 파싱 → 안전 스키마(zod)로 검증 → 상위 ~10개만 정규화하여 반환.
- 바이너리 없음/실패 시 `{ available: false, reason }` 반환(throw 금지, R3.4/3.5).
- 결과 형태(렌더러 전달용):
```ts
type LlmfitRecommendation = {
  name: string; provider: string; paramsB: number;
  fitLevel: "perfect"|"good"|"marginal"|"too_tight"; fitLabel: string;
  runMode: string; estimatedTps: number | null;
  memoryRequiredGb: number | null; bestQuant: string | null;
  score: number;
};
```

### C4b. `llmfitInstaller.ts` (신규, main) — GitHub releases 런타임 설치 (R6)
- GitHub API `GET /repos/AlexsJones/llmfit/releases/latest` 로 최신 릴리스/자산 조회.
- 플랫폼→자산 매핑:
  - `darwin-arm64` → `*-aarch64-apple-darwin.tar.gz`
  - `darwin-x64` → `*-x86_64-apple-darwin.tar.gz`
  - `win32-x64` → `*-x86_64-pc-windows-msvc.zip`
  - `linux-x64` → `*-x86_64-unknown-linux-gnu.tar.gz` (musl 폴백 가능)
  - `linux-arm64` → `*-aarch64-unknown-linux-gnu.tar.gz`
- SHA256 검증: 자산의 `.sha256` 동반 파일 또는 GitHub asset `digest`(`sha256:...`) 사용.
- 추출: tar.gz(내장 `tar`/스트림) 또는 zip(`yauzl`, 기존 `extractRuntimeFilesFromZip` 재사용 패턴) → `<userData>/bin/llmfit[.exe]`.
- 실행 권한: POSIX 에서 `chmod 0o755`.
- 멱등: 이미 설치되어 있고 버전/해시 일치 시 재다운로드 skip.
- 모든 단계 격리: 실패 시 throw 하지 않고 `{ installed:false, reason }`; 부팅 비차단(R6.5).

### C5. IPC 채널 (신규/기존)
- `LLMFIT_GET_RECOMMENDATIONS` → `llmfitService.recommend(opts)` (구현 완료).
- `LLMFIT_INSTALL` / `LLMFIT_STATUS` → `llmfitInstaller.ensureInstalled()/getStatus()`.
- `EMBEDDING_MODEL_STATUS` / `EMBEDDING_MODEL_DOWNLOAD` → embeddingModelService + modelDownloader.
- 기존 `MEMORY_GET_EMBEDDING_STATUS`로 의미 검색 게이트 노출(이미 존재).
- shared/ipc/channels.ts + preload + handler 동시 등록(프로젝트 규칙).

### C7. 부트스트랩 + 온보딩 (R7)
- 기존 `startupReadinessService` + startup wizard window 재사용.
- 부트스트랩 단계에서 `llmfitInstaller.ensureInstalled()`를 비차단으로 시도(실패해도 wizard 진행).
- 온보딩 wizard 단계(렌더러 라우트 `startup-wizard`):
  1. **Luie 소개** — 앱이 무엇인지/RAG·캔버스·그래프 개요.
  2. **Local LLM/임베딩 설치** — llmfit 추천 모델 카드(~10) + 임베딩 모델 상태/설치. 건너뛰기 가능(FTS-only).
  3. **완료** — `STARTUP_COMPLETE_WIZARD` 호출 → Main Window 진입.
- 비차단 단계(모델/ llmfit)는 startup readiness 의 `blocking:false` 체크로 모델링하거나 온보딩 UI 자체 상태로 관리.

### C6. 렌더러 설정/온보딩 UI (`features/settings`, startup wizard)
- "AI 모델" 탭에 하드웨어 추천 섹션(카드 ~10개): 적합도 배지(완벽/좋음/빠듯), 예상 속도, 필요 메모리.
- 선택 → 다운로드 진행률 → 완료 시 활성.
- 생성/임베딩 모델 상태 카드 분리 표기.
- 의미 검색 상태 인디케이터(준비됨/준비중/비활성) — `MEMORY_GET_EMBEDDING_STATUS` + 임베딩 모델 존재로 산출.
- 온보딩(startup wizard)에서 동일 컴포넌트를 재사용해 첫 실행 설치 경험을 제공(R7).

## Data Models

기존 스키마 재사용. 변경 없음(컬럼 이미 존재):
- `ProjectSettings.llmEmbeddingModelPath`, `llmEmbeddingDimension`, `llmProviderHint`.
- `MemoryEmbedding.model`(signature), `dimension`(벡터 길이) — 모델 변경 시 자동 재임베딩.

신규 영속 상태(설정 파일 settings.json):
- `llm.defaultEmbeddingModelPath`, `llm.defaultEmbeddingModelId`.

## Error Handling

- **llmfit 실패**: 자식 프로세스 비정상 종료/타임아웃/파싱 실패 → `{ available:false }` 반환, 앱 영향 0(R3.5).
- **임베딩 sidecar 크래시(R2.1)**: 매니저 상태만 stopped, `embed()`는 null 반환 → 임베딩 잡 `skipped`/`pending` 재시도. 검색은 FTS 폴백(R2.3).
- **자동 재시작(R2.4)**: 임베딩 요청 시 sidecar 미가동이면 lazy 재기동. 연속 실패 시 백오프(예: 1s→5s→30s) + 최대 시도 횟수 후 일시 비활성.
- **차원 변경(R1.4)**: signature 불일치로 자동 재임베딩(기존 로직). 추가로 부팅 시 stale 정리 옵션.

## Memory Optimization (R5)

- 임베딩 전용 소형 모델(별 프로세스) → 백그라운드 임베딩이 생성 모델(대형)을 핀하지 않음.
- 두 sidecar 독립 idle 타이머: 채팅 종료 후 생성 모델은 idle unload, 임베딩만 필요 시 상주.
- 임베딩 sidecar도 자체 idle unload(임베딩 잡 없으면 내려감).

## Testing Strategy

- **단위(node:sqlite/순수함수)**: llmfit JSON 파서(정상/누락필드/깨진 JSON/바이너리 없음), 임베딩 signature/차원 변경 재임베딩 트리거.
- **격리 테스트**: 임베딩 sidecar 크래시 시 `embed()` null 반환 + 검색 FTS 폴백 동작(목 provider).
- **회귀**: 기존 searchService/embeddingProjector 테스트 유지. 임베딩 미설정 시 FTS-only 정상.
- **수동 검증**: 클린 상태 → 임베딩 모델 다운로드 → 청크 임베딩 생성 → 의미 검색 결과 반환. AI 프로세스 강제 종료 → 앱 생존 + FTS 폴백.

## Rollout / Compatibility

- 기존 사용자: 임베딩 모델 미설치 시 그대로 FTS-only(무회귀). 모델 설치 후 점진적 백그라운드 임베딩.
- 롤백: 임베딩 모델 경로 비우면 임베딩 sidecar 미기동 → FTS-only로 회귀.

## Correctness Properties

### Property 1: 프로세스 격리
어떤 AI 프로세스(생성/임베딩 sidecar, utility process) 종료도 main/renderer를 종료시키지 않는다.
**Validates: Requirements 2.1**

### Property 2: 폴백 가용성
임베딩 미가용(모델 없음/sidecar 다운) 시 `searchChunks`는 항상 FTS(+LIKE) 결과를 반환하고 throw 하지 않는다.
**Validates: Requirements 1.2, 2.3**

### Property 3: 차원 안전
벡터 검색은 `dimension = queryVec.length` 조건으로 필터하므로, 모델 변경으로 차원이 달라진 stale 벡터는 검색에 섞이지 않는다.
**Validates: Requirements 1.4**

### Property 4: 재임베딩 수렴
임베딩 모델 signature가 바뀌면 모든 변경 청크가 재임베딩 대상이 되어, 충분한 틱 후 전 청크가 새 모델로 수렴한다.
**Validates: Requirements 1.4, 1.5**

### Property 5: 메모리 분리
백그라운드 임베딩만 활성인 동안 생성 모델 프로세스는 idle unload되어 상주하지 않는다.
**Validates: Requirements 5.1, 5.2**

### Property 6: llmfit 무해성
llmfit 실행/설치의 성공/실패/부재 어느 경우에도 추천 조회 외 앱 기능에 영향이 없다.
**Validates: Requirements 3.5, 6.5**

### Property 7: 부팅 비차단
llmfit 설치/모델 설치 실패는 온보딩·부팅을 막지 않으며, 사용자는 건너뛰고 Main Window 로 진입할 수 있다.
**Validates: Requirements 6.5, 7.4**

