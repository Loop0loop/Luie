# Database·저장 파이프라인 구현 TODO

기준 문서: [`../performance-audit-2026-09-08/database.md`](../performance-audit-2026-09-08/database.md)

최신 판정: **2026-09-18 코드 보정 완료, 실환경 검증 미완료**. DB-11A·DB-11B·DB-04B·DB-06B 정확성 반례, DB-12B production query 근거, database 누적 변경의 source LOC 위반 8건을 보정했다. 완료 근거는 [`test2/implementation-todo.md`](test2/implementation-todo.md)와 최종 회귀 보고서에 기록한다.

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
- [X] **DB-04** derived job enqueue·claim·complete에 source generation token을 적용한다.
  - 구현: pending/failed source 재enqueue는 pending UUID를 교체하고, paused는 상태를 유지한 채 UUID와 retry 상태를 교체한다. running은 별도 pending successor를 만든다.
  - 완료 조건: 처리 중 새 source가 저장되면 이전 source 결과로 `completed`를 확정하지 않는다.
  - 테스트: [`db-04-preclaim-generation-remediation-test-report.md`](db-04-preclaim-generation-remediation-test-report.md), [`test2/db-04b-paused-generation-remediation-test-report.md`](test2/db-04b-paused-generation-remediation-test-report.md)

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
- [X] **DB-06** 전체 rebuild·단건 upsert·단건 clear를 transaction으로 처리하고 rowid mapping을 사용한다.
  - 구현: 전체 rebuild prepared INSERT, 단건 projection·FTS 교체·mapping과 clear의 mapping 조회·projection·FTS 삭제를 각각 한 동기 transaction으로 처리, FTS 부재 projection fallback.
  - 완료 조건: 동일 chapter 동시 upsert와 clear/upsert 결합 뒤 projection/FTS 각 1건과 mapping 일치, 다른 project 보존, mapping 실패 시 전체 단건 갱신 rollback.
  - 테스트: [`db-06-concurrent-upsert-remediation-test-report.md`](db-06-concurrent-upsert-remediation-test-report.md), [`test2/db-06b-clear-transaction-remediation-test-report.md`](test2/db-06b-clear-transaction-remediation-test-report.md)
- [X] **DB-08** 변하지 않은 memory chunk와 embedding을 보존한다.
  - 테스트: [`db-08-memory-chunk-reuse-test-report.md`](db-08-memory-chunk-reuse-test-report.md)
- [X] **DB-09** autosave/manual revision reason을 구분한 뒤 ChapterRevision 보관 정책과 상한을 확정한다.
  - 정책: 5분 autosave coalescing, chapter별 최신 100개 보관.
  - 구현: reason 분리, autosave coalescing, 저장 transaction 안의 SQL subquery retention. 삭제 대상 ID를 애플리케이션 bind 목록으로 만들지 않는다.
  - 완료 조건: 기존 revision 33,000건의 첫 저장 성공·최신 100건, 5분 경계 전후, 삭제 실패 시 본문과 revision rollback.
  - 테스트: [`db-09-large-history-remediation-test-report.md`](db-09-large-history-remediation-test-report.md)
- [X] **DB-12** 실행 가능 job 조건을 SQL에 넣고 전체 rebuild 재활성화, partial index, idle wake-up을 적용하며 production query latency와 SQL plan을 검증한다.
  - 구현: failed-only 전체 rebuild는 generation ID 교체와 pending/0/null reset, paused 보존. global query는 completed·exhausted failed를 제외한 partial index를 명시적으로 사용한다.
  - 완료 조건: 상태 전이 matrix, 50,000 terminal + 1 pending production query plan, 독립 warm-up 뒤 50회 순차 p50/p95/p99와 p95 < 50ms, migration/schema, idle wake-up 통과.
  - 테스트: [`db-12-full-rebuild-global-query-remediation-test-report.md`](db-12-full-rebuild-global-query-remediation-test-report.md), [`test2/db-12b-production-query-evidence-test-report.md`](test2/db-12b-production-query-evidence-test-report.md)
- [X] **DB-13** 키워드 출현 변경을 집합 단위 transaction으로 처리한다.
  - 테스트: [`db-13-keyword-appearance-transaction-test-report.md`](db-13-keyword-appearance-transaction-test-report.md)
- [X] **DB-14** 기존 low-end `vectorSearchMode`를 실제 search executor에 연결한다.
  - 테스트: [`db-14-low-end-vector-policy-test-report.md`](db-14-low-end-vector-policy-test-report.md)

## 4. 원격 동기화

- [X] **DB-07** 모든 원격 table 조회에 안정적 pagination과 종료 검증을 적용한다.
  - 테스트: [`db-07-remote-pagination-test-report.md`](db-07-remote-pagination-test-report.md)
- [X] **DB-11** baseline/hash/`updatedAt`으로 변경된 row만 local apply와 remote upsert에 포함하고 후속 정확성 반례를 보정한다.
  - 구현: local/remote row delta, no-op write 생략, world/memo sibling 비변경. local apply 뒤 package는 stale merged payload 대신 `ProjectExportQueue`가 authoritative DB에서 구성한다.
  - [X] DB-11A: world tombstone을 local DB에 보존해 즉시 export·실패 retry·DB 재연결에서 package fallback 부활을 막고 local save 시 되살린다.
  - [X] DB-11B: apply transaction에서 current chapter와 snapshot을 비교하고, stale이면 local을 1회 재수집해 B/C conflict 또는 bounded stale 실패로 끝낸다.
  - 테스트: [`db-11-authoritative-package-remediation-test-report.md`](db-11-authoritative-package-remediation-test-report.md), [`test2/db-11a-world-deletion-remediation-test-report.md`](test2/db-11a-world-deletion-remediation-test-report.md), [`test2/db-11b-concurrent-chapter-remediation-test-report.md`](test2/db-11b-concurrent-chapter-remediation-test-report.md)

## 후속 진행 순서

1. [X] database 누적 변경의 source LOC 실패 8건을 책임별 파일로 분리했다. `check:source-loc`에는 기존 범위 16건만 남는다.
2. 현재 소스의 실제 Electron·사용자 규모 package에서 p95/p99·실패율·event-loop·write bytes와 crash/restart 범위를 확장 검증한다.

DB-10E는 DB-10D 측정으로 전체 export가 여전히 병목일 때만 구현한다. 현재는 측정 gate 미충족으로 확대 보류 판정을 완료했다.

최종 통합 검증: [`final-database-regression-test-report.md`](final-database-regression-test-report.md)
