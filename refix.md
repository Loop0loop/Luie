# Phase 1-5 Refix Plan

## 목적

Phase 6로 넘어가기 전에 Phase 1-5 구현을 코드 품질 기준으로 다시 정리한다.

검증 기준:

- 코드가 클린한가
- 중앙화가 제대로 되었는가
- 아키텍처 문서와 실제 코드가 일관적인가
- 도메인은 SPA 중심으로 관리되는가
- try/fallback/error path가 명확한가
- Electron main/preload/renderer 제약을 지키는가

## 현재 확인된 사실

- `pnpm run check:source-loc` 실패. 현재 4개 파일이 500 LOC를 초과한다.
- `pnpm run check:ipc-contract-map` 실패. 실행 중 `docs/quality/ipc-contract-map.json`이 재생성되었고 drift가 생겼다.
- `pnpm run check:ipc-handler-schemas` 통과.
- `pnpm run check:preload-contract-regression` 통과.
- `pnpm run check:core-complexity` 통과.
- `pnpm run check:renderer-store-usage` 통과.
- `bun run rebuild:electron` 통과. Electron ABI 대상 better-sqlite3 rebuild 완료.
- `pnpm rebuild better-sqlite3` 통과. Node/Vitest ABI 대상 better-sqlite3 rebuild 완료.
- 지정 파일 ESLint는 통과:
  - `src/main/services/features/memory/jobControl.ts`
  - `src/main/handler/search/ipcSearchHandlers.ts`
  - `src/main/handler/memory/ipcMemoryHandlers.ts`
  - `src/main/handler/system/dbMaintenance/index.ts`
  - `src/renderer/src/features/research/stores/analysis/analysisStore.actions.ts`
  - `src/renderer/src/features/research/components/analysisSection/review/queue/useMemoryReviewQueues.ts`

## 기준 아키텍처

사실:

- 현재 실사용 도메인 기준은 `src/main/services` 아래의 `core`, `world`, `features`, `io`, `llm` 축이다.
- `src/main/services/index.ts`는 main service 공개 진입점이다.
- 목표 아키텍처 문서의 `src/main/domains/**`는 compatibility entry로 일부 쓰이고 있지만, Phase 1-5 refix 기준은 현재 services 구조를 우선한다.
- renderer는 현재 `src/renderer/src/features/**` feature-first SPA 구조다.

판단:

- Phase 1-5 refix는 대량 파일 이동이 아니라, 현재 services/feature 구조 안에서 도메인 entry와 책임 경계를 회복하는 방식으로 진행해야 한다.
- `src/main/services/features/memory`는 하위 폴더별 `index.ts`가 거의 없어서 내부 구현 파일 직접 import가 늘고 있다. 이 부분은 중앙화 실패에 가깝다.

## 아키텍처 훼손 지점

### 1. Memory job control이 한 파일에 과집중됨

대상:

- `src/main/services/features/memory/jobControl.ts`

상태:

- 완료.
- `target label` DB 조회 책임을 `src/main/services/features/memory/job/targetLabels.ts`로 분리했다.
- progress DTO 타입을 `src/main/services/features/memory/job/progressTypes.ts`로 분리했다.
- `jobControl.ts`는 828 LOC에서 493 LOC로 축소되어 `check:source-loc` 500 LOC 기준 아래로 내려왔다.
- `jobControl.ts`에서 chapter/scene/note/synopsis/plot/character/faction/event/scrapMemo/memoryChunk schema 직접 import를 제거했다.
- 검증:
  - `pnpm exec eslint src/main/services/features/memory/jobControl.ts src/main/services/features/memory/job/targetLabels.ts src/main/services/features/memory/job/progressTypes.ts` 통과.
  - `pnpm run typecheck` 통과.
  - `pnpm run check:source-loc`에서 `jobControl.ts` 항목 제거 확인.
  - `pnpm vitest tests/main/services/memory/memoryBuildJobControl.test.ts`는 로컬 `better-sqlite3` Node ABI 불일치로 suite 초기화 실패. `SKIP_DB_TEST_SETUP=1`은 이 DB 의존 suite에 부적합하다.

사실:

