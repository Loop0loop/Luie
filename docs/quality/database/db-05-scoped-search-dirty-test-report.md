# DB-05 chapter search dirty 범위 축소 테스트 보고서

## 최신 QA 재검토 · 2026-09-13

현재 판정: **단건 dirty 범위 축소는 확인됨 · 두 write owner와 중복 갱신은 유지됨.** 아래 PASS는 단건 처리와 명시적 전체 rebuild 분리에 대한 기록이다. 이번 재검토에서는 제품 코드를 수정하지 않았다.

- [chapterWriteOperations.ts](../../../src/main/services/core/chapter/chapterWriteOperations.ts)의 직접 `upsertChapter`와 [dbMaintenanceService.ts](../../../src/main/services/features/dbMaintenance/dbMaintenanceService.ts)의 dirty `refreshChapter`가 모두 cache를 쓴다. 직접 갱신 성공으로 dirty row를 완료 처리하지 않으므로 worker는 성공한 직접 갱신도 다시 수행한다. worker가 실패·재시작 때만 실행된다는 의미로 해석하면 안 된다.
- 따라서 SSOT의 sourceId 단건 처리 요구는 반영됐으나 실제 cache write owner 단일화는 적용되지 않았다. 두 경로가 겹칠 때 발생하는 rowid 중복은 [DB-06 최신 재검토](db-06-fts-transaction-rowid-test-report.md)에 기록했다.
- 기능 테스트의 target/unrelated 2장 fixture는 쓰기 범위 확인에 적절하지만 300/1,200장 저장 1회당 실제 SQL·commit 수, Electron main event-loop p95/p99를 입증하지 않는다.

## 문서 정보

| 항목             | 값                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------- |
| 테스트 기준      | `database.md` DB-05                                                                         |
| 테스트 대상      | `DbMaintenanceService.processPendingSearchJobs`, `ChapterSearchCacheService.refreshChapter` |
| 테스트 설계 기법 | ISTQB 명세 기반 테스트, 상태 전이, 동등 분할, 회귀 테스트                                   |
| 테스트 레벨      | Real DB / Cache DB Integration                                                              |
| 실행일           | 2026-09-13 KST                                                                              |
| 기준 HEAD        | `0faf4fad`                                                                                  |
| 환경             | Darwin arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0, worker별 실제 SQLite DB          |

## 변경 계약

- 일반 chapter dirty row는 `sourceId`의 chapter 한 건만 main DB에서 읽어 projection과 FTS를 upsert한다.
- source chapter가 삭제됐거나 없으면 해당 chapter cache만 제거한다.
- 같은 batch에 `reason=search:rebuild-all`이 있을 때만 project 전체 index를 rebuild한다.
- 기존 dirty generation 계약에 따라 같은 source의 pending은 갱신하고 running 중 새 변경은 후속 pending row로 남긴다.
- chapter write 직후 direct cache upsert는 즉시 검색 결과를 제공하는 기존 fast path로 유지한다. dirty worker는 직접 갱신 성공 여부와 관계없이 같은 source를 단건 refresh하며 실패·재시작 뒤 복구 역할도 수행한다.

## 상태 모델

| 상태 | 설명                                                               |
| ---- | ------------------------------------------------------------------ |
| S0   | target와 unrelated chapter cache가 모두 존재                       |
| S1   | target main DB body만 변경되고 target dirty row가 pending          |
| S2   | target source만 refresh되어 최신이고 unrelated cache는 그대로 유지 |
| F0   | `search:rebuild-all` row가 pending                                 |
| F1   | project 전체 rebuild가 한 번 실행되고 batch row가 completed        |

검증 전이는 `S0 → S1 → S2`와 `F0 → F1`이다.

## 테스트 케이스

### TC-DB-05-A: chapter source 단건 refresh

| 항목      | 내용                                                                                     |
| --------- | ---------------------------------------------------------------------------------------- |
| 목적      | 한 chapter dirty가 project 전체 rebuild를 유발하지 않는지 확인                           |
| 사전 상태 | target/unrelated 두 chapter projection 존재, unrelated searchText에 sentinel 저장        |
| 입력      | target ChapterBody만 직접 변경하고 target sourceId dirty enqueue                         |
| 절차      | pending 처리 → cache rows 조회 → refresh/rebuild spy 확인                                |
| 기대 결과 | target는 latest body, unrelated는 sentinel 유지, target refresh 1회, project rebuild 0회 |
| 실제 결과 | 기대 결과와 일치                                                                         |
| 결과      | PASS                                                                                     |

### TC-DB-05-B: 명시적 전체 rebuild

| 항목      | 내용                                                           |
| --------- | -------------------------------------------------------------- |
| 목적      | 전체 rebuild 기능을 명시적 maintenance 요청에 유지하는지 확인  |
| 사전 상태 | TC-DB-05-A 단건 처리가 완료된 project                          |
| 입력      | `rebuildSearchIndex(projectId)`                                |
| 절차      | `search:rebuild-all` enqueue → pending 처리 → rebuild spy 확인 |
| 기대 결과 | `rebuildProjectIndex(projectId)` 호출, queue row completed     |
| 실제 결과 | 기대 결과와 일치                                               |
| 결과      | PASS                                                           |

## 실행 기록

### 전용·관련 테스트

```sh
pnpm exec vitest run tests/main/services/dbMaintenanceService.test.ts
```

상태: 실제 main/cache SQLite DB를 사용했다. 사용자 DB는 사용하지 않았고 package persistence만 기존 test boundary에서 mock했다.

결과: **1 file passed, 5 tests passed**.

초기 결합 실행에서는 새 테스트의 cache module import 경로가 실제 index 경로와 달라 suite가 시작되지 않았다. import를 `src/main/database/cache/index.js`로 교정한 뒤 같은 전용 file 전체가 통과했다. 당시 `searchService.test.ts`는 Electron mock의 default export 누락으로 import 단계에서 중단됐으나, DB-09 완료 직후 실제 DB 통합 실행에서는 이 파일을 포함한 18 files/71 tests가 통과해 잔여 실패가 아니었다.

### 정적 검사

```sh
pnpm exec eslint \
  src/main/services/features/search/chapterSearchCacheService.ts \
  src/main/services/features/dbMaintenance/dbMaintenanceService.ts \
  tests/main/services/dbMaintenanceService.test.ts
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

이번 DB-05 변경 파일에서는 TypeScript 오류가 보고되지 않았다.

## 판정과 잔여 범위

- sourceId 단건 처리와 명시적 전체 rebuild 분리가 확인되어 DB-05를 PASS로 판정한다.
- DB-05 단계의 FTS 단건 delete는 UNINDEXED chapterId scan이었다. 현재 worktree에는 DB-06의 transaction/prepared INSERT와 단건 rowid 경로가 적용됐으며, 동시 갱신 회귀는 해당 보고서의 최신 판정을 따른다.
- main event-loop p95/p99와 실제 사용자 규모 프로젝트의 latency는 이번 기능 통합 테스트에서 측정하지 않았다.
