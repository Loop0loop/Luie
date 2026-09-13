# Database·저장 파이프라인 구현 TODO

기준 문서: [`../performance-audit-2026-09-08/database.md`](../performance-audit-2026-09-08/database.md)

최신 판정: **2026-09-13 QA·code review 기준 안정화 미완료**. 기존 구현과 회귀 154건 통과는 유지하되 DB-04·DB-06·DB-09·DB-11·DB-12를 재개한다. 기준 SSoT의 최신 상태를 이 목록과 [최신 통합 판정](final-database-regression-test-report.md)에 반영했으며, 개별 결과본의 과거 PASS는 현재 항목 종료를 뜻하지 않는다.

표시 규칙:

- `[X]`: 명시한 범위의 구현·검증 또는 조건 판정 완료. 배포 안정성 보증은 아니다.
- `[ ]`: 미완료 또는 QA에서 재개. 기존 구현이 없다는 뜻은 아니다.
- 각 완료 항목은 코드 변경과 ISTQB 형식 테스트 실행 기록을 연결한다.

## 1. 저장 정확성

- [X] **DB-01** 이전 자동 저장 완료가 새 pending 본문을 삭제하지 않도록 저장 세대를 구분한다.
  - 완료 조건: 이전 본문 A 저장 중 새 본문 B가 도착하면 B·timer·저장 상태를 유지하고 B 저장 후에만 `saved`를 발생시킨다.
  - 테스트: [`db-01-02-autosave-save-contract-test-report.md`](db-01-02-autosave-save-contract-test-report.md)
- [X] **DB-02** DB 저장 실패를 flush와 `MANUAL_SAVE`까지 전달한다.
  - 완료 조건: 실패한 pending을 보존하고 package export를 실행하거나 성공으로 응답하지 않는다.
  - 테스트: [`db-01-02-autosave-save-contract-test-report.md`](db-01-02-autosave-save-contract-test-report.md)
- [X] **DB-03** chapter create/update의 async 수동 transaction을 동기 `store.transaction()`으로 교체한다.
  - 완료 조건: transaction callback 안에는 동기 DB statement만 있고 다른 도메인의 쓰기가 chapter rollback에 포함되지 않는다.
  - 테스트: [`db-03-chapter-transaction-test-report.md`](db-03-chapter-transaction-test-report.md)
- [ ] **DB-04 · P1 · 재개** derived job enqueue·claim·complete에 source generation 또는 hash CAS를 적용한다.
  - 구현됨: running row와 후속 pending row의 ID를 분리한다.
  - 잔존: source A를 선조회한 뒤 아직 pending인 job에 B 변경이 합쳐지면, worker는 A로 completed 처리하고 B를 처리할 pending을 남기지 않는다. 실제 native 재현에서 body B/chunk A/completed·pending 0을 확인했다.
  - 완료 조건: 처리 중 새 source가 저장되면 이전 source 결과로 `completed`를 확정하지 않는다.
  - 테스트: [`db-04-derived-job-generation-test-report.md`](db-04-derived-job-generation-test-report.md)

## 2. `.luie` 저장 범위 축소

- [X] **DB-10A** snapshot export limit을 SQL에 적용하고 export chapter 조회에서 legacy 본문 중복 projection을 제거한다.
  - 테스트: [`db-10a-export-query-scope-test-report.md`](db-10a-export-query-scope-test-report.md)
- [X] **DB-10B** 기존 `writeLuieSqliteEntry()`의 entry·`meta.json`·container timestamp 갱신을 한 transaction으로 묶는다.
  - 테스트: [`db-10b-sqlite-entry-transaction-test-report.md`](db-10b-sqlite-entry-transaction-test-report.md)
- [X] **DB-10C** content-only chapter 저장은 `manuscript/{chapterId}.md`와 `meta.json`만 갱신한다.
  - 전체 export 유지 범위: chapter 생성·삭제·순서 변경, Save As, 복구, package 포맷 갱신.
  - 테스트: [`db-10c-chapter-incremental-package-test-report.md`](db-10c-chapter-incremental-package-test-report.md)
- [X] **DB-10D** 실제 파일·강제 종료·재시작 상태에서 incremental entry와 authoritative DB revision의 일치성을 검증한다.
  - 완료 범위: Node child의 writer 호출 전·정상 close 후 SIGKILL과 부모 DB 재연결·recovery API. commit 중 crash, authoritative DB writer 종료, packaged Electron 재실행·전원 차단은 미검증이다.
  - 테스트: [`db-10d-crash-restart-consistency-test-report.md`](db-10d-crash-restart-consistency-test-report.md)
- [X] **DB-10E** 조건 판정 완료: 성능 측정·허용 한계가 없어 world·snapshot incremental 확대를 보류한다.
  - 판정·테스트: [`db-10e-incremental-expansion-decision-test-report.md`](db-10e-incremental-expansion-decision-test-report.md)

## 3. 검색·파생 데이터 증폭 제거

- [X] **DB-05** chapter dirty 처리에서 `sourceId` 단건 upsert를 사용하고 전체 rebuild를 명시적 작업으로 제한한다.
  - 테스트: [`db-05-scoped-search-dirty-test-report.md`](db-05-scoped-search-dirty-test-report.md)