- 기존 확인 시 828 LOC였고, refix 후 493 LOC.
- job 상태 전이, claim/cancel/recover, progress aggregation, retry/backoff attention, process memory snapshot cache, target label DB 조회를 한 파일이 모두 담당한다.
- chapter, scene, note, synopsis, plot, character, faction, event, scrapMemo, memoryChunk schema를 직접 import한다.

문제:

- job control이 memory job 상태 machine을 넘어 UI 표시 label과 여러 도메인 DB 조회까지 알고 있다.
- target type 하나를 추가할 때 job state machine 파일을 수정해야 한다.
- 아키텍처 문서의 파일당 500 LOC 원칙과 맞지 않는다.

수정 방향:

- `src/main/services/features/memory/job/` 또는 `src/main/services/features/memory/jobControl/` 하위로 분리한다.
- 후보:
  - `stateMachine.ts`: pause/resume/cancel/claim/finalize/recover
  - `progressRepository.ts`: status/jobType/targetType/targetId aggregation query
  - `targetLabels.ts`: chapter/scene/note/world target label 조회
  - `attention.ts`: retry/backoff/cancel_requested/recovered marker 계산
  - `snapshotCache.ts`: progress snapshot TTL cache
  - `index.ts`: public export

삭제/축소:

- `jobControl.ts`는 public compatibility export만 남기거나 200 LOC 이하 facade로 축소한다.

### 2. Search IPC handler가 memory domain까지 흡수함

대상:

- `src/main/handler/search/ipcSearchHandlers.ts`
- `src/main/handler/index.ts`

상태:

- 완료.
- memory IPC 등록을 `src/main/handler/memory/ipcMemoryHandlers.ts`로 분리했다.
- memory handler 의존성 타입은 `src/main/handler/memory/types.ts`로 분리해 새 파일도 500 LOC 기준 아래로 유지했다.
- `src/main/handler/memory/index.ts`를 추가해 memory handler 공개 등록 진입점을 만들었다.
- DB integrity/migration health IPC는 `src/main/handler/system/dbMaintenance/index.ts`로 이동했다.
- `registerAllIPCHandlers`는 search, memory, system DB maintenance를 각각 별도 도메인 등록으로 호출한다.
- `ipcSearchHandlers.ts`는 567 LOC에서 50 LOC로 축소되어 search/search-index 채널만 등록한다.
- 검증:
  - `pnpm exec eslint src/main/handler/search/ipcSearchHandlers.ts src/main/handler/search/index.ts src/main/handler/memory/ipcMemoryHandlers.ts src/main/handler/memory/types.ts src/main/handler/memory/index.ts src/main/handler/system/dbMaintenance/index.ts src/main/handler/system/index.ts src/main/handler/index.ts src/main/services/features/memory/index.ts` 통과.
  - `pnpm run typecheck` 통과.
  - `pnpm run check:ipc-handler-schemas` 통과.
  - `pnpm run check:source-loc`에서 `ipcSearchHandlers.ts` 항목 제거 확인. 잔여 8개 파일은 아직 초과 상태.
  - `pnpm run check:ipc-contract-map`은 drift로 실패. 채널 등록 파일 경로 변경에 따라 `docs/quality/ipc-contract-map.json` 재생성 반영이 필요하다.

사실:

- 기존 확인 시 `ipcSearchHandlers.ts`는 567 LOC였고, refix 후 50 LOC.
- 기존에는 search, search index, memory rebuild, memory query, review backlog, conflict queue, episode/fact/entity review, stale evidence repair, eval/calibration, chunk window, summary/embedding status, build job control, DB integrity check까지 등록했다.
- refix 후 memory IPC는 `handler/memory`, DB maintenance IPC는 `handler/system/dbMaintenance`, search IPC는 `handler/search`에 있다.
- `src/main/handler/index.ts`는 `narrativeMemoryQueryService`와 `getNarrativeSummaryStatus`를 `../services/features/memory/index.js`에서 import한다.

문제:

- handler 도메인 이름은 `search`인데 실제 책임은 memory application API 대부분이다.
- main handler는 orchestration만 해야 하는데 package persistence side effect wrapper도 갖고 있다.
- `persistPackageAfterMutation`이 handler에 있으므로 IPC 외부에서 같은 service mutation을 호출하면 package persistence가 누락될 수 있다.

수정 방향:

- 현재 구조 기준으로 `src/main/handler/memory/`를 추가한다.
- `registerSearchHandlers`에서 memory 채널을 분리해 `registerMemoryHandlers`로 옮긴다.
- `src/main/services/features/memory/index.ts`를 만들어 memory public service entry를 제공한다.
- `src/main/handler/index.ts`는 memory service를 직접 파일 경로가 아니라 memory domain entry에서 import한다.

삭제/축소:

- `ipcSearchHandlers.ts`에서 `MEMORY_*` 등록을 제거하고 search/search-index/chunk-search 정도만 남긴다.
- DB integrity/migration health가 search handler에 남아 있으면 system/dbMaintenance handler로 이동한다.

### 3. Memory service 공개 진입점이 약함

대상:

- `src/main/services/index.ts`
- `src/main/services/features/memory/**`

상태:

- 부분 완료.
- `src/main/services/features/memory/index.ts`를 추가했다.
- 현재 public entry는 IPC handler에서 필요한 `jobControl`, `narrativeMemoryQueryService`, `getNarrativeSummaryStatus`를 우선 export한다.
- `src/main/handler/index.ts`와 `src/main/handler/memory/ipcMemoryHandlers.ts`는 memory 내부 구현 파일 대신 `features/memory/index.js`를 import한다.
- 하위 public entry(`query/index.ts`, `summary/index.ts`, `job/index.ts` 등)는 아직 남아 있다.

사실:

- `src/main/services/index.ts`는 일부 memory projector/extractor/review service만 직접 export한다.
- `memory/query`, `memory/eval`, `memory/repair`, `memory/review`, `memory/benchmark`, `memory/jobControl`은 루트 공개 entry 없이 개별 파일 import가 많다.
- `src/main/services/features/memory` 하위에서 `index.ts`는 `projection/internal` 수준에만 존재한다.

문제:

- 도메인 내부 파일이 외부에서 직접 참조되면서 내부/공개 API 경계가 흐려진다.
- SPA 중심 도메인 관리와 비슷하게 main도 domain entry를 통해 공개 API를 고정해야 한다.

수정 방향:

- `src/main/services/features/memory/index.ts` 추가.
- 하위 public entry 후보:
  - `benchmark/index.ts`
  - `query/index.ts`
  - `eval/index.ts`
  - `review/index.ts`
  - `repair/index.ts`
  - `summary/index.ts`
  - `temporal/index.ts`
  - `entity/index.ts`
  - `episode/index.ts`
  - `persistence/index.ts`
  - `job/index.ts`
- 외부 import는 가능한 `features/memory/index.ts` 또는 하위 도메인 `index.ts`로 제한한다.

상의 필요:

- scripts/tests가 내부 함수까지 직접 검증하는 패턴은 유지할지, public entry 중심으로 바꿀지 결정해야 한다.

### 4. Analysis renderer store가 여러 SPA 도메인 책임을 가짐

대상:

- `src/renderer/src/features/research/stores/analysis/analysisStore.actions.ts`
- `src/renderer/src/features/research/stores/analysis/analysisStore.ts`

상태:

- 부분 완료.
- `AnalysisActions`, `AnalysisSet`, `AnalysisGet` 등 store action 타입을 `src/renderer/src/features/research/stores/analysis/analysisStore.types.ts`로 분리했다.
- RAG chat send/stop 및 stream listener cleanup을 `src/renderer/src/features/research/stores/analysis/actions/ragChatActions.ts`로 분리했다.
- `analysisStore.actions.ts`는 기존 export 계약을 유지하도록 `AnalysisActions` 타입과 `cleanUpRagStreamListeners`를 re-export한다.
- `analysisStore.actions.ts`는 639 LOC에서 460 LOC로 축소되어 `check:source-loc` 500 LOC 기준 아래로 내려왔다.
- 검증:
  - `pnpm exec eslint src/renderer/src/features/research/stores/analysis/analysisStore.actions.ts src/renderer/src/features/research/stores/analysis/analysisStore.types.ts src/renderer/src/features/research/stores/analysis/actions/ragChatActions.ts src/renderer/src/features/research/stores/analysis/analysisStore.ts` 통과.
  - `pnpm run typecheck` 통과.
  - `pnpm run check:source-loc`에서 `analysisStore.actions.ts` 항목 제거 확인. 잔여 7개 파일은 아직 초과 상태.
  - `SKIP_DB_TEST_SETUP=1 pnpm vitest tests/renderer/analysisConflictResolution.test.ts tests/renderer/analysisMemoryReviewWorkflow.test.ts` 통과.
  - DB setup을 켠 동일 테스트는 로컬 `better-sqlite3` Node ABI 불일치로 suite 초기화 실패.

