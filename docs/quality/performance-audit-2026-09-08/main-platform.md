# Luie main / lifecycle / utility / OS 성능 감사

작성일: 2026-09-08. 소스 수정 없음. 조사 범위: main bootstrap, lifecycle, window manager, utility bridge, utility entry, sidecar supervisor/materializer/providers, derived job scheduling, logger, 파일 기록 공통 유틸, native rebuild와 배포/성능 테스트 경계. SQL 인덱스/쿼리 세부는 DB 담당, renderer/preload는 다른 담당 결과와 병합해야 한다.

## 판정

**Risky.** utility process 분리, single flight, 저장 안전장치, lazy startup 등 이미 유효한 기반이 있다. 그러나 비동기 API라는 이유로 main의 동기 SQLite 작업이 분리되지는 않으며, timeout이 실행 취소로 이어지지 않는다. 실제 source mock으로 sidecar readiness race, provider token cache 오류, readiness TTL 즉시 만료를 재현했다. OS/아키텍처별 기능과 배포/검증 범위도 일치하지 않는다.

현재 package.json Electron 44.2.0, better-sqlite3 13.0.3, pnpm 11.25.0. AGENTS snapshot Electron 40과 다르다. 기존 out/main/index.js는 현재 src/main/index.ts와 일치하지 않는다: out에는 whenReady 시 utility 시작이 있고 현재 src는 요청 시 lazy 시작이다. 기존 out/profile 산출물로 현재 소스 성능을 단정할 수 없다.

## 검증한 것

- 저장소 및 src/main AGENTS 읽음. 부모가 graph MCP 미제공을 확인한 후 scoped rg/read로 조사했다.
- `SKIP_DB_TEST_SETUP=1 node node_modules/vitest/vitest.mjs run tests/main/services/utilitySidecarSupervisor.test.ts tests/main/services/utilityProcessBridgeProtocol.test.ts tests/main/services/startupReadinessService.test.ts tests/main/lifecycle/appReadyDeferredWorker.test.ts tests/main/lifecycle/shutdownLifecycleSafety.test.ts tests/main/lifecycle/deferredStartupMaintenance.test.ts tests/main/manager/windowChrome.test.ts`
- 결과: **7 파일, 20 테스트 통과, 595ms**. mock/source-text 테스트이므로 실 OS 성능 인증이 아니다.
- `/private/tmp/luie-main-probes.cjs`는 현재 TS source를 메모리에서 transpile하고 Electron/DB/프로세스/네트워크를 mock한다. `node /private/tmp/luie-main-probes.cjs` 결과 3가지 결함 재현 assert 통과.
- 실제 Electron 앱, 사용자 DB/설정, llama-server, native rebuild, 설치/배포는 실행하지 않았다. 새 파일은 /private/tmp의 보고서와 probe뿐이다.

## 상세 발견

### M01 — P1: utility timeout 이후 작업이 계속 살아 있고 admission/backpressure가 없다

