# DB-13 키워드 출현 집합 transaction 테스트 보고서

## 문서 정보

| 항목             | 값                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------- |
| 테스트 기준      | `database.md` DB-13                                                                |
| 테스트 대상      | chapter content commit 경계, `trackKeywordAppearances`, `AppearanceCacheService`   |
| 테스트 설계 기법 | ISTQB 명세 기반 테스트, 상태 전이, 오류 주입, 경계값 분석                          |
| 테스트 레벨      | Real Main/Cache DB Integration, Chapter Write Integration                          |
| 실행일           | 2026-09-13 KST                                                                     |
| 기준 HEAD        | `0faf4fad`                                                                         |
| 환경             | Darwin arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0, worker별 실제 SQLite DB |

## 변경 계약

- keyword tracking은 chapter transaction이 성공한 뒤 committed content로만 dispatch한다.
- 동일 본문 no-op과 chapter transaction rollback은 keyword tracking을 dispatch하지 않는다.
- chapter의 기존 appearance 삭제와 새 character/term appearance 전체 INSERT는 cache SQLite transaction 하나로 처리한다.
- character/term 이름 lookup은 호출별 `Map`을 사용한다. 전역 `keywordExtractor`의 mutable known-name 상태를 공유하지 않아 동시 rebuild가 서로의 entity 집합을 덮지 않는다.
- firstAppearance는 출현별 SELECT/export를 하지 않는다. unique entity ID마다 main DB transaction 안에서 `firstAppearance IS NULL AND deletedAt IS NULL` 조건 UPDATE를 한 번 수행한다.
- firstAppearance가 실제로 바뀐 경우 package export queue를 project당 한 번 schedule한다.

## 상태 모델

| 상태 | 설명                                                             |
| ---- | ---------------------------------------------------------------- |
| C0   | ChapterBody에 이전 본문, appearance projection은 이전 집합       |
| C1   | 새 본문 chapter transaction commit                               |
| C2   | committed content로 appearance replace transaction 실행          |
| N0   | C1과 같은 본문을 다시 저장                                       |
| N1   | DB write와 keyword dispatch 없이 기존 appearance 유지            |
| R0   | revision INSERT trigger가 chapter transaction을 강제 실패        |
| R1   | ChapterBody rollback, keyword dispatch 없음                      |
| A0   | chapter appearance 1,000개가 저장된 상태                         |
| A1   | replacement INSERT 501번째에 trigger 오류                        |
| A2   | delete와 앞선 500개 INSERT가 함께 rollback되어 기존 1,000개 유지 |

검증 전이는 `C0 → C1 → C2`, `C2 → N0 → N1`, `C2 → R0 → R1`, `A0 → A1 → A2`다.

## 테스트 케이스

### TC-DB-13-A: 1,000개 appearance 집합 commit과 중간 실패 rollback

| 항목      | 내용                                                                                   |
| --------- | -------------------------------------------------------------------------------------- |
| 목적      | delete와 다건 INSERT가 하나의 cache commit 단위인지 확인                               |
| 사전 상태 | 실제 cache DB에 동일 chapter의 character appearance 1,000개                            |
| 입력      | position 500 INSERT에서 `RAISE(ABORT)`하는 trigger를 설치하고 1,000개 replacement 실행 |
| 절차      | 최초 count 확인 → 실패 assertion → trigger 제거 → count와 position 500 context 재조회  |
| 기대 결과 | 최초 1,000개 commit, replacement 전체 실패, 기존 1,000개와 `context-500` 유지          |
| 실제 결과 | 기대 결과와 일치                                                                       |
| 결과      | PASS                                                                                   |

### TC-DB-13-B: 반복 이름·unique firstAppearance·export coalescing

| 항목      | 내용                                                                                           |
| --------- | ---------------------------------------------------------------------------------------------- |
| 목적      | 같은 entity 이름 반복 시 entity update/export가 출현 횟수만큼 증폭되지 않는지 확인             |
| 사전 상태 | firstAppearance가 null인 character와 실제 chapter                                              |
| 입력      | `"하린 "` 1,000회 본문을 직접 tracking                                                         |
| 절차      | cache appearance 수, Character.firstAppearance, schedulePackageExport 호출 수 확인             |
| 기대 결과 | extractor 의미에 따라 chapter/entity appearance 1개, firstAppearance 설정, export schedule 1회 |
| 실제 결과 | 기대 결과와 일치                                                                               |
| 결과      | PASS                                                                                           |