사실:

- 기존 확인 시 `analysisStore.actions.ts`는 639 LOC였고, refix 후 460 LOC.
- 기존에는 analysis stream, RAG chat stream, narrative summary status, conflict queue, fact/episode/entity/alias review, stale evidence review/repair를 모두 담당했다.
- refix 후 RAG chat stream lifecycle은 `actions/ragChatActions.ts`가 담당한다.

문제:

- SPA feature 내부에서도 review queue, chat, runtime analysis가 한 action 파일로 엮여 있다.
- queue별 loading/error/mutating 패턴이 반복된다.
- 변경 범위가 커지고 DOM test가 store 구현 세부에 의존한다.

수정 방향:

- `src/renderer/src/features/research/stores/analysis/actions/` 하위로 분리한다.
- 후보:
  - `analysisStreamActions.ts`
  - `ragChatActions.ts`
  - `summaryStatusActions.ts`
  - `conflictQueueActions.ts`
  - `memoryReviewActions.ts`
  - `staleEvidenceActions.ts`
  - `listenerLifecycle.ts`
  - `index.ts`

삭제/축소:

- `analysisStore.actions.ts`는 action 조립 facade만 남긴다.

### 5. Review queue hook이 native prompt를 직접 사용함

대상:

- `src/renderer/src/features/research/components/analysisSection/review/queue/useMemoryReviewQueues.ts`

사실:

- reject reason과 stale evidence reviewer note를 `window.prompt`로 받는다.
- 다른 화면들은 DialogProvider 기반 `dialog.confirm`/`dialog.prompt` 패턴을 쓰는 곳이 있다.

문제:

- SPA UI 상태와 접근성, 검증, 취소 UX가 브라우저 native prompt에 묶인다.
- Electron renderer UX 일관성이 깨진다.

수정 방향:

- DialogProvider 기반 modal/form으로 교체한다.
- reject reason 필수 여부, 빈 문자열 처리, 취소 처리를 component state로 명시한다.

삭제/축소:

- `window.prompt` 직접 호출 제거.

### 6. Benchmark runner가 품질 검증 도구치고 과대함

대상:

- `src/main/services/features/memory/benchmark/memoryBenchmarkLatencyRunner.ts`

상태:

- 완료.
- `memoryBenchmarkLatencyRunner.ts`를 thin orchestration 파일로 축소했다.
- 타입/예산은 `src/main/services/features/memory/benchmark/latency/types.ts`로 분리했다.
- duration/memory/sqlite 공통 측정 유틸은 `src/main/services/features/memory/benchmark/latency/statistics.ts`로 분리했다.
- chunk search/candidate cap/cache probe/optimization mode 비교는 `src/main/services/features/memory/benchmark/latency/chunkSearchMeasurements.ts`로 분리했다.
- RAG path/vector probe/writer-flow query 측정은 `src/main/services/features/memory/benchmark/latency/ragPathMeasurements.ts`로 분리했다.
- `memoryBenchmarkLatencyRunner.ts`는 978 LOC에서 220 LOC로 축소되어 `check:source-loc` 500 LOC 기준 아래로 내려왔다.
- 기존 외부 import 계약은 `memoryBenchmarkLatencyRunner.ts`의 type re-export로 유지했다.
- 검증:
  - `pnpm exec eslint src/main/services/features/memory/benchmark/memoryBenchmarkLatencyRunner.ts src/main/services/features/memory/benchmark/latency/types.ts src/main/services/features/memory/benchmark/latency/statistics.ts src/main/services/features/memory/benchmark/latency/chunkSearchMeasurements.ts src/main/services/features/memory/benchmark/latency/ragPathMeasurements.ts` 통과.
  - `pnpm run typecheck` 통과.
  - `pnpm vitest tests/main/services/memory/benchmark/memoryBenchmarkLatencyRunner.test.ts tests/main/services/memory/eval/memoryEvalCaseMaterialization.test.ts` 통과.
  - `pnpm run check:source-loc`에서 `memoryBenchmarkLatencyRunner.ts` 항목 제거 확인. 잔여 5개 파일은 아직 초과 상태.

