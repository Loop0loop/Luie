# IPC / preload / 측정 경계 감사

기준: 2026-09-08, commit `128d8be6`의 현재 작업 트리. 아래 재현은 현재 preload 소스를 TypeScript로 메모리에서 변환하여 Electron 전송부와 시계만 제어한 관측이다. Electron의 실제 복사 시간이나 heap 사용량을 측정한 것은 아니다.

## I01 — P2: read timeout 재시도가 끝나지 않은 원래 작업과 겹친다

- 근거: `src/preload/index.ts:185`의 `invokeWithTimeout`, `:210`의 invoke, `:227`의 Promise.race, `:237`–248의 read retry. main은 `src/main/handler/core/ipcHandler.ts:53`에서 별도 요청을 무조건 시작한다.
- 15초 timeout은 호출자 대기만 종료하며 main 요청을 취소하지 않는다. 검색/프로젝트 읽기 같은 retry 대상은 한 번 더 시작된다. 지속적으로 요청하면 오래 걸리는 기존 작업과 새 작업이 누적될 수 있다. retry는 최대 1회이므로 무한 retry 루프라고 표현해서는 안 된다.
- 재현: 완료하지 않은 SEARCH 요청에 가상 시간 15초를 진행시키자 동일 검색 2개가 동시에 미완료 상태가 되었다. 두 번째가 성공해도 원래 요청은 남아 있었다.
- 최소안: 동일 read의 single flight, 호출자 관심 종료 시 취소 전파, 상태/작업별 제한. idempotent read만 재시도하는 현재 방침은 유지한다. 즉각 retry가 과부하를 증폭하는 경우 backoff를 둔다.
- 검증: 응답 없는 search 100개에서 active/queued 상한과 AbortSignal 전달, 빠른 새 검색이 이전 결과로 덮이지 않는지 확인.

## I02 — P2: 사용자 다이얼로그와 긴 작업이 모두 기본 15초 제한을 받는다

- 근거: `src/preload/index.ts:49`의 LONG_TIMEOUT_CHANNELS에는 FS_SELECT_FILE / DIRECTORY / SAVE_LOCATION / SNAPSHOT_BACKUP과 memory eval/calibration, RAG_QA_ASK가 없다. 기본값은 `src/shared/constants/runtime/preload.ts:6`의 15초다.
- 다이얼로그는 `src/main/handler/system/fs/ipcFsHandlers.registry.ts:126`, `:148`, `:185`에서 사용자 선택을 기다린다. 사용자가 15초 후 선택하면 main은 정상 경로 승인과 결과를 반환하지만 renderer promise는 이미 실패다. 이 결과 손실을 source probe로 재현했다.
- 긴 계산은 `src/main/handler/memory/ipcMemoryHandlers.ts:92`–122 → `memoryEvalRunner.ts:99` / intent·episode calibration loop로 이어진다. `narrativeMemoryQueryService.ts:98`은 옵션에 따라 LLM 분류를 기다리고 utility generate timeout은 180초다. outer timeout은 job을 중단하지 않는다. 동일 버튼 재클릭 시 별도 eval run이 시작될 수 있다.
- 최소안: dialog 채널은 사용자가 취소하거나 창이 닫힐 때 종료하는 수명으로 구분한다. 장기 작업은 job id를 즉시 반환하고 진행/취소/완료를 별도 전달한다. 짧은 과도기에는 채널 deadline을 실제 하위 budget과 맞추되 모든 timeout을 일괄 증가시키지 않는다.
- 검증: 30초 기다린 파일 선택 성공, 명시 사용자 취소, 원격 작업 지연/취소, 버튼 중복 실행 차단.

## I03 — P2: 로그 배치가 동시 실행량을 제한하지 않는다

