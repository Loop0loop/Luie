# DB-03 chapter 동기 transaction 테스트 보고서

## 문서 정보

| 항목             | 값                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| 테스트 기준      | `database.md` DB-03                                                                            |
| 테스트 대상      | `createChapterRecord`, `updateChapterRecord`, `upsertChapterBody`, `enqueueChapterDerivedJobs` |
| 테스트 설계 기법 | ISTQB 명세 기반 테스트, 상태 전이, 오류 추정, fault injection                                  |
| 테스트 레벨      | Real DB Integration                                                                            |
| 실행일           | 2026-09-13 KST                                                                                 |
| 기준 HEAD        | `0faf4fad`                                                                                     |
| 환경             | Darwin arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0, worker별 실제 SQLite 임시 DB        |

## 변경 계약

- 본문 검증, 기존 본문 조회, timestamp와 content hash 계산은 transaction 진입 전에 끝낸다.
- transaction은 Drizzle sync driver의 `transaction(..., { behavior: "immediate" })`를 사용한다.
- transaction callback 안의 chapter, ChapterBody, ChapterRevision, SearchDirtyQueue, MemoryBuildJob 변경은 동기 `.get()`, `.run()`, `.all()`만 사용한다.
- transaction 실패 시 해당 chapter 작업만 rollback한다. event loop에 예약된 다른 도메인 작업은 열린 chapter transaction에 합류하지 않는다.
- package persistence와 search cache 갱신은 DB transaction 밖에서 기존 순서를 유지한다.

## 상태 모델

| 상태 | 설명                                                                                  |
| ---- | ------------------------------------------------------------------------------------- |
| C0   | project만 존재하고 chapter는 없음                                                     |
| C1   | Chapter INSERT 완료, ChapterBody와 derived job은 아직 같은 transaction 안에서 처리 중 |
| U0   | 기존 Chapter와 ChapterBody에 old body가 저장됨                                        |
| U1   | Chapter update와 ChapterBody upsert가 같은 transaction에서 실행됨                     |
| UF   | ChapterRevision INSERT가 강제 실패함                                                  |
| OQ   | unrelated Character write가 microtask에 예약됨                                        |
| R0   | chapter transaction rollback 완료                                                     |
| OC   | unrelated Character write가 별도 transaction 상태에서 완료됨                          |

검증 전이는 `C0 → C1 → failure → C0`과 `U0 → U1 + OQ → UF → R0 → OC`다.

## 진입·종료 기준

진입 기준:

- Vitest worker 전용 실제 SQLite main/cache DB가 초기화되어 있다.
- foreign key, WAL, `synchronous=FULL`을 사용하는 앱 DB 초기화 경로를 거친다.
- SQLite TEMP trigger로 ChapterBody 또는 ChapterRevision INSERT 실패를 재현할 수 있다.

종료 기준:

- create의 중간 statement가 실패하면 Chapter·ChapterBody·derived job이 모두 0건이다.
- update의 revision statement가 실패하면 Chapter와 ChapterBody가 이전 값으로 복구된다.
- 실패한 update에서 ChapterRevision·SearchDirtyQueue·MemoryBuildJob이 남지 않는다.
- revision 준비 중 예약한 unrelated Character write가 chapter rollback 뒤 보존된다.
- 관련 chapter·derived job·autosave 회귀 테스트가 통과한다.

## 테스트 케이스

### TC-DB-03-A: chapter create 중 ChapterBody 실패

| 항목      | 내용                                                                                    |
| --------- | --------------------------------------------------------------------------------------- |
| 목적      | Chapter INSERT 뒤 ChapterBody INSERT가 실패할 때 부분 chapter가 남지 않는지 확인        |
| 사전 상태 | C0, project 존재, chapter/body/job 없음                                                 |
| 오류 주입 | `BEFORE INSERT ON ChapterBody` TEMP trigger가 `RAISE(ABORT)` 실행                       |
| 절차      | `createChapterRecord` 호출 → create 실패 확인 → trigger 제거 → 관련 table 조회          |
| 기대 결과 | `CHAPTER_CREATE_FAILED`; Chapter 0, ChapterBody 0, SearchDirtyQueue 0, MemoryBuildJob 0 |
| 실제 결과 | 기대 결과와 일치                                                                        |
| 결과      | PASS                                                                                    |

### TC-DB-03-B: chapter update 실패와 다른 도메인 쓰기 분리

