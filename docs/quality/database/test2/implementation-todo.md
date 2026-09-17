# Database 안정화 2차 TODO

기준 문서: [`../../performance-audit-2026-09-08/database.md`](../../performance-audit-2026-09-08/database.md)

표시 규칙:

- `[X]`: 코드·영구 회귀 테스트·ISTQB 실행 기록·SSoT 동기화까지 완료
- `[ ]`: 재현됐지만 수정 또는 검증이 남음

## 수정 순서

- [X] **DB-11A** 원격에서 삭제된 world document가 `.luie` fallback으로 부활하지 않게 한다.
  - 완료 조건: 삭제 상태가 DB에 재시작 가능한 형태로 남고, 즉시 export·실패 후 retry·DB 재연결 뒤 export가 모두 빈 canonical payload를 기록한다.
  - 테스트 보고서: [`db-11a-world-deletion-remediation-test-report.md`](db-11a-world-deletion-remediation-test-report.md)
- [X] **DB-11B** sync snapshot 이후 저장된 동일 chapter를 stale merge가 덮지 않게 한다.
  - 완료 조건: apply 직전 현재 source가 snapshot과 다르면 stale delta를 적용하지 않고 최신 DB 기준 sync를 다시 실행해 conflict 또는 보존 결과를 만든다.
  - 테스트 보고서: [`db-11b-concurrent-chapter-remediation-test-report.md`](db-11b-concurrent-chapter-remediation-test-report.md)
- [X] **DB-04B** pause 중 source 변경의 generation을 보존한다.
  - 완료 조건: `selected A → pause → enqueue B → resume`에서 옛 selector claim이 실패하고 B용 pending generation이 남는다.
  - 테스트 보고서: [`db-04b-paused-generation-remediation-test-report.md`](db-04b-paused-generation-remediation-test-report.md)
- [X] **DB-06B** `clearChapter`의 projection·FTS 삭제를 한 transaction으로 묶는다.
  - 완료 조건: stale rowid 조회와 동시 upsert가 겹쳐도 projection 없는 FTS 고아 행이 남지 않으며 FTS 부재 fallback을 유지한다.
  - 테스트 보고서: [`db-06b-clear-transaction-remediation-test-report.md`](db-06b-clear-transaction-remediation-test-report.md)
- [X] **DB-12B** production runnable query의 순차 latency와 실제 SQL plan을 측정한다.
  - 완료 조건: 독립 warm-up·순차 표본의 p50/p95/p99를 기록하고, production이 실행하는 SQL과 같은 query object 또는 캡처 SQL로 plan을 검사한다.
  - 테스트 보고서: [`db-12b-production-query-evidence-test-report.md`](db-12b-production-query-evidence-test-report.md)
