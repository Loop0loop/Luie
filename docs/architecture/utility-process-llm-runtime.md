# Utility Process and LLM Runtime Architecture

이 문서는 Luie의 utility process, sidecar, LLM provider 경계를 다시 정의합니다.

핵심 목표는 단순히 "로컬 LLM을 띄우기"가 아닙니다. 목표는 LLM 실행 실패, 모델 서버 crash, 긴 HTTP/SSE 처리, 임베딩 작업이 Electron main process와 renderer SPA를 같이 망가뜨리지 않게 failure domain을 분리하는 것입니다.

## Critical Review of the Previous Draft

이전 문서의 방향은 맞았지만 세부 아키텍처가 느슨했습니다.

문제:

- `LlmRuntimeOrchestrator -> UtilityProcessBridge -> LlmUtilityWorker -> SidecarSupervisor` 흐름은 좋아 보이지만, 누가 runtime을 "결정"하고 누가 runtime을 "실행 가능하게 materialize"하는지가 불명확했습니다.
- `SidecarSupervisor` 위치가 모호했습니다. main에 있어도 되는 것처럼 읽혔지만, local model-serving sidecar는 utility process 내부에서 관리해야 Electron main이 LLM failure domain 밖에 남습니다.
- remote provider와 local sidecar를 모두 "provider"로 표현해 provider 선택과 execution backend 선택이 계속 섞였습니다.
- explicit route 실패 시 fallback 금지는 적었지만, `auto` fallback과 explicit failure를 구현상 어떻게 분리할지 부족했습니다.
- 현재 코드의 추가 위험인 "main에서 직접 local embedding sidecar를 띄울 수 있는 경로"를 충분히 다루지 않았습니다.
- 마이그레이션 순서가 큰 리팩터링 중심이라, 첫 구현에서 깨질 수 있는 public API와 테스트 경계를 충분히 고정하지 않았습니다.

이 재작성본의 결정:

```text
main = route planning, settings, IPC, utility lifecycle
utility process = LLM task execution, provider clients, local sidecar supervision
sidecar OS process = model-serving runtime
renderer = route 선택과 상태 표시
```

## Source Baseline

사실:

- Electron 공식 Process Model은 utility process를 crash-prone component, CPU intensive task, untrusted service를 main process 밖에 두는 용도로 설명합니다.  
  <https://www.electronjs.org/docs/latest/tutorial/process-model>
- Electron `utilityProcess.fork()`는 main process에서 호출하며, Node.js와 MessagePort가 활성화된 Chromium child process를 생성합니다.  
  <https://www.electronjs.org/docs/latest/api/utility-process>
- Node.js child process는 parent와 별도 메모리 및 별도 V8 인스턴스를 갖습니다.  
  <https://nodejs.org/api/child_process.html>
- Electron security checklist는 IPC sender validation과 process boundary 방어를 권장합니다.  
  <https://www.electronjs.org/docs/latest/tutorial/security>

해석:

- Electron utility process는 main process에서 crash-prone 작업을 빼는 1차 격리입니다.
- local model server는 utility process 안에서 in-process로 돌리면 안 됩니다. 별도 OS process여야 합니다.
- sidecar supervisor가 main에 있으면 LLM failure handling 책임이 main으로 되돌아옵니다. supervisor는 utility process 쪽에 있어야 합니다.

## Phase 0 Baseline Findings

처음 조사 시점의 RAG 흐름:

```text
renderer AnalysisSection
  -> preload api.rag.ask
  -> main UtilityProcessBridge.askRagQa
  -> Electron utility process
  -> utility/rag/ragQaWorker
  -> services/llm/modelRuntimeFactory
  -> provider or main sidecarManager
```

처음 조사 시점의 주요 파일:

| 파일 | 현재 책임 | 문제 |
| --- | --- | --- |
| `src/main/services/features/utility/utilityProcessBridge.ts` | utility process lifecycle, request/response, RAG event forwarding | sidecar start timeout이 ask timeout bucket과 섞임 |
| `src/main/utility/process/utilityProcessMain.ts` | utility entry, protocol validation, DB bootstrap, RAG dispatch, embedding dispatch, sidecar spawn | 한 파일에 protocol과 worker dispatch와 sidecar supervisor가 섞임 |
| `src/main/utility/rag/ragQaWorker.ts` | RAG execution, runtime resolve, streaming events | main 공용 `modelRuntimeFactory` 직접 import |
| `src/main/services/llm/modelRuntimeFactory.ts` | settings/env read, provider selection, cache, sidecar start, embedding runtime resolve | 책임 과다, process-aware 아님 |
| `src/main/services/llm/sidecarManager.ts` | main sidecar facade, utilityProcessBridge proxy | utility 내부에서 import되면 경계 역류 |
| `src/main/services/llm/embeddingSidecarManager.ts` | embedding llama-server spawn | main/utility 어디서 호출되는지에 따라 process ownership이 달라짐. 현재는 삭제됨 |
| `src/main/services/llm/providers/*` | provider HTTP clients | settings/sync dependency가 provider 내부로 새어 있음 |

