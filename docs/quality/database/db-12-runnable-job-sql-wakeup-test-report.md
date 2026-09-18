# DB-12 실행 가능 job SQL·idle wake-up 테스트 보고서

## 최신 보정 판정 · 2026-09-13

현재 판정: **PASS · 전체 rebuild 재활성화와 global history scan 보정 완료.** failed-only generation reset, paused 보존, 50,000건 terminal history의 실제 global query plan과 p95 상한을 영구 회귀로 추가했다. 상세 RED/GREEN과 통과 조건은 [보정 보고서](db-12-full-rebuild-global-query-remediation-test-report.md)를 기준으로 한다.

### 보정 전 QA 재현 기록

- [dbMaintenanceMemory.ts](../../../src/main/services/features/dbMaintenance/dbMaintenanceMemory.ts)의 전체 rebuild bulk 분기(182~189행)는 matching failed만 있으면 작업을 추가하거나 reset하지 않는다. 실제 함수에 attempts=5 failed chunk를 준비하고 전체 rebuild를 호출한 결과 응답은 `queued=1`이었지만 job은 `failed/5` 그대로였다. 단건 [memoryBuildJobEnqueue.ts](../../../src/main/services/features/memory/memoryBuildJobEnqueue.ts)의 pending/0/null 재활성화 계약이 전체 경로에는 적용되지 않았다.
- [dbMaintenanceService.ts](../../../src/main/services/features/dbMaintenance/dbMaintenanceService.ts)의 `listProjectsWithPendingMemoryJobs`와 동일한 실제 Drizzle predicate/group/order 쿼리는 새 migration 적용 후 `SCAN MemoryBuildJob USING COVERING INDEX MemoryBuildJob_runnable_idx`, `USE TEMP B-TREE FOR ORDER BY`였다. 현재 index가 전역 완료 이력 scan을 제거했다는 근거는 없다.
- [derivedJobRunnableSelection.test.ts](../../../tests/main/services/derivedJobRunnableSelection.test.ts)의 representative plan은 project/job/status/attempts를 고정한 다른 쿼리에서 index 이름을 검사한다. 이는 index 존재·해당 제한 쿼리 사용을 확인하며 전역 worker 조회 비용이나 p95를 확인하지 않는다.
- 실제 함수·native SQLite `:memory:` 재현과 query plan은 `node /private/tmp/luie-db04-current-review.cjs`의 `fullRebuildRetry`, `actualGlobalMemoryQueryPlan` 출력으로 확인했다. Node v22.23.0, SQLite 3.53.4, 현재 source/schema/migration을 사용했으며 실사용 DB·Electron·배터리 측정은 아니다. 임시 스크립트는 영구 회귀 테스트가 아니다.
- 전체 rebuild의 failed-only 상태 전이와 실제 전역 조회의 충분한 completed history를 포함해 종료 기준을 보완해야 한다. plan 결과 자체를 실행 시간이나 p95 측정값으로 환산하지 않는다.

## 문서 정보

| 항목             | 값                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------- |
| 테스트 기준      | `database.md` DB-12                                                                    |
| 테스트 대상      | search/memory job 선택, enqueue 재활성화, runnable index, `DerivedJobWorker` scheduler |
| 테스트 설계 기법 | ISTQB 명세 기반 테스트, 상태 전이, 오류 추정, 경계값 분석                              |
| 테스트 레벨      | Real DB Integration, Schema Migration, Worker Unit Mocked                              |
| 실행일           | 2026-09-13 KST                                                                         |
| 기준 HEAD        | `0faf4fad`                                                                             |
| 환경             | Darwin arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0, worker별 실제 SQLite DB     |

## 변경 계약