| 항목      | 내용                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------ |
| 목적      | update transaction의 async 틈이 제거되어 다른 도메인 쓰기가 chapter rollback에 포함되지 않는지 확인                      |
| 사전 상태 | U0, Chapter/ChapterBody=`old body`, revision/job 없음                                                                    |
| 오류 주입 | `BEFORE INSERT ON ChapterRevision` TEMP trigger가 `RAISE(ABORT)` 실행                                                    |
| 경쟁 상태 | revision ID 생성 시 같은 DB client의 Character INSERT를 `queueMicrotask`로 예약                                          |
| 절차      | title/body update 호출 → revision 실패 → transaction rollback → 예약된 Character INSERT 완료 대기 → 모든 관련 table 조회 |
| 기대 결과 | `CHAPTER_UPDATE_FAILED`; Chapter title/body와 ChapterBody는 이전 값, revision/job 0; Character 1건 보존                  |
| 실제 결과 | 기대 결과와 일치                                                                                                         |
| 결과      | PASS                                                                                                                     |

이 경쟁 조건에서 과거 구현은 `crypto.randomUUID()` 뒤 await된 revision query가 실행되기 전에 microtask가 열린 transaction에 진입할 수 있었다. 현재 구현은 revision `.run()`과 rollback이 같은 call stack에서 끝난 뒤 microtask가 실행된다.

## 실행 기록

### DB-03 전용 실제 DB 통합 테스트

```sh
pnpm exec vitest run \
  tests/main/services/core/chapter/chapterWriteTransaction.test.ts
```

상태: `SKIP_DB_TEST_SETUP`을 사용하지 않았다. Vitest worker별 임시 SQLite main/cache DB를 초기화했고 사용자 DB와 실제 `.luie` 파일은 사용하지 않았다.

결과: **1 file passed, 2 tests passed**.

### 관련 회귀 테스트

```sh
pnpm exec vitest run \
  tests/main/services/core/chapter/chapterWriteTransaction.test.ts \
  tests/main/services/core/chapter/chapterDerivedJobs.test.ts \
  tests/main/services/chapterService.test.ts \
  tests/main/services/chapterContentValidation.test.ts \
  tests/main/manager/autoSaveSaveContract.test.ts \
  tests/main/handler/manualSaveHandler.test.ts
```

상태: 실제 DB chapter create/update와 derived job dedupe, 대용량 본문, autosave generation·실패 전달, manual save 차단을 함께 실행했다.

결과: **6 files passed, 26 tests passed**.

### 정적·구조 검사

```sh
pnpm exec eslint \
  src/main/services/core/chapter/chapterWriteOperations.ts \
  src/main/services/core/chapter/chapterContentStore.ts \
  src/main/services/core/chapter/chapterDerivedJobs.ts \
  tests/main/services/core/chapter/chapterWriteTransaction.test.ts
```

결과: **PASS, lint error 0개**.

```sh
rg -n "BEGIN IMMEDIATE|ROLLBACK|COMMIT|transaction\\(async" \
  src/main/services/core/chapter --glob '*.ts'
```

결과: **일치 항목 0개**. chapter core에 수동 transaction과 async transaction callback이 남지 않았다.

```sh
pnpm run typecheck
```

결과: **BLOCKED by pre-existing unrelated error**.

```text
src/renderer/src/features/manuscript/components/Sidebar.tsx(157,5):
TS6133: 'handleRenameProject' is declared but its value is never read.
```

이번 DB-03 변경 파일에서는 TypeScript 오류가 보고되지 않았다.

```sh
pnpm run check:persist-contracts
```

결과: **BLOCKED by pre-existing unrelated error**.

```text
src/renderer/src/features/canvas/stores/graph/graphStore.ts:24
[persist-contract-missing-option]
Persist stores must define version, migrate, merge, onRehydrateStorage.
```

이번 변경 파일은 해당 renderer persist store를 수정하거나 참조하지 않는다.

## 잔여 검증 범위

- 실제 앱 main thread에서 별도 IPC 두 개를 동시에 발생시키는 Electron E2E는 실행하지 않았다.
- SQLite TEMP trigger와 같은 singleton Drizzle client의 microtask를 사용해 기존 interleaving 조건을 재현했다.
- package export는 transaction 밖 기존 호출 순서가 유지되는지만 코드와 회귀 테스트로 확인했으며 실제 `.luie` 파일은 DB-10에서 검증한다.