Phase 0 baseline `modelRuntimeFactory` route order:

```text
auto: sidecar -> gemini -> openai -> ollama -> deterministic
explicit provider: [preferred, ...defaultOrderWithoutPreferred]
```

Phase 0 baseline 문제:

- `preferredProvider=sidecar`여도 sidecar 실패 후 Gemini/OpenAI/Ollama로 넘어갈 수 있습니다.
- `GEMINI_API_KEY`, `GOOGLE_API_KEY`, 저장된 `geminiApiKey` 중 하나가 있으면 sidecar 실패 후 Gemini가 선택되기 쉽습니다.
- `resolveRuntimeModelInfo()`는 최종 provider만 반환하고, 어떤 provider가 왜 skip됐는지 반환하지 않습니다.
- utility process에서 `modelRuntimeFactory`를 사용하면 main-only sidecar proxy를 로드할 수 있는 간접 경로가 생겼습니다.
- local generation sidecar와 local embedding sidecar의 supervisor 경계가 다릅니다.

현재 상태 요약:

- utility RAG worker는 main `modelRuntimeFactory`를 직접 import하지 않습니다.
- explicit provider route는 fail-closed입니다. explicit `sidecar` 실패가 Gemini/OpenAI로 자동 fallback되지 않습니다.
- local generation/embedding sidecar spawn은 utility supervisor로 수렴했습니다.
- main `embeddingSidecarManager.ts`는 삭제됐고, barrel/domain export도 제거했습니다.
- provider HTTP client는 settings/sync dependency를 직접 import하지 않습니다.
- 남은 내용은 Phase별 guard/future hardening 항목에 분리했습니다.

현재 진행 상태:

- Phase 1/2에서 explicit route는 fail-closed, auto route는 `sidecar -> openai -> gemini -> ollama` 순서로 변경했습니다.
- Phase 2/3에서 main이 serialized `RuntimeRoutePlan`을 만들고 `ragQa.ask`, `embedding.embed` payload에 inline으로 포함합니다.
- Phase 3에서 utility RAG worker는 main `modelRuntimeFactory` 대신 utility `RuntimeMaterializer`를 사용합니다.
- Phase 4 일부를 앞당겨 generation sidecar supervisor를 `src/main/utility/llm/sidecarSupervisor.ts`로 추출했습니다.

현재 guardrail 상태:

- `scripts/check-utility-process-boundary.mjs`는 `src/main/utility/**`의 main `UtilityProcessBridge`, main `sidecarManager`, Electron main-only API 직접 import를 금지합니다.
- 확실하지 않습니다: 이 guard만으로 import graph의 간접 의존을 전부 막지는 못합니다.
- 사실: Phase 3에서 `src/main/utility/rag/ragQaWorker.ts -> src/main/services/llm/modelRuntimeFactory.ts -> src/main/services/llm/sidecarManager.ts -> utilityProcessBridge` 간접 경로는 제거했습니다.
- 사실: utility materializer는 `ExternalApiProvider`/`GeminiProvider`를 재사용하지만, provider client의 settings/sync direct import는 제거됐습니다. `tests/main/services/providerClientBoundary.test.ts`가 이 boundary를 고정합니다.

추정:

- "전부 Gemini로 된다"는 체감은 sidecar 실패가 관측되지 않고 `auto` 또는 explicit fallback 정책으로 Gemini가 선택되는 흐름일 가능성이 높습니다.
- utility process가 불안정하게 느껴지는 원인은 utility 내부에서 main 공용 LLM resolver를 재사용하는 구조와 관련될 가능성이 있습니다.

## Architecture Decision

결정:

```text
LLM route selection != runtime materialization
provider != execution backend
explicit route != auto fallback
main supervision != utility-side model supervision
```

정의:

| 용어 | 의미 |
| --- | --- |
| route | 사용자가 요청한 논리 경로. `auto`, `sidecar`, `openai`, `gemini`, `ollama` |
| provider | API protocol/client 종류. OpenAI-compatible, Gemini, deterministic |
| backend | 실행 위치. `local-sidecar`, `remote-http`, `test` |
| materialization | route config를 실제 사용 가능한 client/baseUrl/process로 만드는 단계 |
| sidecar | local model-serving OS process. 현재 구현체는 `llama-server`지만 이름은 sidecar |
| utility worker | RAG/embedding/LLM task를 main 밖에서 실행하는 Node utility process |

제품 정책:

- 기본 로컬 런타임은 `sidecar`입니다.
- `sidecar`의 현재 구현체는 앱이 관리하는 `llama-server` OS process입니다.
- `ollama`는 일반 사용자 기본 경로가 아니라 외부 Ollama 설치/실행/모델 pull을 이미 관리하는 사용자를 위한 advanced provider입니다.
- UI는 `Sidecar`를 Local 그룹에, `Ollama`를 Advanced 그룹에 표시해야 합니다.
- `auto` route에서 Ollama는 마지막 fallback 후보로만 남깁니다. Ollama 설치를 제품 기본 전제로 삼지 않습니다.

## Target Process Boundary

목표 흐름:

```text
renderer SPA
  -> preload capability API
  -> main IPC handler
  -> RuntimeRoutePlanner
  -> UtilityProcessBridge
  -> utility LlmTaskWorker
  -> utility RuntimeMaterializer
  -> utility SidecarSupervisor
  -> sidecar OS process
```

main은 route를 계획하지만 local sidecar를 직접 시작하지 않습니다.

utility process는 route plan을 받아 실제 client를 만듭니다.

sidecar OS process는 utility process의 child입니다.

### Main Process

책임:

- settings/env를 읽어 `RuntimeRoutePlan`을 만듭니다.
- explicit/auto fallback policy를 결정합니다.
- utility process lifecycle을 관리합니다.
- renderer로 structured runtime status와 errors를 전달합니다.
- DB write, IPC response envelope, app shutdown을 관리합니다.

금지:

- local model-serving process를 직접 spawn하지 않습니다.
- RAG generation과 embedding generation을 main event loop에서 수행하지 않습니다.
- `ExternalApiProvider`/`GeminiProvider`로 장시간 stream generation을 직접 수행하지 않습니다.

### Utility Process

책임:

- RAG QA, embedding, long-running LLM task를 실행합니다.
- route plan을 `RuntimeMaterializer`로 materialize합니다.
- remote provider HTTP/SSE 호출을 수행합니다.
- local sidecar OS process를 `SidecarSupervisor`로 관리합니다.
- stream/error/status event를 parent에 보고합니다.

금지:

- `BrowserWindow`, `app`, `ipcMain`을 import하지 않습니다.
- main `UtilityProcessBridge`를 import하지 않습니다.
- main `sidecarManager`를 import하지 않습니다.
- settings store를 직접 mutate하지 않습니다.

### Sidecar OS Process

책임:

- OpenAI-compatible HTTP endpoint를 제공합니다.
- 모델 메모리와 native runtime crash를 Electron process 밖에 둡니다.

금지:

- renderer/main state와 직접 통신하지 않습니다.
- sidecar process가 죽었다고 main process가 같이 죽으면 안 됩니다.

## Runtime Route Plan

main이 utility에 넘길 최소 계약:

```ts
type RuntimeRoutePlan = {
  requestId: string;
  selection: {
    requested: "auto" | "sidecar" | "openai" | "gemini" | "ollama";
    mode: "explicit" | "auto";
  };
  candidates: RuntimeCandidate[];
  fallbackPolicy: "fail-closed" | "try-next";
};

type RuntimeCandidate =
  | {
      kind: "sidecar";
      backend: "local-sidecar";
      modelPath: string;
      binaryPath: string;
      options: { gpuLayers?: number; contextSize?: number };
    }
  | {
      kind: "openai";
      backend: "remote-http";
      baseUrl: "https://api.openai.com/v1";
      apiKey: string;
      model: string;
      embeddingModel?: string;
    }
  | {
      kind: "gemini";
      backend: "remote-http";
      apiKey: string;
      model: string;
      alternativeModel?: string;
      embeddingModel?: string;
    }
  | {
      kind: "ollama";
      backend: "remote-http";
      baseUrl: string;
      model: string;
      embeddingModel?: string;
      apiKey?: string;
    };
```

주의:

- `RuntimeRoutePlan`은 serializable해야 합니다.
- secret은 utility process env/log로 누출하지 않습니다.
- main은 route candidates만 만들고, sidecar health check는 utility에서 수행합니다.

## Fallback Policy

현재는 explicit 선택과 auto fallback이 섞여 있습니다. 목표는 아래처럼 분리합니다.

| requested | fallbackPolicy | 실패 동작 |
| --- | --- | --- |
| `sidecar` | `fail-closed` | sidecar 실패를 renderer에 반환. Gemini fallback 금지 |
| `openai` | `fail-closed` | OpenAI 실패 반환. Gemini/Ollama fallback 금지 |
| `gemini` | `fail-closed` | Gemini 실패 반환 |
| `ollama` | `fail-closed` | Ollama 실패 반환 |
| `auto` | `try-next` | candidate 순서대로 시도. skip reason 필수 기록 |

`auto` 기본 후보 순서:

```text
sidecar -> openai -> gemini -> ollama -> deterministic
```

의견:

- 기존 `sidecar -> gemini -> openai -> ollama`는 Gemini env가 있는 개발 환경에서 sidecar 문제를 숨기기 쉽습니다.
- OpenAI/Gemini 순서는 제품 정책 결정입니다. 확실하지 않습니다. 다만 현재 사용자가 "Gemini로 다 된다"를 문제로 보고 있으므로, 최소한 skipped reason을 보여주기 전까지 Gemini 우선 fallback은 피하는 편이 낫습니다.

## Runtime Status Contract

현재 타입:

```ts
interface LlmRuntimeInfo {
  provider: "gemini" | "openai" | "ollama" | "sidecar" | "deterministic";
  model: string;
  alternativeModel?: string | null;
}
```

문제:

- requested route와 resolved route를 구분하지 않습니다.
- fallback 사용 여부를 알 수 없습니다.
- skip reason이 없습니다.
- sidecar unavailable 상태를 표현할 수 없습니다.

목표 타입:

```ts
type RuntimeProvider = "sidecar" | "openai" | "gemini" | "ollama" | "deterministic";

type RuntimeStatus = {
  requestedProvider: "auto" | RuntimeProvider;
  resolvedProvider: RuntimeProvider | "unavailable";
  backend: "local-sidecar" | "remote-http" | "test" | null;
  model: string | null;
  fallbackUsed: boolean;
  ready: boolean;
  skipped: Array<{
    provider: RuntimeProvider;
    code: RuntimeErrorCode;
    message: string;
  }>;
};
```

error code:

```text
PROVIDER_NOT_CONFIGURED
SIDECAR_NOT_CONFIGURED
SIDECAR_BINARY_MISSING
SIDECAR_MODEL_MISSING
SIDECAR_SPAWN_FAILED
SIDECAR_HEALTH_TIMEOUT
SIDECAR_EXITED
REMOTE_PROVIDER_UNAUTHORIZED
REMOTE_PROVIDER_TIMEOUT
REMOTE_PROVIDER_RATE_LIMITED
REMOTE_PROVIDER_BAD_RESPONSE
UTILITY_PROCESS_UNAVAILABLE
```

renderer 표시는 최종 provider만 보여주면 안 됩니다.

```text
Requested: sidecar
Resolved: unavailable
Reason: SIDECAR_HEALTH_TIMEOUT
Fallback: disabled
```

```text
Requested: auto
Resolved: openai
Skipped: sidecar SIDECAR_HEALTH_TIMEOUT
Fallback: used
```

## Utility Protocol

현재 protocol은 `ragQa.ask`, `embedding.embed`, `sidecar.start`, `sidecar.stop`이 같은 request union 안에 있습니다.

목표:

```text
runtime.plan         main -> utility, route plan 전달
ragQa.ask           main -> utility, plan id 또는 inline plan 포함
embedding.embed     main -> utility, plan id 또는 inline plan 포함
runtime.status      main -> utility, materialized runtime 상태 조회
sidecar.status      main -> utility, sidecar 상태 조회
sidecar.stop        main -> utility, sidecar 중지
```

timeout bucket:

| method | timeout |
| --- | --- |
| `ping` | 5s |
| `ragQa.ask` run handle | 20s |
| RAG stream watchdog | 180s 이상, provider별 조정 |
| `embedding.embed` | batch size에 따라 30s 이상 |
| `sidecar.start` | health timeout보다 긴 별도 값. 예: 45s |
| `sidecar.stop` | 5s |

주의:

- `sidecar.start`는 RAG ask timeout bucket을 타면 안 됩니다.
- `sidecar.status`는 start를 유발하면 안 됩니다.
- `runtime.status`도 기본적으로 start를 유발하지 않아야 합니다. UI 상태 조회가 모델을 로드하면 UX와 디버깅이 나빠집니다.

## Sidecar Supervisor

위치:

```text
src/main/utility/llm/sidecarSupervisor.ts
```

상태:

```text
stopped
starting
running
stopping
crashed
cooldown
```

public API:

```ts
type SidecarSupervisor = {
  ensureStarted(config: SidecarConfig): Promise<SidecarReady>;
  stop(reason: string): Promise<void>;
  status(): SidecarStatus;
};
```

필수 규칙:

- 같은 binary/model/options면 기존 process를 재사용합니다.
- 다른 config면 기존 process를 stop한 뒤 새 process를 시작합니다.
- health check 실패와 spawn 실패를 구분합니다.
- process `exit`는 `SIDECAR_EXITED`로 기록하고 running 상태를 즉시 정리합니다.
- crash loop는 cooldown으로 제한합니다.
- stderr는 bounded buffer로만 보관합니다.
- `stdio`는 backpressure로 startup을 막지 않게 관리합니다.
- app quit는 main shutdown -> utility shutdown -> supervisor stop 순서로 처리합니다.

현재 코드에서 옮길 대상:

- `src/main/utility/process/utilityProcessMain.ts`의 `UtilitySidecarManager`
- generation sidecar path
- embedding sidecar path 중 local model server supervision

## Provider Clients