- 위치: `src/main/services/features/utility/utilityProcessBridge/internal/core.ts:333`–347, 특히 341–346. `src/main/utility/process/utilityProcessMain.ts:246`–305. `src/main/utility/llm/textGeneration.ts:49`. `src/main/services/features/llm/providers/externalApiProvider.ts:131`–147.
- 실제 흐름: derived summary / episode / temporal / narrative 작업 → utilityProcessBridge.generateText → request timeout 180초 → main pending map 삭제와 reject만 수행. utility는 요청별 async IIFE를 제한 없이 실행한다. generateUtilityText는 provider.generate에 signal을 전달하지 않는다. external provider fetch 역시 기본 deadline 없이 options.signal만 사용한다.
- embedding은 provider fetch 자체 30초 제한이 있지만 materialization(model cold load) 후에 그 제한이 시작되고 bridge도 별도로 30초 제한이므로 bridge timeout 뒤 작업이 남을 수 있다. cold load health timeout 30초가 request 30초 budget을 거의 소모한다. caller는 embeddingProjector.ts:249이며 검색도 bridge.embed를 사용한다.
- 영향: 느린/멈춘 remote stream, 동시에 실행하는 background projection과 사용자 RAG, 재시도 시 종료되지 않은 작업/문자열/연결이 겹친다. `--parallel 1` sidecar 위에 무제한 요청을 쌓을 수 있고, timeout 반환을 성공적인 cancellation으로 오해하게 된다. RSS/CPU/지연 증가 가능; 증가량은 실측하지 않았다.
- 최소 수정: 기존 requestId로 cancel 전파, utility request AbortController registry, finally 제거; 배치/생성의 동시 실행 수와 대기 수에 한도; 사용자 foreground 우선/중복 derived job 병합. status/stop/shutdown은 compute 대기열과 분리. ModelRuntimeClient의 이미 존재하는 signal을 연결한다.
- 추가 관련: utilityProcessMain.ts:249는 sidecar.status/stop 및 rag.stop조차 db+cache ensureReady 이후 처리한다. DB 초기화/lock에 control request가 지연될 수 있다. DB가 필요 없는 control 분기를 먼저 처리하면 된다.
- 검증: fake never-ending provider를 요청 timeout/취소 후 abort 관측; 100개 동시 요청에서 inflight/queue 상한 유지 및 foreground 요청 우선; cold embed startup을 포함한 deadline 검증.

### M02 — P1: provider cache가 갱신된 Supabase 인증 정보를 무시한다

- 위치: `src/main/utility/llm/runtimeMaterializer.ts:67`–77, 93–106, 124–137. `src/main/services/features/llm/modelRuntimeFactory.ts:18`–20, 47, 148–153, 168–172.
- 실제 흐름: main이 매번 새 runtime route plan과 Supabase proxy accessToken을 전송 → utility singleton key는 baseURL/model/embeddingModel/apiKey만 비교 → packaged apiKey는 고정 placeholder → 기존 provider 반환 → supabaseProxy resolver는 최초 candidate closure의 이전 token/URL/error 유지.
- 영향: token refresh/relogin/계정 또는 proxy config 변경 후에도 utility 재시작 전까지 이전 credential로 생성 요청. 만료 인증 실패 반복과 background retry 부하. 오래 유지되는 process 캐시가 correctness를 깬다.
- 증거: source-based mock에서 old-token plan 후 refreshed-token plan을 전달했으나 동일 provider, resolver 결과 old-token임을 assert 확인. Gemini key도 동일 구조다.
- 최소 수정: 무거운 모델 자체가 아닌 가벼운 HTTP wrapper이므로 proxy 후보는 재생성하거나 cache hit에도 최신 resolver를 갱신한다. 비밀을 긴 cache key/log에 추가할 필요 없다. 현재 invalidateModelRuntimeCache는 no-op이라 이것만 호출해선 해결 안 된다.
- 검증: 같은 모델·placeholder key에서 token/URL/초기 proxy 오류→정상 설정을 변경하는 테스트.

### M03 — P2: 기존 사용자의 첫 창이 여전히 전체 readiness 검사에 묶인다

