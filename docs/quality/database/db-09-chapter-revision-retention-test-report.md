# DB-09 ChapterRevision 보관 정책 테스트 보고서

## 최신 판정 — PASS (2026-09-13 보정)

대량 ID bind를 SQL subquery 삭제로 교체했다. 실제 `ChapterService.updateChapter`에 기존 revision 33,000건을 둔 상태에서 최신 본문 commit과 100건 보관, 5분 경계 전후, 강제 삭제 실패 rollback을 확인했다. 최신 구현·테스트·실행 결과는 [DB-09 보정 보고서](db-09-large-history-remediation-test-report.md)를 기준으로 한다.

## 이전 재개 근거 — 2026-09-13 QA 재검토

아래 내용은 보정 전 결함과 당시 실행 이력이다.

- 원인: [chapterWriteOperations.ts](../../../src/main/services/core/chapter/chapterWriteOperations.ts)의 `persistChapterRevision`은 보관 상한 밖 ID를 모두 조회한 다음 `inArray(chapterRevision.id, expired.map(...))`로 한 번에 바인딩한다. 과거 무제한 누적 이력이 많으면 SQLite bind variable 상한을 넘는다.
- 확인 환경: 현재 소스에서 해당 helper를 추출해 TypeScript로 변환하고, 설치된 native `better-sqlite3`와 Drizzle의 합성 in-memory transaction에서 실행했다. `PRAGMA compile_options`의 `MAX_VARIABLE_NUMBER=32766`을 확인했으며 사용자 DB·원고·package는 사용하지 않았다.
- 재현: 기존 manual revision 33,000개를 준비하고 같은 transaction에서 본문을 `old → latest`로 바꾼 뒤 현재 retention helper를 호출했다. 결과는 `error="too many SQL variables"`, `bodyAfter="old"`, `revisionCountAfter=33000`이었다. 오류가 본문 변경까지 rollback하며 동일 이력을 둔 재시도도 해결하지 못한다. 실제 `ChapterService`·Electron·파일 저장의 종단 실행은 아니다.
- 재실행: `node /private/tmp/luie-retention-review-repro.cjs`. 이 스크립트는 로컬 임시 검토 산출물이며 저장소에 포함되지 않는다.
- 테스트 공백: [chapterRevisionRetention.test.ts](../../../tests/main/services/core/chapter/chapterRevisionRetention.test.ts)의 기존 105개 fixture는 100개 보관 정책을 검증하지만 bind variable 상한을 넘는 업그레이드 데이터를 다루지 않는다.
- 당시 완료 조건은 삭제 대상을 SQL 서브쿼리 또는 bounded batch로 제한하고, 실제 임시 DB의 `ChapterService.updateChapter`에서 33,000개 기존 이력의 저장 성공·최신 본문·100개 보관·삭제 실패 rollback·5분 경계를 검증하는 것이었다. 현재 결과는 위 최신 보정 보고서에 기록했다.

## 문서 정보

| 항목             | 값                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------- |
| 테스트 기준      | `database.md` DB-09                                                                   |
| 테스트 대상      | `performAutoSave`, `AutoSaveManager.flushAll`, `updateChapterRecord`, ChapterRevision |
| 테스트 설계 기법 | ISTQB 명세 기반 테스트, 상태 전이, 경계값 분석, 오류 추정                             |
| 테스트 레벨      | Real DB Integration, AutoSave Unit Mocked                                             |
| 실행일           | 2026-09-13 KST                                                                        |
| 기준 HEAD        | `0faf4fad`                                                                            |
| 환경             | Darwin arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0, worker별 실제 SQLite DB    |

## 확정 정책

- debounce/interval에서 실행된 저장은 `reason=autosave`다.
- 명시적 `flushAll()`로 pending을 저장하면 `reason=manual_save`다. Ctrl/Cmd+S와 종료 시 저장 flush가 이 경로를 사용한다.
- 5분 이내 연속된 autosave revision은 새 row를 추가하지 않고 최신 autosave row의 전문/hash/시각을 갱신한다.
- manual revision 뒤 첫 autosave는 별도 row로 추가하며 manual revision은 autosave coalescing 대상이 아니다.
- content commit transaction 안에서 chapter별 최신 100개를 남기고 오래된 revision을 삭제한다.
- ChapterBody에 사용한 `preparedContent.hash`를 revision에도 전달해 본문 hash를 다시 계산하지 않는다.
- 현재 ChapterRevision에는 restore/export reader가 없으므로 이 정책은 내부 저장량 상한이며 사용자 snapshot 정책과 독립이다.

## 상태 모델

| 상태 | 설명                                                 |
| ---- | ---------------------------------------------------- |
| M0   | revision 없음                                        |
| M1   | 직접/명시적 저장 후 `manual_save` row 1개            |
| A1   | 첫 autosave 후 `autosave` row 추가                   |
| A2   | 5분 이내 후속 autosave가 A1 row를 최신 전문으로 갱신 |
| L0   | chapter에 과거 revision 105개                        |
| L1   | 새 content commit 뒤 최신 100개만 유지               |

