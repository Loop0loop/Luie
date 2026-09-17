# DB-06 FTS transaction·rowid 테스트 보고서

## 최신 보정 판정 · 2026-09-13

현재 판정: **PASS · 단건 upsert/clear 보정 완료**. projection upsert·FTS 교체·mapping과 clear의 mapping 조회·projection/FTS 삭제를 각각 한 동기 cache transaction에 넣었다. upsert는 [보정 보고서](db-06-concurrent-upsert-remediation-test-report.md), clear 결합 전이는 [DB-06B 보고서](test2/db-06b-clear-transaction-remediation-test-report.md)를 기준으로 한다.

### 보정 전 QA 재현 기록

- [chapterSearchCacheService.ts](../../../src/main/services/features/search/chapterSearchCacheService.ts)의 `upsertChapter`는 projection `.returning()` 뒤 await 경계를 거쳐 이전 `ftsRowId`를 `syncFtsDocument`에 넘긴다. 같은 chapter에 두 호출이 겹치면 둘 다 같은 이전 rowid를 삭제해 첫 호출이 새로 만든 FTS row를 두 번째 호출이 제거하지 못한다.
- 실제 service에 동일 chapter의 `upsertChapter` 두 개를 `Promise.all`로 실행한 native SQLite `:memory:` 재현에서 FTS에는 alpha/rowid3와 beta/rowid4 두 건이 남고 projection은 beta/ftsRowId4 한 건이었다. 다른 chapter 한 건을 함께 준비해 이전 rowid가 최댓값이 아닌 조건을 사용했다. 직접 cache 갱신과 dirty worker 갱신의 두 owner가 실제 호출 경로에 남아 있다.
- 재현은 Node v22.23.0, SQLite 3.53.4, 현재 migration/schema와 실제 service를 사용했으며 singleton/cache 연결·logger만 격리했다. `node /private/tmp/luie-db04-current-review.cjs` 출력의 `concurrentFtsUpserts`에서 확인했다. 임시 스크립트는 영구 회귀 테스트가 아니다.
- 다음 검색의 `ensureProjectHydrated`가 row count 불일치를 발견하면 전체 rebuild로 복구할 수 있다. 따라서 원고 손실 증거는 아니지만 캐시 일관성과 단건 작업 증폭 문제가 남는다. projection 갱신·현재 rowid 조회·FTS 교체·mapping을 한 동기 transaction으로 묶는 보장과 동시 호출 테스트가 필요하다.

## 문서 정보

| 항목             | 값                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------- |
| 테스트 기준      | `database.md` DB-06                                                                   |
| 테스트 대상      | `ChapterSearchCacheService.rebuildProject`, `syncFtsDocument`, cache schema/migration |
| 테스트 설계 기법 | ISTQB 명세 기반 테스트, 상태 전이, 경계값 분석, 오류 추정                             |
| 테스트 레벨      | Real Main DB / Cache DB Integration, Schema Migration                                 |
| 실행일           | 2026-09-13 KST                                                                        |
| 기준 HEAD        | `0faf4fad`                                                                            |
| 환경             | Darwin arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0, better-sqlite3 SQLite      |

## 변경 계약

- `ChapterSearchDocument.ftsRowId`가 일반 projection row와 FTS virtual table rowid를 연결한다.
- 단건 FTS 갱신과 제거는 mapping이 있으면 `WHERE rowid = ?`를 사용한다. migration 직후 null인 legacy row만 chapterId scan으로 한 번 정리한다.
- project 전체 rebuild는 projection/FTS project clear와 모든 INSERT를 하나의 native SQLite transaction으로 실행한다.
- 반복 INSERT statement는 transaction 전에 한 번 prepare하고 각 chapter parameter만 bind한다.
- FTS5 자체가 없는 환경에서는 transaction rollback 뒤 projection-only fallback을 유지한다.
- 단건 clear는 현재 mapping 조회·projection 삭제·FTS 삭제를 한 transaction에서 실행하며 FTS5 부재 시 projection만 삭제한다.
- 기존 cache DB는 생성된 Drizzle migration과 packaged bootstrap column patch로 `ftsRowId`를 받는다.

## 상태 모델

| 상태 | 설명                                                                     |
| ---- | ------------------------------------------------------------------------ |
| B0   | main DB에 300장, cache에 다른 project row가 존재                         |
| B1   | project clear와 prepared projection/FTS INSERT가 transaction 안에서 실행 |
| B2   | 300개 projection이 각각 올바른 FTS rowid에 연결되고 다른 project는 유지  |
| U0   | 한 chapter의 main DB body만 변경                                         |
| U1   | mapped rowid의 FTS row만 교체되고 다른 chapter FTS row는 불변            |
| E0   | rebuild 도중 특정 projection INSERT가 trigger로 실패                     |
| E1   | 전체 transaction rollback으로 rebuild 전 projection/FTS가 모두 유지      |