- [ ] **DB-06 · P2 · 재개** 전체 FTS rebuild를 한 transaction과 prepared INSERT로 처리하고 단건 row lookup을 O(1) 경로로 바꾼다.
  - 구현됨: 전체 rebuild transaction/prepared INSERT와 FTS rowid mapping.
  - 잔존: 동일 chapter의 동시 단건 upsert가 이전 rowid를 공유해 projection 1개에 FTS row 2개를 남긴다. 실제 native 재현을 기준으로 단건 projection/FTS 갱신의 경쟁을 함께 해결해야 한다.
  - 테스트: [`db-06-fts-transaction-rowid-test-report.md`](db-06-fts-transaction-rowid-test-report.md)
- [X] **DB-08** 변하지 않은 memory chunk와 embedding을 보존한다.
  - 테스트: [`db-08-memory-chunk-reuse-test-report.md`](db-08-memory-chunk-reuse-test-report.md)
- [ ] **DB-09 · P1 · 재개** autosave/manual revision reason을 구분한 뒤 ChapterRevision 보관 정책과 상한을 확정한다.
  - 정책: 5분 autosave coalescing, chapter별 최신 100개 보관.
  - 구현됨: reason 분리, autosave coalescing, 저장 transaction 내 retention.
  - 잔존: 기존 revision 33,000건의 정리 대상 ID를 단일 `IN`에 넣어 `too many SQL variables`가 발생하고 최신 본문 저장도 rollback된다. 실제 native/Drizzle 재현에서 이전 본문 보존·새 본문 저장 실패를 확인했다. 큰 기존 이력에도 저장 가능한 bounded 삭제가 필요하다.
  - 테스트: [`db-09-chapter-revision-retention-test-report.md`](db-09-chapter-revision-retention-test-report.md)
- [ ] **DB-12 · P2 · 재개** 실행 가능 job 조건을 SQL에 넣고 이에 맞는 index·idle wake-up을 적용한다.
  - 구현됨: SQL runnable 조건, index 추가, memory failed 재활성화, idle wake-up.
  - 잔존 기능 결함: memory chunk의 failed/attempts 5 작업에 전체 memory rebuild를 요청하면 queued 1로 반환하지만 failed/attempts 5가 유지되어 실행되지 않는다. 실제 native DB로 확인했다.
  - 별도 성능 잔존: 실제 global runnable query plan은 covering index SCAN과 TEMP B-TREE를 사용한다. 단순화한 쿼리의 index 검증으로 이 경로를 완료 처리하지 않으며, terminal history 규모별 실제 query plan과 latency를 검증한다.
  - 테스트: [`db-12-runnable-job-sql-wakeup-test-report.md`](db-12-runnable-job-sql-wakeup-test-report.md)
- [X] **DB-13** 키워드 출현 변경을 집합 단위 transaction으로 처리한다.
  - 테스트: [`db-13-keyword-appearance-transaction-test-report.md`](db-13-keyword-appearance-transaction-test-report.md)
- [X] **DB-14** 기존 low-end `vectorSearchMode`를 실제 search executor에 연결한다.
  - 테스트: [`db-14-low-end-vector-policy-test-report.md`](db-14-low-end-vector-policy-test-report.md)

## 4. 원격 동기화

- [X] **DB-07** 모든 원격 table 조회에 안정적 pagination과 종료 검증을 적용한다.
  - 테스트: [`db-07-remote-pagination-test-report.md`](db-07-remote-pagination-test-report.md)
- [ ] **DB-11 · P1 · 재개** baseline/hash/`updatedAt`으로 변경된 row만 local apply와 remote upsert에 포함한다.
  - 구현됨: local/remote row delta, no-op write 생략, world/memo sibling 비변경.
  - 잔존: local snapshot A 이후 B를 저장·flush한 동안 remote character만 바뀌면, delta는 DB 본문 B를 유지하지만 오래된 merged bundle A로 package를 만들고 최신 revision을 캡처한다. 실제 delta/applier와 DB·파일 mock으로 재현했고 실제 write/mark 소스를 교차 확인했다. 현재 DB와 package payload가 같은 revision을 대표하는지 보장해야 한다.
  - 테스트: [`db-11-sync-delta-test-report.md`](db-11-sync-delta-test-report.md)

## 후속 진행 순서

1. P1: DB-04 source 조회/claim 경쟁, DB-09 대량 기존 revision 저장 실패, DB-11 stale package/revision 불일치.
2. P2: DB-06 단건 FTS 경쟁, DB-12 전체 memory rebuild 재활성화와 실제 runnable query plan.
3. 신규 source LOC 게이트 실패 7건을 기존 실패 16건과 분리해 처리한다.
4. 현재 소스의 실제 Electron·사용자 규모 package에서 p95/p99·실패율·event-loop·write bytes와 crash/restart 범위를 확장 검증한다.

DB-10E는 DB-10D 측정으로 전체 export가 여전히 병목일 때만 구현한다. 현재는 측정 gate 미충족으로 확대 보류 판정을 완료했다.

최종 통합 검증: [`final-database-regression-test-report.md`](final-database-regression-test-report.md)
