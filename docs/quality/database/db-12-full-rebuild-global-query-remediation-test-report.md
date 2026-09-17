# DB-12 전체 memory rebuild·global runnable query 보정 테스트 보고서

## 판정

- [X] **PASS · 기능 보정 2026-09-13, production query 근거 보정 2026-09-18 KST**
- 전체 memory rebuild가 failed-only generation을 실제 실행 가능한 `pending/attempts=0/error=null`로 재활성화한다.
- 사용자 중지 의미인 paused generation은 ID·상태·attempts·error를 보존한다.
- global runnable project 조회는 completed와 attempts 5 이상 failed를 물리적으로 포함하지 않는 partial index를 명시적으로 사용한다.
- 50,000건 completed history와 pending 1건에서 production과 공유하는 query builder의 plan, 독립 warm-up 뒤 50회 순차 p50/p95/p99를 검증했다. 상세 수치는 [DB-12B 보고서](test2/db-12b-production-query-evidence-test-report.md)를 따른다.

## 추적성

| 항목 | 값 |
| --- | --- |
| 기준 요구사항 | `database.md` DB-12, `implementation-todo.md` DB-12 |
| enqueue 코드 | `src/main/services/features/dbMaintenance/dbMaintenanceMemory.ts`, `memoryBuildJobEnqueue.ts` |
| 조회 코드 | `dbMaintenanceService.ts`, `memory/projection/jobPolicy.ts` |
| schema 경로 | `database/schema/memory.ts`, packaged bootstrap/index patches, `drizzle/main/0002_busy_roughhouse.sql` |
| 영구 회귀 테스트 | `dbMaintenanceService.test.ts`, `derivedJobRunnableSelection.test.ts` |
| 테스트 레벨 | Real Main/Cache DB Integration, Schema Migration, Worker Unit Mocked |
| 설계 기법 | 상태 전이, 결정 테이블, 오류 추정, 경계값 분석, 성능 효율성 회귀 |
| 기준 HEAD | `b76d6f0e` 위 미커밋 작업 트리 |
| 환경 | Darwin arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0, better-sqlite3/SQLite 3.53.4 |

## 변경 계약

1. 전체 rebuild에서 해당 target/jobType에 failed만 있으면 단건 enqueue와 같은 generation 재활성화 규칙을 적용한다.
2. 재활성화는 row ID를 교체해 이전 selector의 claim을 무효화하고 `pending/0/null`을 만든다.
3. paused가 하나라도 있으면 사용자 중지 상태를 보존하며 새 pending을 만들지 않는다.
4. running만 있으면 현재 실행을 덮지 않고 pending successor를 추가한다. 기존 pending이 있으면 중복을 추가하지 않는다.
5. 새 pending을 만들거나 failed를 재활성화하면 derived worker wake-up을 요청한다.
6. global query의 결과 의미는 `pending OR retry-backoff가 지난 failed(attempts 0~4)`이며 기존 우선순위를 바꾸지 않는다.
7. `MemoryBuildJob_global_runnable_idx`는 `pending OR (failed AND attempts < 5)`인 row만 저장한다. completed와 attempts 5 이상 failed는 index scan 입력에 들어가지 않는다.
8. migration, 신규 packaged schema, Prisma baseline용 index patch가 같은 index 정의를 제공한다.

## 상태 모델

| 상태 | 설명 | 기대 전이 |
| --- | --- | --- |
| F0 | rebuild_chunks가 `failed/5/error`, rebuild_embedding이 `paused/3/error` | 입력 |
| F1 | project 전체 rebuild 요청 | 처리 |
| F2 | chunk는 새 ID의 `pending/0/null`, embedding은 F0 그대로 | 허용 |
| F3 | 응답만 queued이고 chunk가 `failed/5`로 남음 | 금지 |
| Q0 | 같은 project에 completed 50,000건, pending 1건 | 입력 |
| Q1 | global runnable query가 partial index에서 pending project를 찾음 | 허용 |
| Q2 | 기존 project-first covering index 전체를 scan함 | 금지 |

기능 전이는 `F0 → F1 → F2`, query 전이는 `Q0 → Q1`이어야 한다. 보정 전에는 각각 `F3`, `Q2`가 관찰됐다.

## 결정 테이블

| 동일 key의 현재 상태 집합 | 전체 rebuild 결과 | 이유 |
| --- | --- | --- |
| 없음 | pending insert | 새 작업 |
| pending 포함 | 기존 pending 유지 | 중복 방지 |
| paused 포함 | paused 유지 | 사용자 중지 보존 |
| running만 존재 | pending successor insert | 실행 중 generation을 덮지 않음 |
| failed만 존재 | 최신 공통 enqueue 규칙으로 ID 교체·pending reset | terminal generation 재활성화 |