- 위치: `src/main/lifecycle/app-ready/appReady.ts:312`–318, 342–355. `src/main/services/features/startup/startupReadinessService.ts:139`–155, 223–240, 400–409.
- trigger: 위저드를 이미 완료한 사용자의 재시작. `getReadiness()` 전체 완료 뒤 startMainWindowFlow를 호출한다. checkSupabaseSession은 결과상 non-blocking인데 Promise.all completion에는 blocking이다. 네트워크 5초 제한에 main thread `better-sqlite3.pragma('integrity_check')` 전체 스캔이 겹친다.
- 영향: 첫 창이 늦고 큰 DB integrity scan 동안 main의 IPC/창 이벤트가 멈출 수 있다. 처음 위저드가 필요한 경로만 cheap gate→창 먼저로 개선되어 있다. Promise.all은 synchronous SQLite를 병렬 CPU 실행하지 않는다.
- 최소 수정: DB 연결/쓰기 가능 여부 같은 필수 최소 게이트와 full integrity/remote session 검사를 분리; 창 shell 먼저 생성하고 완료 상태 반영; full integrity는 비정상 종료/마이그레이션/명시 진단에 맞춰 worker/utility로 이동. SQLite durability 자체를 낮추지 않는다.
- 검증: completedAt가 있고 네트워크 5초 지연/차단 상태에서 첫 창 시점 측정, 큰 synthetic DB에서 event-loop delay 측정. 기존 appReadyDeferredWorker 테스트는 소스 문자열 순서만 검사해 이 경로를 보증하지 않는다.

### M04 — P2: readiness TTL을 완료가 아닌 시작 시각에 계산한다

- 위치: `src/main/services/features/startup/startupReadinessService.ts:64`–75, 78, 94–97.
- trigger: full checks가 5초 이상 걸릴 때; fetch timeout+DB integrity 검사라는 실제 경로가 있다.
- 영향: computeReadiness(now)의 now는 검사 시작 시각이며 expiry=now+5000이다. 검사 결과가 반환되자마자 cache가 이미 만료될 수 있어 renderer IPC/completeWizard의 다음 호출이 full DB/네트워크 검사를 재실행한다.
- 증거: source-based fake clock에서 6초 걸리는 runChecks 뒤 즉시 getReadiness 재호출 → runChecks 2회 assert.
- 최소 수정: cache 저장 시 `Date.now() + TTL`. 설정 mutation 무효화 정책은 유지.
- 검증: 검사 시간>TTL인 fake clock 회귀 테스트 한 개.

### M05 — P2: sidecar가 health-ready 전에 running으로 노출된다

- 위치: `src/main/utility/llm/sidecarSupervisor.ts:130`–135, 225–227.
- trigger: cold local runtime으로 동시에 두 요청. 첫 요청 doStart는 spawn 직후 state=running으로 두고 health fetch를 기다린다. 두 번째 ensureStarted는 startingPromise 검사보다 앞선 running/configKey 일치 분기로 baseUrl을 반환한다.
- 영향: 두 번째 요청이 준비되지 않은 llama-server에 generation/embed를 보내 ECONNREFUSED/503 가능. 불필요한 실패/재시도가 cold start 지연을 악화시킨다.
- 증거: source-based spawn/fetch mock에서 first health promise pending 상태로 second ensureStarted가 baseUrl을 반환함을 assert 재현.
- 최소 수정: pending startingPromise를 running fast-path보다 먼저 합류; running은 health 완료 뒤 선언. 다른 config로 동시 요청한 경우 현재 startingPromise를 잘못 재사용하지 않는 정책도 명시.
- 검증: delayed health + concurrent same-config 호출; health failure; different config; stop during startup.

### M06 — P2: idle 상태에도 500ms마다 main에서 DB 검색/집계를 계속한다

