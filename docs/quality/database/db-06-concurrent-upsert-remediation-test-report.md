# DB-06 동시 단건 FTS upsert 보정 테스트 보고서

## 판정

- [X] **PASS · 2026-09-13 KST**
- 동일 chapter의 projection upsert, 기존 FTS row 제거, 새 FTS row 삽입, `ftsRowId` mapping을 cache DB의 한 동기 transaction에서 실행한다.
- 실제 worker별 cache SQLite에서 두 호출을 같은 tick에 시작해 projection 1건·FTS 1건·정확한 rowid mapping을 확인했다.
- FTS mapping 실패를 `TEMP TRIGGER`로 주입했을 때 오류가 호출자에게 전달되고 projection과 FTS가 모두 이전 상태로 rollback됐다.
- FTS virtual table을 제거한 상태에서는 projection-only upsert와 fallback 검색이 유지되고, 테스트 종료 전에 table을 복원했다.

## 추적성

| 항목 | 값 |
| --- | --- |
| 기준 요구사항 | `database.md` DB-06, `implementation-todo.md` DB-06 |
| 제품 코드 | `src/main/services/features/search/chapterSearchCacheService.ts` |
| 영구 회귀 테스트 | `tests/main/services/chapterSearchCacheRebuild.test.ts` |
| 테스트 레벨 | Real Cache DB Integration |
| 설계 기법 | 상태 전이, 동시성 오류 추정, 오류 주입, 결정 테이블, 회귀 테스트 |
| 기준 HEAD | `b76d6f0e` 위 미커밋 작업 트리 |
| 환경 | Darwin arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0, better-sqlite3/SQLite 3.53.4 |

## 변경 계약

1. `upsertChapter` 한 호출은 projection과 대응 FTS row를 함께 commit한다.
2. 같은 `chapterId`의 호출이 겹쳐도 완료 상태에는 projection 1건과 FTS 1건만 존재한다.
3. projection의 `ftsRowId`는 남은 FTS row의 실제 `rowid`와 같고 두 row의 `searchText`도 같다.
4. FTS가 존재하는 환경에서 projection·FTS·mapping 중 하나가 실패하면 해당 단건 갱신 전체를 rollback하고 오류를 전달한다.
5. FTS table/module 자체가 없는 환경은 기존 projection-only fallback을 유지한다.
6. 다른 project/chapter의 projection과 FTS row는 변경하지 않는다.

## 결함 상태 모델

| 상태 | 설명 | 허용 여부 |
| --- | --- | --- |
| S0 | target과 unrelated chapter가 각각 projection 1·FTS 1로 연결됨 | 허용 |
| S1 | target alpha/beta upsert 두 호출이 같은 JavaScript tick에서 시작됨 | 전이 상태 |
| S2 | projection은 beta지만 alpha/beta FTS가 모두 남음 | 금지 |
| S3 | 마지막 projection과 동일한 FTS 1건만 남고 unrelated mapping 유지 | 허용 |
| E0 | 기존 projection·FTS가 정상 연결됨 | 허용 |
| E1 | 새 FTS 삽입 뒤 mapping UPDATE에서 trigger가 실패함 | 오류 전이 |
| E2 | projection만 새 값이고 FTS는 이전 값임 | 금지 |
| E3 | 오류 전달 후 projection·FTS가 모두 E0와 byte-for-byte 동일함 | 허용 |

정상 전이는 `S0 → S1 → S3`, 오류 전이는 `E0 → E1 → E3`이다. 보정 전 구현은 각각 `S2`, `E2`에 도달했다.

## 테스트 사전 조건과 격리

- `tests/setup.ts`가 worker별 `drizzle/.tmp/vitest-<id>/cache.sqlite`를 만들고 실제 packaged cache schema/FTS5 bootstrap을 적용한다.
- `SKIP_DB_TEST_SETUP`을 사용하지 않았다. 사용자 cache DB와 사용자 `.luie` 파일은 열지 않았다.
- target을 먼저 rebuild하고 unrelated chapter를 나중에 rebuild해 target의 기존 FTS rowid가 전체 최댓값이 아닌 상태를 만들었다.
- 동시성 입력은 timer나 임의 sleep 없이 `Promise.all([upsert(alpha), upsert(beta)])`의 인자 평가 순서로 같은 tick에서 시작했다.
- 실패 주입 trigger는 테스트 cache 연결의 `TEMP TRIGGER`이며 `finally`에서 제거했다.

