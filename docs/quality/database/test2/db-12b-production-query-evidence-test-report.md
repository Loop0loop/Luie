# DB-12B production runnable query 근거 보정 보고서

## 현재 판정

- [X] **PASS — production query 공유·순차 p50/p95/p99 측정 완료 (2026-09-18 KST)**
- 기준 parent commit: `9a23054e`

## 원인과 수정

기존 성능 테스트는 20개 호출을 `Promise.all`로 겹쳐 누적 wall time을 표본처럼 사용했고, `EXPLAIN` SQL도 production service와 별도로 복제했다. 따라서 독립 query latency나 실제 production SQL plan의 근거가 아니었다.

`buildPendingMemoryProjectsQuery()`를 production service와 테스트가 함께 사용한다. 테스트는 50,000 completed + 1 pending 실제 SQLite에서 5회 warm-up 뒤 50회 호출을 promise chain으로 순차 실행하고, 동일 builder의 query를 `EXPLAIN QUERY PLAN`에 전달한다.

## 결과

| 항목 | 결과 |
| --- | --- |
| 표본 | warm-up 5회 제외, 순차 50회 |
| p50 | 0.146 ms |
| p95 | 0.583 ms |
| p99 | 1.557 ms |
| 상한 | p95 < 50 ms PASS |
| plan | `SCAN MemoryBuildJob USING COVERING INDEX MemoryBuildJob_global_runnable_idx` |
| 후속 plan | runnable 후보에 `USE TEMP B-TREE FOR GROUP BY`, `USE TEMP B-TREE FOR ORDER BY` |

```sh
pnpm exec vitest run \
  tests/main/services/derivedJobRunnableSelection.test.ts \
  tests/main/services/dbMaintenanceService.test.ts \
  tests/main/services/memoryProjectionService.test.ts \
  tests/main/services/chapterSummaryProjector.test.ts \
  tests/main/database/schemaParity.test.ts
```

결과: **5 files / 35 tests PASS**. 비DB scheduler/worker 회귀는 별도 **2 files / 3 tests PASS**다.

이 수치는 macOS arm64의 worker별 임시 SQLite warm 실행값이며 제품 SLA가 아니다. cold cache, 저사양·배터리, 사용자 규모 runnable backlog, packaged Electron은 후속 release 검증 범위다.