- 위치: `src/main/services/features/derivedJobs/derivedJobWorker.ts:37`–40, 107–114, 148–188, 304–313. `src/main/lifecycle/shutdown/shutdown.ts:219`–223.
- 실제 흐름: renderer shown 후 worker.start. 기본 500ms tick. 작업이 비어 있어도 search queue, memory project group, episode extraction group, temporal evidence anti-join, long pending counts 두 개를 실행한다.
- SQL 근거: dbMaintenanceService.ts:303–308 / 423–429 / 442–460; memoryEpisodeExtractionProcessor.ts:51–57; memoryTemporalFactExtractionRunner.ts:173–183.
- 영향: idle empty queue 기준 적어도 6개 query/tick, 약 12개 query/sec 구조다(건당 실측 비용은 미측정). 에피소드 LLM 추출이 꺼져 있어도 후보 조회는 매 tick 수행한다. mac은 모든 창을 닫아도 app를 유지하며 이 worker를 pause하지 않는다. 전체 앱에서 powerMonitor suspend/resume/battery/thermal 이벤트 연결을 찾지 못했다.
- 최소 수정: 기존 queue enqueue 때 wake; empty일 때 점진 backoff, 새 작업 때 즉시 재개. 비활성 기능 후보 쿼리 skip. background 작업 budget을 battery/thermal/app visibility에 맞추되 저장 flush는 유지.
- 검증: 1분 idle query count/event-loop CPU/wakeups, mac windowless 상태, AC↔battery/suspend↔resume. 기능 플래그 꺼진 상태에서 episode/temporal poll 0회.

### M07 — P2: derived worker stop이 drain을 보장하지 않는다

- 위치: `src/main/services/features/derivedJobs/derivedJobWorker.ts:123`–145, 200–269; `src/main/lifecycle/shutdown/runtimeLifecycle.ts:30`–45; `src/main/lifecycle/shutdown/shutdown.ts:427`–465.
- trigger: 5초를 넘는 LLM/embedding/summary tick 중 quit. stop은 running=false와 interval clear만 수행하고 inTick가 남아도 5초 뒤 resolve한다. tick 본문은 계속 다음 단계로 진행한다.
- 영향: 호출자는 stop 완료로 보고 sidecar/utility 종료, main/cache checkpoint/disconnect로 이동할 수 있는데 background job은 아직 완료되지 않았다. DB 종료와 쓰기/재시도 경합 가능. 데이터 손실을 실재현한 것은 아니며 정확한 위험 조건은 장기 작업이 걸린 종료다.
- 최소 수정: 현재 tick promise 보관, shared cancellation signal 전달, boundary마다 중단 확인, 취소 settle 또는 durable 재예약 확인 후 DB close. 단순 timeout을 drained 성공으로 취급하지 말 것.
- 추가: pauseShutdownBackgroundWork는 deferred startup maintenance의 running 전체를 timeout 없이 기다린다(deferredStartupMaintenance.ts:137–143). 대형 snapshot/path cleanup 중 quit UI 진행이 지연될 수 있다. 이런 비필수 maintenance는 chunk boundary에서 취소/재개 가능해야 한다.
- 검증: tick 단계 중간에 deferred provider를 매달고 stop 이후 새 단계/DB write가 없는지 확인; quit-cancel resume도 검증.

### M08 — P2: 로그가 무제한 appendFile 팬아웃과 무제한 파일 성장 구조다

- 위치: `src/shared/logger/index.ts:168`–198, 282–291; `src/main/index.ts:20`–28. utilityProcessMain.ts:18–26,315.
- 실제 흐름: production main INFO logging 활성. 로그마다 데이터 deep redaction, console 출력, JSON.stringify, async import 후 별도 appendFile. filesystem write 완료를 기다리는 큐 상한/배치/rotation/shutdown flush 없음.
- 영향: burst IPC/derived error에서 promise와 log entry가 backlog에 유지되고 파일 open/write/close 작업이 mirror/gzip/download 등 libuv I/O와 경쟁한다. 장기 사용시 파일 무한 성장. utility는 configureLogger 없이 기본 DEBUG 콘솔 출력 상태라 stderr debug redaction도 실행한다. 동적 import는 module cache가 있으므로 매번 module 재로딩이라고 해석하면 안 된다; 핵심은 per-entry write와 무제한 backlog다.
- 최소 수정: main process 단일 bounded write stream/배치와 size rotation, 완료 대기 가능한 bounded flush. INFO hot event sampling 및 반복 WARN rate-limit. 민감정보 redaction은 유지. utility production log level 명시.
- 검증: 느린 sink에 10k 로그 burst, peak retained bytes/queued writes, 파일 최대 크기/rotation, fatal/quit flush deadline. 실제 처리시간/MB는 측정하지 않았다.