## 테스트 케이스

### TC-DB-06-R1 · 동시 단건 upsert 중복 재현

| 항목 | 명세 |
| --- | --- |
| 목적 | 보정 전 stale `ftsRowId` 재사용이 FTS 중복을 만드는지 입증 |
| 사전 상태 | target/unrelated 각각 projection 1·FTS 1, target rowid는 최댓값 아님 |
| 입력 | 같은 target chapter에 alpha와 beta upsert를 같은 tick에서 시작 |
| 관찰점 | target `ChapterSearchDocument`와 `ChapterSearchDocumentFts` 직접 조회 |
| 통과 조건 | projection 1, FTS 1, `projection.ftsRowId = FTS.rowid`, 두 `searchText` 동일, unrelated mapping 1 |
| 보정 전 실제 결과 | **FAIL** — FTS row 2건, assertion `expected ... length of 1 but got 2` |
| 보정 후 실제 결과 | **PASS** — FTS 1건과 projection mapping 일치, unrelated mapping 유지 |

### TC-DB-06-R2 · 단건 mapping 실패 rollback

| 항목 | 명세 |
| --- | --- |
| 목적 | projection 갱신과 FTS 교체가 한 원자적 commit 단위인지 확인 |
| 사전 상태 | target projection과 FTS 1건의 전체 row snapshot 저장 |
| 입력 | `UPDATE OF ftsRowId`에서 `RAISE(ABORT, 'forced single mapping failure')` |
| 관찰점 | 반환 Promise rejection, trigger 제거 뒤 projection/FTS 전체 row 재조회 |
| 통과 조건 | 원래 오류 메시지 전달, 갱신 전후 projection/FTS deep equality |
| 중간 구현 실제 결과 | **FAIL** — 오류를 warning으로 삼키고 projection만 `Rejected update`로 commit |
| 최종 구현 실제 결과 | **PASS** — 오류 전달, projection·FTS 모두 이전 상태 유지 |

### TC-DB-06-R3 · FTS table 부재 fallback

| 항목 | 명세 |
| --- | --- |
| 목적 | 원자성 강화가 FTS5 미지원 환경의 projection 검색을 막지 않는지 확인 |
| 사전 상태 | 실제 cache DB에서 `ChapterSearchDocumentFts`만 제거 |
| 입력 | 단건 upsert 후 동일 본문 검색 |
| 통과 조건 | projection 본문 저장, fallback 검색이 chapter 반환, `finally`에서 FTS table 복원 |
| 실제 결과 | **PASS** |

### TC-DB-06-R4 · 기존 rebuild·schema 회귀

| 항목 | 명세 |
| --- | --- |
| 목적 | 단건 수정이 300장 rebuild, project 격리, rebuild rollback, schema parity를 깨지 않는지 확인 |
| 입력 | 300장 rebuild, 단건 body 변경, projection insert 강제 실패, packaged/Drizzle schema 비교 |
| 통과 조건 | 3개 파일의 모든 테스트 통과, migration journal 정상 |
| 실제 결과 | **PASS — 3 files, 19 tests** |

## TDD 실행 기록

### RED 1 · 동시성 결함

```sh
pnpm exec vitest run tests/main/services/chapterSearchCacheRebuild.test.ts
```

상태: 제품 코드를 바꾸기 전에 실제 cache SQLite와 실제 `ChapterSearchCacheService.upsertChapter`를 사용했다.

결과: **1 file failed, 1 failed / 2 passed**. target FTS가 2건 남아 `toHaveLength(1)`에서 실패했다.

### GREEN 1 · 동기 transaction 직렬화