감사 문서의 “같은 인물 1,000회면 appearance INSERT 1,000회” 가정은 현재 `KeywordExtractor`의 호출 내 `seen` dedupe 때문에 그대로 발생하지 않는다. 다만 cache API 자체의 1,000개 경계와 여러 고유 entity의 batch 처리 경로를 TC-DB-13-A로 검증했다.

### TC-DB-13-C: commit 이후 dispatch, no-op, rollback

| 항목      | 내용                                                                                       |
| --------- | ------------------------------------------------------------------------------------------ |
| 목적      | 저장되지 않은 본문으로 derived appearance가 먼저 바뀌지 않도록 commit 경계 확인            |
| 사전 상태 | 실제 Chapter/ChapterBody에 `committed old body`, production-style derived dispatch 활성화  |
| 입력      | 새 본문 성공 저장 → 같은 본문 no-op → revision trigger가 실패시키는 다른 본문 저장         |
| 절차      | tracking callback 안에서 실제 ChapterBody 조회, 호출 수, 실패 뒤 body 재조회               |
| 기대 결과 | 첫 callback이 새 committed body 관찰, no-op 호출 0, 실패 저장 호출 0, body는 마지막 성공값 |
| 실제 결과 | 기대 결과와 일치                                                                           |
| 결과      | PASS                                                                                       |

### TC-DB-13-D: 기존 appearance 격리 회귀

| 항목      | 내용                                                                                           |
| --------- | ---------------------------------------------------------------------------------------------- |
| 목적      | character/term 개별 rebuild, late entity 생성, project 삭제가 새 replace API와 호환되는지 확인 |
| 사전 상태 | 실제 main/cache DB, async rebuild는 `vi.waitFor`로 완료를 관찰                                 |
| 입력      | chapter 재저장, 본문 이후 character 생성, project 삭제                                         |
| 기대 결과 | 중복 없음, late appearance 생성, 삭제 뒤 character/term cache 0                                |
| 실제 결과 | 기대 결과와 일치                                                                               |
| 결과      | PASS                                                                                           |

## 실행 기록

### 실제 DB 통합·회귀

```sh
pnpm exec vitest run \
  tests/main/services/chapterKeywordAppearanceTransaction.test.ts \
  tests/main/services/core/chapter/chapterKeywordDispatchAfterCommit.test.ts \
  tests/main/services/appearanceCacheIsolation.test.ts \
  tests/main/services/chapterContentValidation.test.ts \
  tests/main/services/core/chapter/chapterWriteTransaction.test.ts
```

상태: worker별 사용자 데이터와 분리된 실제 main/cache SQLite DB를 사용했다. cache trigger와 main revision trigger는 해당 테스트 임시 connection에만 설치하고 `finally`에서 제거했다. chapter dispatch 테스트는 production 경계처럼 `SKIP_NONCRITICAL_DERIVED_ON_STRESS=false`로 고정했다.

결과: **5 files passed, 19 tests passed**.

초기 회귀 실행에서 `appearanceCacheIsolation.test.ts`가 DB-10C 이후 존재하지 않는 `/tmp/*.luie`에 실제 incremental write를 시도했고, 과거 Prisma-like `client.characterAppearance.count()` 호출을 사용해 실패했다. package persistence를 기존 테스트 경계에서 mock하고 count를 현행 Drizzle query로 교정했다. 비동기 entity rebuild assertion도 완료 상태를 `vi.waitFor`로 관찰하도록 수정한 뒤 같은 범위가 통과했다.

### 정적 검사

```sh
pnpm exec eslint \
  src/main/services/features/manuscript/chapterKeywords.ts \
  src/main/services/features/world/cache/appearanceCacheService.ts \
  src/main/services/core/chapter/chapterContentValidation.ts \
  src/main/services/core/chapter/chapterWriteOperations.ts \
  tests/main/services/chapterKeywordAppearanceTransaction.test.ts \
  tests/main/services/core/chapter/chapterKeywordDispatchAfterCommit.test.ts \
  tests/main/services/appearanceCacheIsolation.test.ts
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

이번 DB-13 변경 파일에서는 TypeScript 오류가 보고되지 않았다.

## 판정과 잔여 범위

- commit 이후 dispatch, no-op/rollback 차단, cache set transaction, unique firstAppearance update, export coalescing을 확인해 DB-13을 PASS로 판정한다.
- main DB firstAppearance와 재생성 가능한 cache DB는 서로 다른 SQLite 파일이므로 하나의 cross-database atomic transaction은 아니다. cache replacement 성공 뒤 main update가 실패하면 다음 rebuild가 cache를 다시 만들며 firstAppearance는 null로 남아 재시도 가능하다.