## 테스트 사전 조건과 데이터 격리

- 실제 DB 테스트에는 `SKIP_DB_TEST_SETUP`을 사용하지 않았다.
- `tests/setup.ts`가 worker별 `drizzle/.tmp/vitest-<id>/db.sqlite`와 cache DB를 준비하고 테스트마다 row를 정리한다.
- 사용자 DB, 사용자 `.luie`, 실제 Supabase는 사용하지 않았다. Electron 객체는 공통 테스트 mock이다.
- query test는 recursive CTE로 completed job 50,000건을 한 임시 main DB에 넣고 pending 1건을 추가한 뒤 `ANALYZE`를 실행했다.
- 최신 측정은 같은 warm 연결에서 5회 독립 warm-up 뒤 실제 `listProjectsWithPendingMemoryJobs(20)`을 50회 순차 호출했다. p50/p95/p99는 정렬된 duration 표본에서 계산한다.

## 테스트 케이스

### TC-DB-12-R1 · 전체 rebuild failed/paused 상태 전이

| 항목 | 명세 |
| --- | --- |
| 목적 | 접수 응답과 실제 실행 가능 상태가 모순되지 않는지 확인 |
| 사전 상태 | 같은 chapter의 chunk=`failed/5/TERMINAL_CHUNK`, embedding=`paused/3/USER_PAUSED` |
| 입력 | `rebuildMemoryChunks({ projectId })` |
| 관찰점 | 반환값, 각 job의 ID/status/attempts/error |
| 통과 조건 | `{queued:1, processed:0}`, chunk ID 변경·`pending/0/null`, paused 전체 상태 보존 |
| 보정 전 실제 결과 | **FAIL** — 응답은 queued=1, chunk는 `failed/5/TERMINAL_CHUNK` 유지 |
| 보정 후 실제 결과 | **PASS** |

### TC-DB-12-R2 · 50,000 terminal history의 실제 global query

| 항목 | 명세 |
| --- | --- |
| 목적 | representative 단건 query가 아니라 worker가 호출하는 전역 query의 history scan 제거 확인 |
| 사전 상태 | completed 50,000건, pending 1건, migration/bootstrap 적용, `ANALYZE` 완료 |
| 입력 | `listProjectsWithPendingMemoryJobs(20)` 5회 warm-up + 50회 순차 표본과 같은 query builder의 `EXPLAIN QUERY PLAN` |
| 관찰점 | 반환 project, sqlite_master index SQL, plan detail, p50/p95/p99 |
| 통과 조건 | 매회 pending project 1개, partial `WHERE` 존재, plan에 global index, p50≤p95≤p99, p95 < 50ms |
| 보정 전 실제 결과 | **FAIL** — `SCAN MemoryBuildJob USING COVERING INDEX MemoryBuildJob_runnable_idx`와 `USE TEMP B-TREE FOR ORDER BY` |
| 보정 후 실제 결과 | **PASS** — `SCAN ... MemoryBuildJob_global_runnable_idx`; p95 상한 통과 |

보정 후에도 `USE TEMP B-TREE FOR GROUP BY`와 `USE TEMP B-TREE FOR ORDER BY`는 plan에 남는다. 두 작업은 completed/terminal history 전체가 아니라 partial index가 반환한 runnable 후보 집합에만 적용된다.

### TC-DB-12-R3 · 기존 retry·worker·schema 회귀

| 항목 | 명세 |
| --- | --- |
| 목적 | runnable 의미, source generation reset, idle wake-up, schema parity 보존 |
| 입력 | terminal 40건 뒤 pending 선택, failed backoff, 4,999ms idle 후 wake-up, packaged/Drizzle schema |
| 통과 조건 | 실제 DB 5개 파일과 비DB worker 2개 파일 전부 통과, migration check PASS |
| 실제 결과 | **PASS — 실제 DB 5 files/35 tests, 비DB 2 files/3 tests** |

## TDD 실행 기록

### RED · 재현 우선

```sh
pnpm exec vitest run \
  tests/main/services/dbMaintenanceService.test.ts \
  tests/main/services/derivedJobRunnableSelection.test.ts
```

상태: 제품 보정 전 실제 worker별 main/cache SQLite를 사용했다. functional fixture와 50,000건 query fixture는 서로 다른 worker DB에 격리됐다.

결과: **2 files failed, 2 failed / 8 passed**.