검증 전이는 `M0 → M1 → A1 → A2`와 `L0 → L1`이다.

## 테스트 케이스

### TC-DB-09-A: reason 분리와 autosave coalescing

| 항목      | 내용                                                                      |
| --------- | ------------------------------------------------------------------------- |
| 목적      | manual/autosave origin을 구분하고 autosave burst의 전문 중복을 제한       |
| 사전 상태 | 실제 Project/Chapter/ChapterBody 존재, revision 없음                      |
| 입력      | default content update 1회 → `revisionReason=autosave` content update 2회 |
| 절차      | 세 update 후 ChapterRevision을 reason/전문으로 조회                       |
| 기대 결과 | row 2개, reason은 manual_save/autosave, autosave 전문은 두 번째 최신 본문 |
| 실제 결과 | 기대 결과와 일치                                                          |
| 결과      | PASS                                                                      |

### TC-DB-09-B: 100개 보관 경계

| 항목      | 내용                                                                        |
| --------- | --------------------------------------------------------------------------- |
| 목적      | 기존 revision이 상한을 넘었을 때 content commit과 같은 transaction에서 정리 |
| 사전 상태 | createdAt이 순차적인 revision 105개                                         |
| 입력      | 최신 manual content update 1회                                              |
| 절차      | commit 후 count, 최신 전문 존재, 가장 오래된 6개 ID 부재 확인               |
| 기대 결과 | 정확히 100개, 최신 revision 유지, 오래된 6개 삭제                           |
| 실제 결과 | 기대 결과와 일치                                                            |
| 결과      | PASS                                                                        |

### TC-DB-09-C: autosave 실행 경계 reason 전달

| 항목      | 내용                                                                        |
| --------- | --------------------------------------------------------------------------- |
| 목적      | manager의 실제 timer와 flush 경로가 올바른 reason을 service에 넘기는지 확인 |
| 사전 상태 | mocked chapter service, fake timer, pending autosave                        |
| 입력      | 즉시 `flushAll()` 및 debounce timer 만료                                    |
| 절차      | `updateChapter(input, options)` 호출 인자 확인                              |
| 기대 결과 | flush는 manual_save, timer는 autosave                                       |
| 실제 결과 | 기대 결과와 일치                                                            |
| 결과      | PASS                                                                        |

## 실행 기록

### 실제 DB·저장 회귀

```sh
pnpm exec vitest run \
  tests/main/services/core/chapter/chapterRevisionRetention.test.ts \
  tests/main/manager/autoSaveSaveContract.test.ts \
  tests/main/services/core/chapter/chapterWriteTransaction.test.ts \
  tests/main/services/core/chapter/chapterIncrementalPackage.test.ts \
  tests/main/services/searchService.test.ts
```

상태: worker별 실제 DB에서 revision reason/coalescing/상한과 chapter transaction/package/search 회귀를 함께 실행했다. package persistence는 각 테스트의 기존 실제 파일 또는 mock 경계를 유지했다.

결과: **5 files passed, 11 tests passed**.

초기 실행에서는 Drizzle builder가 `limit(-1).offset(100)`을 `OFFSET`만 있는 SQL로 생성해 실제 SQLite가 syntax error를 반환했다. retention 대상 조회를 명시적 `LIMIT -1 OFFSET 100` SQL로 교정한 뒤 같은 범위가 통과했다.

### AutoSaveManager origin 단위 테스트

```sh
SKIP_DB_TEST_SETUP=1 pnpm exec vitest run tests/main/services/autoSaveManager.runtimeStats.test.ts
```

상태: DB module을 자체 mock하는 비DB 테스트이며 fake timer로 debounce와 명시적 flush를 분리했다.

결과: **1 file passed, 2 tests passed**.

### 정적 검사

```sh
pnpm exec eslint \
  src/main/services/core/chapter/chapterWriteOperations.ts \
  src/main/services/features/manuscript/chapterService.ts \
  src/main/manager/autoSave/autoSavePerformSave.ts \
  src/main/manager/autoSave/autoSaveManager.ts \
  tests/main/manager/autoSaveSaveContract.test.ts \
  tests/main/services/autoSaveManager.runtimeStats.test.ts \
  tests/main/services/core/chapter/chapterRevisionRetention.test.ts
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

이번 DB-09 변경 파일에서는 TypeScript 오류가 보고되지 않았다.

## 판정과 잔여 범위

- 최초 실행에서는 reason 분리, coalescing, 100개 경계를 확인해 PASS로 판정했다. 이후 대량 기존 이력 회귀로 한 차례 REOPEN됐고, 현재는 문서 상단 보정 보고서의 대량 bind·rollback 검증으로 해결됐다.
- 기존 DB에서 과거 autosave가 `manual_save`로 기록된 사실은 소급 분류할 근거가 없어 그대로 둔다. 다음 content commit부터 최신 100개 보관 정책만 적용한다.
- SQLite page 파일의 물리적 축소는 VACUUM 정책이 아니므로 보장하지 않는다. live ChapterRevision row와 새 증가량을 제한하는 정책이다.