### M09 — P2: 배포 아키텍처와 local LLM runtime 지원이 불일치한다

- 위치: `src/main/infra/llm/sidecarConstants.ts:3`–14; `src/main/handler/system/settings/modelDownloadHandlers.ts:56`–60; `src/main/handler/system/settings/llmHandlers.ts:51`–55; `.github/workflows/release-windows.yml:18`–23.
- trigger: Windows ARM64 또는 Linux ARM64에서 local model/binary provisioning.
- 영향: Windows 배포 matrix는 ARM64를 포함하지만 runtime URL/hash map에 win32-arm64가 없어 명시 unsupported error. linux-arm64도 없다. Windows x64 기본 URL은 명시 `bin-win-cpu-x64.zip`이므로 gpuLayers=-1을 설정해도 GPU runtime binary 선택 자체가 없다.
- 최소 수정: OS/arch/backend 지원표를 단일 기준으로 UI 선택/배포/다운로드/검증에 반영. 우선 ARM 플랫폼에 지원 binary 또는 명시 remote fallback; GPU별 CUDA/Vulkan 등을 일괄 넣기 전에 실제 지원 기기/driver/backend probe에 맞춘 선택과 실패 fallback을 제공.
- 검증: 실제 설치 artifact에서 binary version, startup health, embed+generate smoke. URL 존재 확인만으로 성능 인증하지 말 것.

### M10 — P3: sidecar 자원/idle 정책이 실제 활성 작업과 하드웨어 budget을 반영하지 않는다

- 위치: `src/main/utility/llm/sidecarSupervisor.ts:12`,131–133,330–393,431–436. `src/main/utility/llm/embeddingModelConstants.ts` 및 `src/main/infra/llm/sidecarConstants.ts:34`–44.
- 근거: 3분 idle timer를 ensureStarted에서만 갱신하고 완료/진행중 reference count가 없다. generic text generation은 180초 bridge timeout이나 내부 fetch에는 signal 없고, 모델 준비 이후에 긴 active request가 있어도 idle timeout은 stop을 호출한다. chat 기본 threads=4, cacheRam=2048 MiB, parallel=1; embedding 별도 프로세스도 threads=4이다.
- 영향: 긴 active generation이 idle 종료 대상이 되거나, CPU core 적고 RAM 적은 기기에서 chat+embedding의 CPU/RAM budget 충돌. 높은 사양에서는 무조건 4 threads가 비효율일 수도 있으나 벤치 없이 thread 증가를 권장할 수 없다. 2GB는 cache budget 옵션이지 언제나 2GB RSS 할당됨을 측정한 것은 아니다.
- 최소 수정: request lease/reference count를 사용해 active=0일 때 idle timer 시작. hardware fit와 사용자 override를 유지하며 availableParallelism, 실제 memory 여유, foreground typing budget으로 한도를 결정. 모든 OS 동일 하드코딩 대신 실측 profile 적용.
- 검증: fake clock long-running request, chat+embedding 동시 workload, 8GB/16GB RAM, battery/thermal throttle. utility 강제 종료 시 descendant llama process가 남지 않는지도 OS process tree로 검증(현재 orphan을 실제 관측한 것은 아님).

### M11 — P3: lazy import를 표방하지만 static barrel 경계가 넓다