사실:

- 기존 확인 시 978 LOC였고, refix 후 220 LOC.
- 기존에는 type 정의, latency 측정, candidate cap 비교, cache probe, vector probe, writer-flow query 측정, report/assessment 조립을 모두 담당했다.

문제:

- Phase 4 성능 검증의 신뢰도가 이 파일에 집중된다.
- 도구 코드라도 정책/측정/report가 한 파일이면 다음 benchmark 확장이 위험하다.

수정 방향:

- `benchmark/latency/` 하위로 분리한다.
- 후보:
  - `types.ts`
  - `budgets.ts`
  - `measureSearch.ts`
  - `measureRagPath.ts`
  - `candidateCapComparison.ts`
  - `cacheProbe.ts`
  - `vectorProbe.ts`
  - `writerFlowQueries.ts`
  - `report.ts`
  - `index.ts`

삭제/축소:

- 기존 파일은 compatibility export 또는 thin runner로 축소.

### 7. NarrativeMemoryQueryService가 query facade 이상을 담당함

대상:

- `src/main/services/features/memory/query/narrativeMemoryQueryService.ts`

상태:

- 부분 완료.
- eval suite, intent calibration, episode calibration, review backlog, evidence repair, stale evidence review application 흐름을 `src/main/services/features/memory/query/narrativeMemoryApplicationFacades.ts`로 분리했다.
- `NarrativeMemoryQueryService`의 public method 계약은 유지하고, 내부 구현만 helper에 위임했다.
- `narrativeMemoryQueryService.ts`는 512 LOC에서 432 LOC로 축소되어 `check:source-loc` 500 LOC 기준 아래로 내려왔다.
- 검증:
  - `pnpm exec eslint src/main/services/features/memory/query/narrativeMemoryQueryService.ts src/main/services/features/memory/query/narrativeMemoryApplicationFacades.ts` 통과.
  - `pnpm run typecheck` 통과.
  - `pnpm vitest tests/main/services/memory/query/narrativeMemoryQueryService.test.ts` 통과.
  - `pnpm vitest tests/main/handler/ipcInputValidation.memory.test.ts` 통과.
  - `pnpm run check:source-loc`에서 `narrativeMemoryQueryService.ts` 항목 제거 확인. 잔여 4개 파일은 아직 초과 상태.

사실:

- 기존 확인 시 512 LOC였고, refix 후 432 LOC.
- 기존에는 query routing, eval suite runner, intent calibration, episode calibration, conflict queue, review backlog, repair, episode/fact/entity/alias mutation facade, stale evidence review를 함께 가졌다.
- refix 후 eval/calibration/review backlog/repair/stale evidence application 흐름은 `narrativeMemoryApplicationFacades.ts`가 담당한다.

문제:

- 이름은 query service지만 실제로는 memory application facade다.
- Phase 3/5 review workflow와 Phase 1/2 eval/calibration이 query service에 결합되어 있다.

수정 방향:

- query와 review/eval/calibration facade를 분리한다.
- 후보:
  - `query/narrativeMemoryQueryService.ts`: 질문 routing/query only
  - `review/memoryReviewApplicationService.ts`: review queue/mutation facade
  - `eval/memoryEvalApplicationService.ts`: eval/calibration facade
  - `memoryApplicationService.ts`: handler에 주입할 facade 조립

삭제/축소:

- `NarrativeMemoryQueryService`에서 review/eval/calibration mutation method 제거.

### 8. Memory eval materialization이 taxonomy template까지 포함함

대상:

- `src/main/services/features/memory/eval/memoryEvalCaseMaterialization.ts`

상태:

- 완료.
- writer pain point template, seed row 타입, question builder, case name builder를 `src/main/services/features/memory/eval/memoryEvalCaseMaterializationTemplates.ts`로 분리했다.
- `memoryEvalCaseMaterialization.ts`는 530 LOC에서 454 LOC로 축소되어 `check:source-loc` 500 LOC 기준 아래로 내려왔다.
- 검증:
  - `pnpm exec eslint src/main/services/features/memory/eval/memoryEvalCaseMaterialization.ts src/main/services/features/memory/eval/memoryEvalCaseMaterializationTemplates.ts` 통과.
  - `pnpm run typecheck` 통과.
  - `pnpm vitest tests/main/services/memory/benchmark/memoryBenchmarkLatencyRunner.test.ts tests/main/services/memory/eval/memoryEvalCaseMaterialization.test.ts` 통과.
  - `pnpm run check:source-loc`에서 `memoryEvalCaseMaterialization.ts` 항목 제거 확인. 잔여 5개 파일은 아직 초과 상태.