- SearchDirtyQueue와 MemoryBuildJob은 `pending` 또는 attempts/backoff 조건을 만족한 `failed`만 SQL `WHERE`에서 선택한다.
- `LIMIT`은 실행 불가능한 terminal failed row를 제거한 뒤 적용한다.
- 공통 단건 enqueue에서 새 source generation이 기존 failed memory job과 겹치면 `pending`, attempts 0, error null로 다시 활성화한다. 전체 rebuild bulk 경로는 최신 재검토에서 이 처리가 누락된 것으로 확인됐다.
- 사용자 중지 상태인 `paused` job은 새 enqueue가 와도 상태를 유지하고 priority·updatedAt만 갱신한다.
- 검색 runnable index는 status/attempts/updatedAt, memory runnable index는 project/job/status/attempts/priority/createdAt/updatedAt 순서를 사용한다.
- worker는 처리할 작업이 없으면 5초 간격으로 backoff한다. 중앙 memory/search enqueue 신호가 오면 남은 idle 시간을 기다리지 않고 즉시 tick을 예약한다.
- stress mode의 idle 간격은 기존 500ms를 유지하며 `LUIE_DERIVED_IDLE_TICK_MS`로 명시적 조정할 수 있다.

## 상태 모델

| 상태 | 설명                                                                       |
| ---- | -------------------------------------------------------------------------- |
| S0   | SearchDirtyQueue 앞부분에 attempts=5 failed 40개, 뒤에 pending 1개         |
| S1   | SQL runnable predicate가 terminal row를 제외하고 pending을 선택            |
| M0   | MemoryBuildJob 앞부분에 attempts=5 failed 40개, 뒤에 pending chunk job 1개 |
| M1   | chunk job이 선택·완료됨                                                    |
| M2   | 같은 target의 failed job에 새 source generation enqueue                    |
| M3   | 기존 row가 pending/attempts 0/error null로 재활성화                        |
| W0   | 최초 tick 후 runnable job이 없어 worker가 5초 idle timer를 예약            |
| W1   | 4,999ms 동안 추가 tick 없음                                                |
| W2   | enqueue signal 직후 0ms timer로 다음 tick 실행                             |

검증 전이는 `S0 → S1`, `M0 → M1 → M2 → M3`, `W0 → W1 → W2`다.

## 테스트 케이스

### TC-DB-12-A: terminal search row 뒤 pending 선택

| 항목      | 내용                                                                    |
| --------- | ----------------------------------------------------------------------- |
| 목적      | terminal failed가 후보 window를 점유해 pending을 굶기는 회귀 방지       |
| 사전 상태 | 같은 project에 오래된 attempts=5 failed 40개와 실제 chapter pending 1개 |
| 입력      | `processPendingSearchJobs({ limit: 1 })`                                |
| 절차      | 실제 main/cache DB에서 처리 후 target queue 상태와 processed 수 조회    |
| 기대 결과 | queued=1, processed=1, target status=completed                          |
| 실제 결과 | 기대 결과와 일치                                                        |
| 결과      | PASS                                                                    |

### TC-DB-12-B: terminal memory row 뒤 pending 선택과 새 generation reset

| 항목      | 내용                                                                               |
| --------- | ---------------------------------------------------------------------------------- |
| 목적      | memory 후보 starvation 제거와 terminal failed dedupe 재활성화 확인                 |
| 사전 상태 | 같은 project/jobType에 attempts=5 failed 40개와 실제 chapter chunk pending 1개     |
| 입력      | limit 1 처리 후 target을 failed/attempts 5로 만들고 동일 target enqueue            |
| 절차      | 실제 DB에서 chunk 생성·job 완료를 확인하고 재enqueue 뒤 status/attempts/error 조회 |
| 기대 결과 | 첫 처리 processed=1, 재enqueue 뒤 pending/0/null                                   |
| 실제 결과 | 기대 결과와 일치                                                                   |
| 결과      | PASS                                                                               |

### TC-DB-12-C: runnable index query plan

| 항목      | 내용                                                                                           |
| --------- | ---------------------------------------------------------------------------------------------- |
| 목적      | 실제 job 선택 column 순서에 대응하는 index가 bootstrap/migration DB에 존재하고 사용되는지 확인 |
| 사전 상태 | main Drizzle migration이 적용된 worker 임시 DB                                                 |
| 입력      | search와 memory의 representative `EXPLAIN QUERY PLAN`                                          |
| 절차      | plan detail에서 각 runnable index 이름 확인                                                    |
| 기대 결과 | `SearchDirtyQueue_runnable_idx`, `MemoryBuildJob_runnable_idx` 사용                            |
| 실제 결과 | 기대 결과와 일치                                                                               |
| 결과      | PASS                                                                                           |