- 근거: `src/preload/index.ts:276`–291의 flushLogs는 in-flight guard가 없다. `:299`–301은 queue 20개 또는 error마다 즉시 새 flush를 시작한다. batch 실패 시 `Promise.all(batch.map(LOGGER_LOG))`로 개별 전송한다.
- 재현: 빠른 INFO 로그 1,000개 → 응답을 기다리는 batch invoke 50개. batch를 실패시키면 개별 invoke 1,000개가 동시에 생겼다. batch 크기 20은 전체 대기/실행 상한이 아니다.
- main `src/shared/logger/index.ts:282`–291은 다시 매 로그 appendFile을 생성한다. 디스크가 느리거나 오류가 반복되면 진단 경로가 저장 I/O와 경쟁한다. 실제 상주 메모리 증가량은 미측정이다.
- 최소안: preload 단일 in-flight flush + queue의 항목/byte 상한 + 반복 로그 제한. batch 실패가 공통 transport 장애이면 같은 메시지를 개별 IPC로 폭발시키지 않는다. main bounded sink/rotation과 함께 수정한다.
- 검증: 느린 logger sink에 burst를 넣고 inflight=1, 큐 상한, ERROR 보존/드롭 계수와 종료 flush를 검사한다.

## I04 — P2: 현재 request metadata로는 실제 IPC 지연을 분해하기 어렵다

- 근거: `src/preload/index.ts:190`에서 만든 requestId는 `:211`의 IPC 인자로 전달하지 않는다. main은 `src/main/handler/core/ipcHandler.ts:55`에서 새 UUID를 만든다. main duration은 callback 시작 후 `Date.now()`로 계산한다.
- 영향: preload timeout log와 main success/error log를 동일 요청으로 정확히 연결할 수 없다. main의 duration에는 전송·입력 직렬화·main callback 전 대기·응답 clone·renderer 처리 시간이 포함되지 않는다. main duration이 짧다는 이유로 사용자 저장 응답이 빠르다고 판단하면 잘못된 최적화가 된다.
- 최소안: 기존 IPC 계약에 검증되는 공통 trace id와 deadline 메타데이터를 설계한다. 각 프로세스에서 monotonic clock으로 자기 구간 duration을 측정하고, payload byte/queue depth/작업 종류를 기록한다. 프로세스별 performance.now 절대값을 직접 빼지 않는다. 본문·토큰은 로그에 기록하지 않는다.
- 검증: 한 요청에서 UI action → renderer buffer → preload wait → main handler → DB commit → package ack의 동일 trace를 확인한다.

## I05 — P3: logger sanitizer의 순환 배열은 stack overflow를 일으킨다

- 근거: `src/preload/index.ts:30`–35는 Array 분기에서 seen 검사를 건너뛴다. shared logger의 `redactLogData`도 같은 순서다.
- 재현: `const value=[]; value.push(value)`를 실제 sanitizeForIpc에 넣으면 Maximum call stack size exceeded. 해당 API는 logger 데이터를 받고 있으므로 정상 원고 문자열의 모든 IPC가 이 비용을 지는 것은 아니다.
- 최소안: 배열·Error를 포함해 객체마다 순환/깊이 검사를 먼저 적용하고 출력 크기를 제한한다. 민감정보 redaction은 유지한다.

## 이미 적용된 보호