- 위치: `src/main/index.ts:16`,94–107; `src/main/lifecycle/index.ts:1`–7; `src/main/handler/index.ts:1`–39; `src/main/lifecycle/app-ready/appReady.ts:312`–318.
- source static import/re-export traversal(TS AST, relative local source only) 결과: main index 246 files / 966KiB, single-instance 직접 barrel 2 files / 2KiB, handler index 415 files /1758KiB, utility entry72 files/257KiB. 이는 **source 연결 규모**이며 tree shaking 이후 bytes/실제 로드 시간/RSS 수치가 아니다.
- 영향: single instance lock 획득 전 lifecycle 전체 barrel이 static entry graph에 연결되고, 첫 창 전에 모든 domain handler/service registry를 import한다. loadAutoSaveManager도 해당 manuscript domain을 이미 static import하므로 독립 lazy boundary로 보기 어렵다. startupStartedAt는 import evaluation 이후라 이 초기 load 시간을 현재 checkpoint가 덜 보여줄 수 있다.
- 최소 수정: single-instance를 직접 entry에서 import; hot startup handler는 먼저 얇게 등록하고 heavy service는 handler 실행 시 기존 async lazy pattern으로 resolve. 실제 bundle graph/profile에서 유효한 경계만 변경.
- 검증: clean build static chunk closure와 cold process import profile; wizard/빈 project에서 analysis/sync/LLM 모듈 로딩 여부 비교.

### M12 — P2: OS 성능 검증 범위가 배포 범위에 못 미친다

- 배포 CI: Windows x64/arm64 build matrix가 있으나 packaged launch/performance 테스트가 없다. macOS는 arm64 DMG 서명/staple 검증만 있고 Intel runtime job 없음. Linux는 package target(AppImage/deb)만 있고 `.github/workflows`에 Linux workflow 없다.
- native rebuild: scripts/rebuild-electron-if-needed.mjs:23 targetArch를 읽지만 59–69의 host Electron load probe 성공이면 다른 targetArch라도 skip. 이는 target architecture 검증이 아니다. 단 **better-sqlite3 13.0.3 설치본은 win/mac/linux/arm/x64 N-API prebuilds를 모두 동봉**하므로 이것만으로 ARM DB failure를 확정해서는 안 된다. sqlite-vec 같은 추가 native component도 packaged target에서 별도 smoke가 필요하다.
- 성능 harness: scripts/run-writing-loop-profiles.mjs:31–38은 bunx를 사용하고 writingLoop.stress.spec.ts:45–48은 sync/maintenance/package export를 끈다. fullprod 별도 테스트는 존재(writingLoop.fullprod.spec.ts:37)하므로 전체 기능 성능 테스트가 전혀 없다고 해석하지 말 것. 해당 E2E helper는 DB URL만 분리하고 userData/settings는 격리하지 않는다(_helpers/electronApp.ts:35–43).
- 최소 수정: packaged artifact/hash/runtime 버전과 OS/CPU/RAM/전원 상태를 기록하는 재현 가능한 scenario matrix; benchmark 전 source와 build 일치 보장; tmp userData로 settings/log/model 상태까지 격리. 기존 fullprod와 stress를 목적별 유지하고 OS별 budget/baseline을 둔다.
- 측정 항목: cold/warm first paint+editor ready, main event-loop delay, typing p95/p99, IPC p95/p99+payload bytes+queue depth, empty idle CPU/wakeups, main/renderer/utility/llama RSS+GPU memory, save→mirror→DB→package ack, quit/suspend/resume, DB busy/wal checkpoint, model cold/warm latency. 본 감사에서 실수치는 측정하지 않았다.

## 플랫폼 행렬

| 항목 | macOS ARM64 | macOS x64 | Windows x64 | Windows ARM64 | Linux x64 | Linux ARM64 |
|---|---|---|---|---|---|---|
| 배포 자동화 | 서명 DMG CI | universal script만, 독립 CI 없음 | portable CI | portable CI | AppImage/deb 설정, CI 없음 | 명시 CI 없음 |
| local llama 다운로드 | macOS arm64 ZIP | macOS x64 ZIP | CPU x64 ZIP | map 누락, unsupported | Ubuntu x64 ZIP | map 누락, unsupported |
| 창 설정 | hiddenInset, native traffic lights | 동일 | custom title bar | 동일 | 기본 native frame | 동일 |
| 마지막 창 닫힘 | 프로세스 유지, worker polling 유지 | 동일 | app.quit | app.quit | app.quit | app.quit |
| 전원 대응 | 구현 없음; suspend/resume/battery/thermal 적용 가능 | 동일 | 구현 없음; battery/speed-limit 적용 가능 | 동일 | 구현 없음; suspend/resume 적용 가능 | 동일 |
| native 검증 | host better-sqlite3 load probe | 해당 target probe 없음 | host probe | host x64 runner의 probe는 arm64 런타임 검사 아님 | 해당 CI 없음 | 해당 CI 없음 |