같은 명령의 첫 보정 실행 결과: **1 file passed, 3 tests passed**. 동시 upsert 완료 상태가 projection 1·FTS 1이 됐다.

### RED 2 · 실패 원자성

mapping trigger 테스트를 추가한 뒤 같은 명령을 실행했다.

결과: **1 file failed, 1 failed / 3 passed**. `forced single mapping failure`가 내부 warning으로 소비되어 rejection 조건을 만족하지 못했고 projection만 새 값으로 남았다.

### GREEN 2 · 최종 원자성

```sh
pnpm exec vitest run tests/main/services/chapterSearchCacheRebuild.test.ts
```

결과: **1 file passed, 4 tests passed**.

최종 구현은 Drizzle projection upsert의 동기 `.get()`과 native FTS statement를 하나의 `runSqliteTransaction`에서 실행한다. FTS table/module 부재만 transaction rollback 후 projection-only로 재시도하며, 그 밖의 SQL 오류는 숨기지 않는다.

### fallback branch 회귀 추가

FTS table을 제거한 실제 cache DB에서 projection-only 저장과 fallback 검색을 확인하고 `finally`에서 FTS schema를 복원했다. 같은 전용 파일 결과는 **1 file, 5 tests PASS**였다.

## 확대 회귀와 정적 검사

```sh
pnpm exec vitest run \
  tests/main/services/chapterSearchCacheRebuild.test.ts \
  tests/main/services/dbMaintenanceService.test.ts \
  tests/main/database/schemaParity.test.ts
```

결과: DB-12까지 반영한 최종 재실행에서 **3 files passed, 21 tests passed**. 실제 worker별 main/cache SQLite와 FTS5를 사용했다.

```sh
pnpm run check:drizzle:cache
```

결과: **PASS — Everything's fine**. 이번 보정은 schema/migration을 바꾸지 않았다.

```sh
pnpm exec eslint \
  src/main/services/features/search/chapterSearchCacheService.ts \
  tests/main/services/chapterSearchCacheRebuild.test.ts
```

결과: **PASS, error 0개**.

```sh
pnpm run typecheck
```

결과: **기존 renderer `Sidebar.tsx:157` TS6133 1건으로 실패**했다. DB-06 변경 파일의 TypeScript 오류는 없었고 이후 production build는 main 938, preload 31, renderer 2,952 modules 기준으로 통과했다.

DB-12와 FTS 부재 fallback까지 포함한 최종 통합 회귀에서 실제 DB R1 **19 files/77 tests**, 비DB R2 **14 files/101 tests**, 합계 **33 files/178 tests PASS**였다.

## 진입·종료 기준

- 진입 기준: 실제 service/SQLite에서 FTS 2건 반례가 재현되고, 기존 rebuild 테스트가 기준선으로 실행 가능할 것.
- 종료 기준: 동시성·실패 rollback·300장 rebuild·schema parity가 모두 통과하고 TODO/SSoT/최종 보고서가 같은 상태를 가리킬 것.
- 현재 결과: upsert 범위는 이 보고서에서 완료했고, clear 결합 전이는 [DB-06B 보고서](test2/db-06b-clear-transaction-remediation-test-report.md)에서 완료했다.

## 검증 한계

- 테스트는 한 Electron main process가 소유하는 한 better-sqlite3 연결에서의 재진입 경쟁을 검증한다. 여러 process가 같은 cache 파일을 동시에 쓰는 지원 계약은 검증하지 않았다.
- `Promise.all`은 두 호출의 시작 순서를 고정하지만 OS thread 동시 실행을 뜻하지 않는다. 결함의 원인이었던 `await` 경계와 stale rowid 재사용은 보정 전 RED로 직접 관찰했다.
- FTS table 부재 fallback은 실제 table 제거로 검증했다. 런타임에서 SQLite 자체의 FTS5 module을 제거한 ABI 환경은 재현하지 않았다.
- 300장은 기능 경계값이다. p95/p99, event-loop delay, 저속 디스크 성능은 이 보고서의 PASS 범위가 아니다.