검증 전이는 `B0 → B1 → B2`, `U0 → U1`, `B2 → E0 → E1`이다.

## 테스트 케이스

### TC-DB-06-A: 300장 전체 rebuild와 rowid 단건 갱신

| 항목      | 내용                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| 목적      | 전체 rebuild의 batch transaction 결과와 이후 단건 O(1) FTS 경로 확인                                         |
| 사전 상태 | target project 300장, unrelated project 1장                                                                  |
| 입력      | 두 project rebuild → target 한 chapter body 변경 → `refreshChapter`                                          |
| 절차      | projection/FTS rowid join count → unrelated count → 단건 전후 unrelated FTS 비교 → `EXPLAIN QUERY PLAN` 확인 |
| 기대 결과 | target mapping 300, unrelated 1 유지, 변경 chapter만 최신, unrelated row 불변, plan에 `INDEX 0:=`            |
| 실제 결과 | 기대 결과와 일치                                                                                             |
| 결과      | PASS                                                                                                         |

### TC-DB-06-B: rebuild 중간 실패 rollback

| 항목      | 내용                                                                                   |
| --------- | -------------------------------------------------------------------------------------- |
| 목적      | clear와 다건 INSERT가 서로 다른 commit으로 갈라지지 않는지 확인                        |
| 사전 상태 | 3장 rebuild 완료, projection 한 row에 rollback sentinel 저장                           |
| 입력      | 세 번째 chapter projection INSERT에서 `RAISE(ABORT, 'forced rebuild failure')` trigger |
| 절차      | rebuild 실패 assertion → trigger 제거 → projection count/sentinel/FTS mapping 재조회   |
| 기대 결과 | 오류 전달, count=3, sentinel 유지, projection-FTS mapping=3                            |
| 실제 결과 | 기대 결과와 일치                                                                       |
| 결과      | PASS                                                                                   |

### TC-DB-06-C: schema·migration parity

| 항목      | 내용                                                          |
| --------- | ------------------------------------------------------------- |
| 목적      | 신규/기존 cache DB 모두 `ftsRowId` column을 갖는지 확인       |
| 사전 상태 | 빈 임시 SQLite DB                                             |
| 입력      | packaged bootstrap SQL과 Drizzle cache migrations를 각각 실행 |
| 절차      | 전체 schema 비교 및 `drizzle-kit check`                       |
| 기대 결과 | 두 schema 동일, migration journal 유효                        |
| 실제 결과 | 기대 결과와 일치                                              |
| 결과      | PASS                                                          |

## 실행 기록

### 통합·schema 회귀 테스트

```sh
pnpm exec vitest run \
  tests/main/services/chapterSearchCacheRebuild.test.ts \
  tests/main/services/dbMaintenanceService.test.ts \
  tests/main/database/schemaParity.test.ts
```

상태: worker별 실제 main/cache SQLite DB에 300장 경계 데이터를 넣었다. trigger 실패는 임시 cache DB에서만 주입했으며 테스트 후 제거했다. 사용자 DB는 사용하지 않았다.

결과: **3 files passed, 17 tests passed**.

초기 실행에서 schema parity가 새 column에 대응하는 migration이 없어 1건 실패했다. `pnpm run generate:drizzle:cache`로 `0001_orange_scalphunter.sql`과 journal/snapshot을 생성한 뒤 같은 범위가 통과했다. 함께 시도한 `tests/scripts/cacheIsolationBoundary.test.ts`는 이번 변경과 무관하게 이미 이동된 `src/main/database/packagedSchema.ts`를 참조해 ENOENT로 실패했다.

### migration 검사

```sh
pnpm run check:drizzle:cache
```

결과: **PASS — Everything's fine**.

### 정적 검사

```sh
pnpm exec eslint \
  src/main/database/cache/cacheDb.ts \
  src/main/database/cache/cacheSchema.ts \
  src/main/database/cache/cachePackagedSchema.ts \
  src/main/services/features/search/chapterSearchCacheService.ts \
  tests/main/services/chapterSearchCacheRebuild.test.ts \
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

이번 DB-06 변경 파일에서는 TypeScript 오류가 보고되지 않았다.

## 판정과 잔여 범위

- 전체 rebuild transaction, prepared INSERT, rowid 단건 경로와 migration parity가 유지됐다. 동시 단건 갱신과 mapping 실패 rollback까지 통과해 현재 DB-06은 완료다.
- 300장은 기능·경계 통합 검증값이다. audit의 1,200장 합성 benchmark를 다시 측정하거나 Electron main event-loop p95/p99를 측정하지 않았다.
- FTS가 없는 환경의 projection fallback 분기는 기존 오류 처리 계약을 유지했지만 이번 실제 FTS 사용 환경에서 FTS module 부재를 재현하지 않았다.