OS 전원 기능은 Electron 공식 문서에 명시된 범위다: [powerMonitor](https://www.electronjs.org/docs/latest/api/power-monitor). Linux에 battery change/thermal event가 macOS와 동등하다고 가정하면 안 된다. GPU blacklist 무시나 global backgroundThrottling=false를 성능 해결책으로 넣을 근거도 현재 없다. createSecureWebPreferences는 contextIsolation/nodeIntegration=false/sandbox=true를 유지하고 backgroundThrottling override는 하지 않는다.

## 이미 잘 적용한 기반

1. main index의 utility 요청 시 lazy start. 기존 out artifact는 구버전이므로 혼동 주의.
2. 첫 위저드 cheap gate→window-first, bootstrap promise single flight, readiness inflight 병합, renderer ready fallback 8초, derived worker는 main window show 뒤 시작.
3. main/preload/renderer trust boundary 유지; secure webPreferences와 Electron fuses 적용.
4. utility process가 local llama spawn을 소유. loopback bind, random free port, health check, failure exponential cooldown, bounded stderr tail, idle stop. 결함은 기존 구조의 작은 guard/order/ownership 수정으로 해결 가능한 부분이 많다.
5. derived worker inTick overlap 방지, pending editing일 때 skip, batch 크기, 저장과 background 작업 우선 분리의 기본값.
6. shared writeFileAtomic은 gzip async, file fsync와 rename, 가능한 OS에서 directory fsync. package writer는 경로별 queue와 backup restore. 따라서 fsync를 삭제하거나 durability를 일괄 낮추는 것은 성능 최적화로 제안하지 않는다. Windows directory fsync 불가/antivirus lock/UNC/긴 경로는 별도 OS 테스트 필요.
7. renderer flush는 sender+requestId를 검증하고 timeout/error/quit 취소 회복 경로를 둔다. 문제는 background work drain과 OS system shutdown/suspend까지 연결되지 않은 부분이다.
8. vendor chunk 분리와 native asarUnpack, release 서명/staple 확인, save latency/core/fullprod/stress 성능 검사 기반이 이미 있다.

## 우선 실행 제안

1. source probe 3개를 정식 regression으로 옮기며 sidecar ready race, provider auth cache, readiness TTL 수정. 첫 창 critical gate 분리.
2. timeout→cancel→settle 연결과 bounded utility scheduling. derived worker stop/drain 및 idle backoff부터 적용. worker/process 수를 무작정 늘리지 않는다.
3. logger bounded sink와 metric correlation. fullprod userData 격리와 clean packaged benchmark.
4. OS/arch/backend 지원표를 정리하고 Windows ARM64/Linux, mac Intel, GPU/저메모리 프로파일을 채운다. SQLite/renderer 병목에 대한 다른 담당 finding과 함께 실제 profile에 따라 worker offload 결정.

Electron 공식 [performance](https://www.electronjs.org/docs/latest/tutorial/performance) 지침은 main blocking 회피, 필요한 시점까지 작업/모듈 load 연기, 실측에 기반한 병목 제거를 권한다. 이 보고서의 코드상 결함과 재현 결과를 먼저 고치고, 성능 향상 %나 RAM 감소량은 clean artifact의 실제 OS 측정 이후에만 제시해야 한다.