- `ipcRenderer.sendSync`를 사용하는 앱 경로를 찾지 못했다. raw ipcRenderer는 renderer API로 노출하지 않는다.
- preload autosave는 최신 payload coalescing, sequence 확인, drain tail, 실패 pending 보존이 있다. 이것을 main의 별도 pending 삭제 결함과 혼동하지 않는다.
- manual save는 preload flush를 기다리고, main handler는 schema 검증을 수행한다. 중요한 문제는 각 계층의 실제 durable 완료 조건과 더 앞단의 editor buffer다.
- 일반 IPC payload 전체에 sanitizeForIpc를 반복 적용하는 구조가 아니다. 해당 재귀 순회는 주로 logger에 적용된다.
- 대용량 본문은 여전히 renderer→contextBridge→preload→IPC 복사 경계를 지난다. 우선 전송 횟수/필요 필드를 줄이고 DTO를 좁힌다. 모든 메시지를 SharedArrayBuffer/MessagePort로 바꾸는 근거는 없다. Electron [contextBridge](https://www.electronjs.org/docs/latest/api/context-bridge), [IPC serialization](https://www.electronjs.org/docs/latest/tutorial/ipc) 문서가 복사·structured clone 경계를 설명한다.

## 검사 결과와 한계

- `SKIP_DB_TEST_SETUP=1 node node_modules/vitest/vitest.mjs run tests/dom/preloadAutoSaveQueue.test.tsx tests/scripts/preloadContractRegression.test.ts tests/scripts/ipcContractMap.test.ts tests/scripts/ipcHandlerSchemas.test.ts tests/main/handler/manualSaveHandler.test.ts`: 5개 파일 29개 테스트 통과.
- `node /private/tmp/luie-ipc-audit/probes.cjs /Users/user/Luie`: 위 retry/dialog/log burst/circular array의 관측 assert 4개 통과. 결함 관측용이므로 제품 수정 후에는 기대값을 정상 동작으로 바꿔 정식 회귀 테스트로 이전해야 한다.
- 현재 소스 전체 빌드: `node node_modules/electron-vite/bin/electron-vite.js build --outDir /private/tmp/luie-audit-build/out` 성공. 임시 빌드에서 저장소의 render-boot-budget gate: JS 573.1 KiB / 17 files, CSS 166.1 KiB, 통과. 이전 out의 1108.9KB는 stale이어서 현재 회귀로 보고하지 않는다.
- `node node_modules/typescript/bin/tsc6 --noEmit`: 기존 `src/renderer/src/features/manuscript/components/Sidebar.tsx:157`의 unused handleRenameProject(TS6133)로 실패. 이번 조사에서 수정하지 않았다.
- pnpm 실행은 npm registry 접근/서명 검증 불가로 ERR_PNPM_PNPM_ENGINE_IDENTITY_UNVERIFIABLE. 설치된 동일 로컬 runner를 직접 사용했으며 패키지를 설치/변경하지 않았다.
- `check-preload-contract-regression`과 `check-ipc-handler-schemas` 통과. `check-ipc-contract-map`은 기존 문서 drift를 발견하고 map을 재생성했다. 조사 전 해당 파일은 깨끗했으므로 조사로 생긴 변경만 복원했으며, 차이는 `/private/tmp/luie-audit-ipc-map-drift.patch`에 남겼다.

## 성능 테스트가 증명하는 경계

- `scripts/benchmark-writing-loop.mjs:133`–158의 worker simulation은 실제 indexing/embedding 대신 status만 completed로 바꾼다. 이 SQL microbenchmark는 실앱 작업 완료시간을 인증하지 않는다.
- `tests/e2e/writingLoop.fullprod.spec.ts:111`–139는 window.api.chapter.update를 직접 호출한다. 실제 renderer↔main 경로의 benchmark로 유효하지만 TipTap 키 입력·IME·900ms editor buffer·SmartLink decoration은 통과하지 않는다.
- `tests/main/performance/saveLatencyCertification.test.ts:40`–79는 real DB/FS와 mock Electron/API 경계다. 서비스의 내구성/지연 증거는 되지만 IPC clone, OS compositor, 입력 frame time의 증거는 아니다.
- 소스 목록: src/main 463개/66,016줄, preload 7개/1,304줄, renderer 526개/67,742줄, shared 127개/11,582줄, src/types 2개/14줄. tracked TS/TSX/JS/MJS/CJS/SQL 기준이다. 관련 tests 399개/72,955줄, scripts 75개/13,898줄을 목록화했다. 목록화와 전체 줄 수동 검토는 다르며, 감사는 주요 실행 경로와 실제 caller/테스트를 추적했다.