### TC-DB-12-D: idle backoff와 enqueue wake-up

| 항목      | 내용                                                                                 |
| --------- | ------------------------------------------------------------------------------------ |
| 목적      | 완전 idle 상태의 500ms polling 제거와 enqueue 즉시 반응 확인                         |
| 사전 상태 | fake timer, autosave pending 0, search/memory/episode/temporal runnable project 없음 |
| 입력      | worker 시작 → 4,999ms 진행 → `requestDerivedJobWakeup()`                             |
| 절차      | mocked `processPendingSearchJobs` 호출 횟수를 각 시점에 관찰                         |
| 기대 결과 | 시작 tick 1회, 4,999ms까지 1회 유지, signal 직후 2회                                 |
| 실제 결과 | 기대 결과와 일치                                                                     |
| 결과      | PASS                                                                                 |

## 실행 기록

### 실제 DB·schema 통합

```sh
pnpm exec vitest run \
  tests/main/services/derivedJobRunnableSelection.test.ts \
  tests/main/services/dbMaintenanceService.test.ts \
  tests/main/services/memoryProjectionService.test.ts \
  tests/main/services/chapterSummaryProjector.test.ts \
  tests/main/database/schemaParity.test.ts
```

상태: worker별 사용자 데이터와 분리된 실제 main/cache SQLite DB를 사용했다. terminal fixture 40개는 기존 후보 상한 30을 넘기도록 구성했다. Chapter/Project는 실제 service로 생성했고 search projection과 memory chunk 결과를 실제 DB에 기록했다.

결과: **5 files passed, 32 tests passed**.

### worker idle 단위 테스트

```sh
SKIP_DB_TEST_SETUP=1 pnpm exec vitest run tests/main/services/derivedJobWorkerWakeup.test.ts
```

상태: DB를 사용하지 않는 scheduler 테스트다. fake timer와 maintenance/project-list mock으로 완전 idle 상태를 고정했다.

결과: **1 file passed, 1 test passed**.

### embedding worker 회귀

```sh
SKIP_DB_TEST_SETUP=1 pnpm exec vitest run tests/main/services/embeddingProjector.test.ts
```

상태: 이 파일은 자체 database module mock을 사용하는 비DB 테스트이므로 전역 실제 DB setup을 생략했다. retry SQL 변경 뒤 기존 embedding 처리·빈 chunk skip 계약을 확인했다.

결과: **1 file passed, 2 tests passed**.

### migration·정적 검사

```sh
pnpm run check:drizzle:main
```

결과: **PASS — Everything's fine**.

```sh
pnpm exec eslint \
  src/main/services/features/derivedJobs/derivedJobWorker.ts \
  src/main/services/features/derivedJobs/derivedJobWakeup.ts \
  src/main/services/features/dbMaintenance/dbMaintenanceService.ts \
  src/main/services/features/memory/projection/jobPolicy.ts \
  src/main/services/features/memory/memoryProjectionService.ts \
  src/main/services/features/memory/embeddingProjector.ts \
  src/main/services/features/memory/chapterSummaryProjector.ts
```

결과: **PASS, lint error 0개**.

```sh
git diff --check
```

결과: **PASS**.

```sh
pnpm run typecheck
```

결과: **BLOCKED by pre-existing unrelated error**.

```text
src/renderer/src/features/manuscript/components/Sidebar.tsx(157,5):
TS6133: 'handleRenameProject' is declared but its value is never read.
```

이번 DB-12 변경 파일에서는 TypeScript 오류가 보고되지 않았다.

## 판정과 잔여 범위

- SQL runnable 조건, 후보 starvation 제거, 단건·전체 rebuild generation reset, 실제 global partial-index query, idle wake-up이 모두 통과해 현재 DB-12는 완료다.
- completed/terminal history 삭제 정책은 감사 범위에서 별도 보관 정책으로 분리되어 있으며 이번 항목에서는 row를 삭제하지 않았다.
- 운영 장시간 배터리 사용량과 cold-disk latency는 측정하지 않았다. 검증은 tick 횟수·실제 SQLite 선택 결과·query plan을 대상으로 했다.