- functional: expected `pending/0/null`, received `failed/5/TERMINAL_CHUNK`.
- query: `MemoryBuildJob_global_runnable_idx`가 없어 index SQL assertion이 실패했다. 당시 실제 plan은 기존 covering index 전체 scan과 ORDER BY TEMP B-TREE였다.

### GREEN · 기능과 query plan

```sh
pnpm exec vitest run \
  tests/main/services/dbMaintenanceService.test.ts \
  tests/main/services/derivedJobRunnableSelection.test.ts
```

결과: **2 files passed, 10 tests passed**.

- failed-only key에 이미 사용 중인 `upsertMemoryBuildJob`을 적용해 generation 교체·reset·wake-up 규칙을 재사용했다.
- runnable predicate에 partial-index 조건을 명시하고 실제 global query에 `INDEXED BY MemoryBuildJob_global_runnable_idx`를 적용했다.
- 임시 측정 확인 실행에서 50,000 completed + 1 pending 조건의 20회 p95는 **0.266ms**였다. 이 값은 아래 50ms 회귀 상한보다 작지만 단일 warm 로컬 실행값이다.

## 확대 회귀와 정적 검사

```sh
pnpm exec vitest run \
  tests/main/services/derivedJobRunnableSelection.test.ts \
  tests/main/services/dbMaintenanceService.test.ts \
  tests/main/services/memoryProjectionService.test.ts \
  tests/main/services/chapterSummaryProjector.test.ts \
  tests/main/database/schemaParity.test.ts
```

결과: **5 files passed, 35 tests passed**. 실제 worker별 main/cache SQLite, sqlite-vec/FTS bootstrap과 schema parity를 사용했다.

```sh
SKIP_DB_TEST_SETUP=1 pnpm exec vitest run \
  tests/main/services/derivedJobWorkerWakeup.test.ts \
  tests/main/services/embeddingProjector.test.ts
```

결과: **2 files passed, 3 tests passed**. fake timer와 database module mock을 쓰는 비DB scheduler/worker 범위다.

```sh
pnpm run check:drizzle:main
```

결과: **PASS — Everything's fine**. `0002_busy_roughhouse.sql`, journal, snapshot이 schema와 일치한다.

```sh
pnpm exec eslint <DB-12 변경 source와 테스트>
```

과거 실행에서는 순차 측정 loop를 `Promise.all`로 바꿔 lint를 통과시켰으나 latency 근거가 무효해졌다. DB-12B는 promise chain으로 순차 실행을 유지하면서 **PASS, error 0개**를 확인했다.

```sh
pnpm run typecheck
```

결과: **기존 renderer 오류 1건으로 실패**했다. DB-12 변경 파일에서는 TypeScript 오류가 보고되지 않았다.

```text
src/renderer/src/features/manuscript/components/Sidebar.tsx(157,5):
TS6133: 'handleRenameProject' is declared but its value is never read.
```

```sh
pnpm run build
```

결과: **PASS — main 938, preload 31, renderer 2,952 modules transformed**.

```sh
git diff --check
```

결과: **PASS**.

최종 통합 회귀는 실제 DB R1 **19 files/77 tests**, 비DB R2 **14 files/101 tests**, 합계 **33 files/178 tests PASS**였다.

## 진입·종료 기준

- 진입 기준: failed-only 전체 rebuild와 실제 global query plan 반례가 현재 service/SQLite에서 재현될 것.
- 종료 기준: failed/paused 상태 전이, 50,000건 query 결과·partial plan·p95 상한, 기존 retry/idle/schema 회귀, migration check, ESLint, build가 통과할 것. 전체 typecheck의 별도 기존 오류는 원인과 파일을 분리 기록할 것.
- 현재 결과: 기능 보정과 DB-12B production query 근거가 모두 종료 기준을 충족해 DB-12를 `[X]`로 전환한다.

## 검증 한계

- p95 0.266ms는 한 macOS arm64 warm 임시 DB 실행값이다. 제품 SLA, 저속/외장 디스크, cold cache, 배터리 소비를 대표하지 않는다.
- plan은 partial index 전체를 scan하고 runnable project의 GROUP BY/ORDER BY에 TEMP B-TREE를 쓴다. completed와 exhausted failed history 증가에는 독립적이지만 runnable backlog 자체가 매우 커지는 경우 별도 측정이 필요하다.
- migration과 packaged bootstrap의 SQL parity는 확인했지만 이미 배포된 실제 사용자 DB 업그레이드와 packaged Electron 재시작은 실행하지 않았다.
- 전체 rebuild의 failed-only·paused·기존 running successor 회귀를 확인했다. 여러 failed duplicate row가 같은 key에 동시에 존재하는 비정상 DB 복구 정책은 이번 계약에 포함하지 않았다.