사실:

- 기존 확인 시 `memoryEvalCaseMaterialization.ts`는 530 LOC였고, refix 후 454 LOC.
- 기존에는 eval case materialization 로직과 writer pain point taxonomy template/question builder가 한 파일에 있었다.

문제:

- eval case 생성 흐름과 taxonomy text template 변경이 같은 파일에 묶여 있었다.
- taxonomy key 추가/삭제 시 materialization persistence 로직까지 같이 수정하게 된다.

수정 방향:

- taxonomy template과 builder는 별도 파일에서 관리한다.
- materialization 파일은 DB 조회, 중복 확인, transaction insert/repair 흐름만 담당한다.

## 공통 상수 위치 원칙

현재 판단:

- cross-process contract로 renderer/main/preload가 함께 알아야 하는 값은 `src/shared/constants` 또는 `src/shared/types`/`schemas`가 맞다.
- main-only policy 값은 해당 domain 내부에 둔다.
- renderer-only UI label/sizing/polling 정책은 renderer feature 내부에 둔다.

상의 필요:

- `memory build job status`, `job type`, `target type`은 shared DTO와 renderer UI가 함께 쓰므로 shared type/constant 후보.
- `MAX_JOB_ATTEMPTS`, retry backoff, cancellation stale threshold, progress snapshot TTL은 main-only policy에 가깝다. `src/main/services/features/memory/job/policy.ts` 후보.
- benchmark budget은 CLI/report contract라서 main memory benchmark domain 내부 상수로 유지하되, 문서 출력 schema와 맞춰야 한다.
- review action 문자열(`defer`, `reject`, `resolve`)은 IPC schema와 renderer가 함께 쓰므로 shared schema/type에서 관리하는 것이 맞다.

## 삭제 또는 정리 후보

기능 삭제가 아니라 책임 제거/compatibility shim 축소 기준이다.

- `src/main/handler/search/ipcSearchHandlers.ts`
  - memory/review/job/eval/dbMaintenance channel 등록 제거.
- `src/main/services/features/memory/jobControl.ts`
  - facade 또는 re-export로 축소.
- `src/main/services/features/memory/benchmark/memoryBenchmarkLatencyRunner.ts`
  - thin runner 또는 re-export로 축소.
- `src/renderer/src/features/research/stores/analysis/analysisStore.actions.ts`
  - action composer만 남김.
- `src/renderer/src/features/research/components/analysisSection/review/queue/useMemoryReviewQueues.ts`
  - prompt responsibility 제거.
- `docs/architecture/current-main.md`, `docs/architecture/migration-guardrails.md`, `docs/architecture/migration-map.md`
  - 현재 LOC/구조 사실 갱신 필요.

## 검증 게이트

Refix 후 최소 검증:

```bash
pnpm run check:source-loc
pnpm run check:ipc-contract-map
pnpm run check:ipc-handler-schemas
pnpm run check:preload-contract-regression
pnpm run check:renderer-store-usage
pnpm run check:core-complexity
pnpm run typecheck
```

도메인별 targeted test 후보:

```bash
pnpm vitest tests/main/services/memory/memoryBuildJobControl.test.ts
pnpm vitest tests/main/handler/ipcInputValidation.memory.test.ts
pnpm vitest tests/main/services/memory/query/narrativeMemoryQueryService.test.ts
pnpm vitest tests/dom/conflictQueuePanelWriterFlow.test.tsx
pnpm vitest tests/renderer/analysisMemoryReviewWorkflow.test.ts
pnpm vitest tests/main/services/memory/benchmark/memoryBenchmarkLatencyRunner.test.ts
```

## 현재 작업 중 주의

- `check:ipc-contract-map` 실행으로 `docs/quality/ipc-contract-map.json`이 수정된 상태다.
- 이 파일은 drift 반영으로 커밋할지, refix 이후 다시 생성할지 결정해야 한다.
- 지금 단계에서 임의 revert하지 않는다.