목표:

- provider client는 순수 HTTP client여야 합니다.
- provider client는 settings store를 읽지 않습니다.
- provider client는 sync token refresh를 직접 수행하지 않습니다.
- provider client는 secret을 log하지 않습니다.

현재 문제:

- `ExternalApiProvider`와 `GeminiProvider`가 Supabase proxy, sync token, settings dependency를 직접 가집니다.
- packaged proxy path가 non-streaming 응답을 한 번에 yield할 수 있어 RAG first-token timeout과 충돌할 수 있습니다.

목표:

```text
RuntimeMaterializer
  -> builds ProviderClientConfig
  -> injects proxy config/token if needed
  -> creates provider client
```

## Embedding Policy

현재 embedding path는 더 엄격히 봐야 합니다.

문제:

- `embeddingProjector`는 main에서 `utilityProcessBridge.embed()`를 사용합니다.
- `searchService` 등 main service가 `resolveEmbeddingRuntimeClient()`를 직접 호출할 수 있습니다.
- `resolveEmbeddingRuntimeClient()`는 호출 process에 따라 local embedding sidecar를 main에서 spawn할 수도, utility에서 spawn할 수도 있습니다.

목표:

- local embedding도 utility process를 통해서만 수행합니다.
- main service는 local embedding client를 직접 materialize하지 않습니다.
- query embedding이 필요하면 utility에 `embedding.embed` 요청을 보냅니다.
- remote embedding도 long-running/batch 작업이면 utility로 보냅니다.

예외:

- deterministic/test embedding은 main에서 허용할 수 있습니다.
- 작은 remote health check는 main에서 허용할 수 있지만 generation/embedding batch는 금지합니다.

## Naming Rules

금지:

```text
llama(sidecar)
provider=sidecar
model=llama-server
```

권장:

```text
route=sidecar
backend=local-sidecar
implementation=llama-server
model=<actual model file or model id>
```

UI:

```text
Sidecar
Local isolated runtime
```

로그:

```text
route: sidecar
backend: local-sidecar
implementation: llama-server
modelPath: redacted/base name only
```

## Migration Plan

### Phase 0: Guardrails

- 정적 검사 추가: `src/main/utility/**`에서 main `utilityProcessBridge`, main `sidecarManager`, Electron main-only API 직접 import 금지.
- 테스트 추가: boundary analyzer가 direct forbidden imports를 잡는지 확인.
- 현재 남아 있는 간접 import graph violation을 이 문서에 명시합니다.
- docs/llm의 Ollama-only 계획과 local sidecar 계획 충돌을 명시적으로 정리합니다.
- 다음 Phase 진입 조건: utility RAG worker가 main `modelRuntimeFactory`를 직접 import하지 않도록 분리 계획을 구현합니다.

### Phase 1: Runtime Status First

- `RuntimeStatus` 타입을 추가하되 기존 `LlmRuntimeInfo`와 호환 adapter를 둡니다.  
  진행: `LlmRuntimeInfo`에 `requestedProvider`, `resolvedProvider`, `backend`, `fallbackUsed`, `ready`, `skipped`를 optional field로 추가했습니다.
- `resolveRuntimeModelInfo()`는 compatibility wrapper로 유지합니다.  
  진행: 기존 `provider`, `model`, `alternativeModel` shape를 유지하면서 새 status field를 함께 반환합니다.
- explicit sidecar route는 status/config 조회에서 cloud로 fallback하지 않는 테스트를 먼저 추가합니다.  
  진행: `tests/main/services/modelRuntimeFactory.sidecar.test.ts`에 explicit sidecar가 설정되지 않았을 때 Gemini fallback 금지 테스트를 추가했습니다.
- auto fallback은 skipped reason을 기록하는 테스트를 추가합니다.  
  진행: status/config 조회에서는 not-configured skip만 계산하고, materialization failure skip은 utility 실행 단계에서만 발생합니다.

향후 개선:

- RAG/UI error code mapping은 utility protocol error와 renderer message를 더 구조화할 여지가 있습니다.

### Phase 2: Route Planning Split

- `modelRuntimeFactory`에서 settings/env candidate 생성과 provider client 생성을 분리합니다.
- main에는 `RuntimeRoutePlanner`만 둡니다.
- `RuntimeRoutePlanner`는 sidecar를 start하지 않습니다.
- `ragQa.ask`와 `embedding.embed` 요청에 route plan을 포함합니다.

진행:

- `src/main/services/llm/runtimeRoutePlanner.ts`를 추가했습니다.
- `RuntimeRoutePlanner`는 requested provider, fallback policy, 후보 순서, configured candidate, not-configured skip을 순수하게 계산합니다.
- `RuntimeRoutePlan` serializable type을 `src/shared/types/llmRuntime.ts`로 이동했습니다.
- remote 후보는 utility가 materialize할 수 있도록 `apiKey`, `model`, `baseUrl`, `embeddingModel`을 plan candidate에 포함합니다.
- `modelRuntimeFactory`는 route order와 fail-closed/try-next 정책을 planner에서 받아 사용합니다.
- `modelRuntimeFactory.resolveRuntimeModelInfo()`와 `resolveRuntimeModelConfig()`는 route plan만 보고 결정합니다. 이 조회 경로는 `sidecarManager.ensureStarted()`를 호출하지 않습니다.
- `UtilityProcessBridge.askRagQa()`와 `UtilityProcessBridge.embed()`는 renderer 입력을 그대로 utility에 넘기지 않고, main에서 만든 inline route plan을 붙여 보냅니다.
- `UtilityProcessBridge.generateText()`도 main에서 만든 inline route plan을 utility에 붙여 보냅니다.
- main `modelRuntimeFactory`의 client materialization 함수는 제거됐고, route/status/config planning surface만 남았습니다.

유지해야 할 guard:

- route plan에 secret이 포함되므로 parent/utility protocol log에서 plan payload를 그대로 출력하면 안 됩니다.

### Phase 3: Utility Materializer

- `src/main/utility/llm/runtimeMaterializer.ts`를 추가합니다.
- `ragQaWorker`는 main `modelRuntimeFactory`를 import하지 않습니다.
- utility materializer는 route plan을 받아 provider client를 생성합니다.
- sidecar candidate는 utility `SidecarSupervisor.ensureStarted()`를 통해 baseUrl을 얻습니다.

진행:

- `src/main/utility/llm/runtimeMaterializer.ts`를 추가했습니다.
- `src/main/utility/rag/ragQaWorker.ts`는 더 이상 main `modelRuntimeFactory`를 import하지 않습니다.
- explicit sidecar text-generation materialization failure는 utility materializer에서 fail-closed로 throw합니다.
- explicit sidecar embedding materialization failure도 deterministic fallback으로 숨기지 않고 fail-closed로 throw합니다.
- auto route는 plan order에 따라 candidate를 시도하고, materialize 가능한 remote candidate로 fallback합니다.
- utility materializer는 provider client 구현을 재사용하지만, provider client는 settings/sync dependency를 직접 import하지 않습니다.

향후 개선:

- materializer error를 `RuntimeStatus`/structured error code로 parent에 더 세분화해 보고할 수 있습니다.

### Phase 4: Sidecar Supervisor Extraction

- `UtilitySidecarManager`를 `src/main/utility/llm/sidecarSupervisor.ts`로 이동합니다.
- `sidecar.start` timeout을 별도 상수로 분리합니다.
- `sidecar.status` protocol을 추가합니다.
- crash/cooldown 상태 event를 parent로 전달합니다.

진행:

- generation sidecar supervisor를 `src/main/utility/llm/sidecarSupervisor.ts`로 추출했습니다.
- `src/main/utility/process/utilityProcessMain.ts`는 추출된 `utilitySidecarSupervisor`를 사용합니다.
- `REQUEST_TIMEOUT_SIDECAR_START_MS=45_000`를 추가해 `sidecar.start`를 `ragQa.ask` timeout bucket에서 분리했습니다.
- `sidecar.status` utility protocol과 `UtilityProcessBridge.getSidecarStatus()`를 추가했습니다. status 조회는 sidecar start를 유발하지 않습니다.
- supervisor status model을 `stopped | starting | running | stopping | crashed | cooldown`으로 확장했습니다.
- `sidecar.status` pushed event를 추가했습니다. utility process는 chat/embedding supervisor의 상태 변화를 parent bridge로 전송합니다.
- parent bridge는 chat sidecar의 `crashed`/`cooldown` 이벤트를 현재 진행 중인 RAG run error로 연결합니다.
- crash loop backoff를 추가했습니다. 반복 실패는 `5s -> 10s -> 20s ... max 60s` cooldown으로 제한하고, status payload에 `failureCount`를 포함합니다.
- `SIDECAR_STATUS_CHANGED` renderer event를 추가했습니다. utility-to-main sidecar status event는 main bridge에서 renderer로 broadcast됩니다.
- stderr bounded buffer는 status payload의 `diagnostic`으로 제한 노출합니다. 절대경로/사용자 경로는 `<path>`로 redaction하고 최대 500자 tail만 제공합니다.
- `lastError`와 utility stderr debug log도 같은 redaction을 통과합니다.

### Phase 5: Embedding Unification

- local embedding sidecar supervision을 utility supervisor로 통합합니다.
- main direct `resolveEmbeddingRuntimeClient()` 호출을 줄이고 utility bridge를 사용합니다.
- search query embedding도 local path에서는 utility로 보냅니다.

진행:

- `searchService.searchChunks()`의 query embedding 경로를 `resolveEmbeddingRuntimeClient()`에서 `utilityProcessBridge.embed()`로 변경했습니다.
- `embeddingProjector`와 `searchService`는 둘 다 utility process를 통해 embedding batch를 요청합니다.
- `tests/main/services/searchServiceEmbeddingBoundary.test.ts`로 search query embedding이 main runtime materialization을 다시 import하지 않는지 고정했습니다.
- utility `RuntimeMaterializer`는 sidecar route와 bundled/downloaded bge-m3 모델이 있으면 `utilityEmbeddingSidecarSupervisor`로 local embedding sidecar를 materialize합니다.
- main `modelRuntimeFactory.resolveEmbeddingRuntimeClient()`에서 local `embeddingSidecarManager` spawn 경로를 제거한 뒤, 함수 자체도 삭제했습니다.
- `src/main/services/llm/embeddingSidecarManager.ts`를 삭제하고 `src/main/services/llm/index.ts` public export도 제거했습니다.
- `src/main/domains/analysis/index.ts`의 `resolveEmbeddingRuntimeClient` re-export를 제거해 main compatibility API가 domain surface로 퍼지지 않게 했습니다.
- `modelRuntimeFactory.resolveEmbeddingRuntimeClient()` 함수 자체를 제거했습니다. embedding materialization은 utility `RuntimeMaterializer` 경로로만 유지합니다.
- `tests/main/services/mainEmbeddingBoundary.test.ts`로 main factory/barrel/domain이 local embedding sidecar manager를 다시 노출하지 않는지 고정했습니다.

진행:

- `chapterSummaryProjector`의 LLM-derived summary generation을 `utilityProcessBridge.generateText()`로 전환했습니다.
- `llm.generateText` utility protocol을 추가했습니다. main은 route plan만 만들고, utility process가 runtime materialization과 text generation을 수행합니다.
- main `modelRuntimeFactory.resolveModelRuntimeClient()` 함수와 domain re-export를 제거했습니다.
- `tests/main/services/mainEmbeddingBoundary.test.ts`로 background summary generation이 main `modelRuntimeFactory`를 다시 import하지 않도록 고정했습니다.

### Phase 6: Provider Cleanup

- `ExternalApiProvider`, `GeminiProvider`에서 settings/sync imports를 제거합니다.
- Supabase proxy config/token은 materializer가 주입합니다.
- packaged non-streaming proxy는 별도 timeout policy로 처리합니다.

진행:

- `ExternalApiProvider`, `GeminiProvider`에서 `settingsManager`, `ensureSyncAccessToken`, `getSupabaseConfig`, `isAppPackaged` 직접 import를 제거했습니다.
- Supabase proxy는 main `modelRuntimeFactory`가 `runtimeProxyConfig.ts` resolver로 계산한 뒤 route candidate에 직렬화합니다.
- `tests/main/services/providerClientBoundary.test.ts`로 provider client가 settings/sync dependency를 다시 import하지 않는지 고정했습니다.
- Supabase proxy provider는 `generationMode="buffered"`로 표시하고, RAG worker는 buffered runtime에 first-token watchdog 대신 total generation timeout을 적용합니다.
- Supabase proxy capability는 main route planning 시 candidate에 직렬화해 붙입니다. utility materializer는 `runtimeProxyConfig`, settings, sync token dependency를 import하지 않고 candidate capability만 resolver로 감쌉니다.

유지해야 할 guard:

- proxy capability가 route plan payload에 포함되므로 plan payload logging 금지 guard를 계속 유지해야 합니다.

### Phase 7: UI Naming and Observability

- `AnalysisSection`의 `llama(sidecar)` 표현을 제거합니다.
- Runtime UI는 requested/resolved/fallback/skipped reason을 표시합니다.
- logs는 route/backend/implementation을 분리합니다.

진행:

- `AnalysisSection` route select에서 `llama(sidecar)` 표현을 `Sidecar`로 변경했습니다.
- `AnalysisSection` route select에서 `Sidecar`는 Local, OpenAI/Gemini는 Cloud, Ollama는 Advanced 그룹으로 분리했습니다.
- `AnalysisSection`은 explicit `sidecar` 선택 시 modelPath/binaryPath가 모두 있어야 하고, explicit `ollama` 선택 시 baseUrl/chatModel이 있어야 설정 안내로 이동합니다.
- Runtime UI는 `requestedProvider`, `resolvedProvider`, `backend`, `fallbackUsed`, `skipped`를 표시합니다.
- Runtime UI는 `RuntimeStatusPanel`로 분리해 requested/resolved/backend/model/fallback/skipped/sidecar status를 한 곳에서 표시합니다.
- Runtime UI는 `settings.getSidecarStatus()`로 utility supervisor의 `stopped | starting | running | stopping | crashed | cooldown` 상태를 표시합니다.
- Runtime UI는 `settings.onSidecarStatusChanged()` push event로 sidecar 상태 변화를 갱신합니다.
- Runtime UI는 sidecar `lastError` 원문을 직접 표시하지 않고 상태 요약만 표시합니다.
- LLM/utility 로그는 `route`, `backend`, `implementation` 필드를 사용합니다. sidecar 로그는 사용자 경로 대신 파일명 수준의 label만 기록합니다.
- `tests/renderer/analysisRuntimeStatus.test.ts`로 runtime status UI 문구와 필드 사용을 고정했습니다.

향후 개선:

- `RuntimeStatusPanel`을 별도 파일로 분리하면 `AnalysisSection` 크기를 더 줄일 수 있습니다.
- logs 전반의 route/backend/implementation 명칭 정리는 LLM 경계 외 전체 서비스까지 확장할 수 있습니다.

## Verification Checklist

기존 관련 테스트:

```bash
SKIP_DB_TEST_SETUP=1 bun vitest \
  tests/main/services/searchServiceEmbeddingBoundary.test.ts \
  tests/main/services/providerClientBoundary.test.ts \
  tests/main/services/utilitySidecarSupervisor.test.ts \
  tests/main/services/utilityRuntimeMaterializer.test.ts \
  tests/main/services/modelRuntimeFactory.sidecar.test.ts \
  tests/main/services/modelRuntimeFactory.utilityBoundary.test.ts \
  tests/main/services/sidecarManager.test.ts \
  tests/main/services/utilityProcessBridgeProtocol.test.ts \
  tests/main/services/mainEmbeddingBoundary.test.ts \
  tests/renderer/analysisRuntimeStatus.test.ts
```

현재 테스트로 고정한 항목:

```text
explicit sidecar materialization failure does not fallback to gemini
explicit openai failure does not fallback to gemini
runtime status/config lookup does not start sidecar
runtime status reports requested/resolved/fallbackUsed/skipped
utility RAG worker does not import main UtilityProcessBridge
utility RAG worker does not import main sidecarManager
sidecar.start timeout is greater than utility health timeout
sidecar.status does not start sidecar
sidecar.status event contract is present
local embedding path goes through utility process
main embedding sidecar manager is not exposed
main background summary generation goes through utility process
background summary generation falls back when utility LLM generation fails
packaged proxy non-streaming response is not aborted by first-token timeout
renderer can display sidecar status directly when a UI surface is added
crash loop backoff escalates after repeated sidecar failures
utility-to-main sidecar status event is forwarded as renderer push event
utility materializer does not import main sync proxy dependencies
stderr bounded buffer is exposed safely without leaking full paths
sidecar lastError is redacted before status exposure
explicit sidecar embedding failure fails closed
```

수동 검증 필요:

```text
packaged app run must confirm Activity Monitor process ownership for chat, embedding, and summary generation
```

수동 검증:

```text
1. Gemini/OpenAI env가 있는 상태에서 requestedProvider=sidecar
2. sidecar binaryPath를 깨뜨림
3. RAG 실행
4. 기대: fallbackUsed=false, resolvedProvider=unavailable, SIDECAR_BINARY_MISSING 또는 SIDECAR_SPAWN_FAILED
5. requestedProvider=auto
6. 같은 상태로 RAG 실행
7. 기대: fallbackUsed=true, skipped에 sidecar reason 기록, 다음 provider 사용
8. Activity Monitor에서 모델 서버가 Electron main이 아니라 utility child로 뜨는지 확인
9. sidecar process kill
10. 기대: renderer에 SIDECAR_EXITED, Electron main process 생존
```

## Non-Goals

- 지금 당장 Ollama-only로 단순화하지 않습니다.
- 지금 당장 llama-server 구현체를 제거하지 않습니다.
- 지금 당장 모든 analysis 기능을 utility로 이전하지 않습니다.
- 지금 당장 public renderer API shape를 깨지 않습니다.

## Final Decision

사실:

- Phase 1/2 이후 `modelRuntimeFactory`의 explicit provider와 auto fallback은 분리되어 있습니다.
- Phase 3 이후 utility RAG worker는 main 공용 LLM resolver를 직접 사용하지 않습니다.
- 현재 문서 기준으로 확인된 main-side LLM runtime materialization debt는 코드상 제거됐습니다.
- 아직 증거가 부족합니다: packaged app에서 chat, embedding, summary generation의 실제 OS process ownership은 수동 검증이 필요합니다.

의견:

- 이 구조는 부분 수정으로 계속 덧대면 디버깅 비용이 더 커집니다.
- 첫 번째 구현 목표는 sidecar 자체 개선이 아니라 runtime decision observability와 fail-closed policy입니다.
- sidecar supervisor는 utility process 내부 소유로 확정해야 합니다.

결론:

```text
explicit route = fail closed
auto route = fallback allowed with visible skipped reasons
main = route planning only
utility = runtime materialization and LLM task execution
sidecar OS process = model-serving failure domain
provider client = resolved-config-only HTTP client
```
