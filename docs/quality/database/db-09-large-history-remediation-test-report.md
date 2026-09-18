# DB-09 대량 ChapterRevision 보관 보정 테스트 보고서

## 판정

**PASS — [X] 완료 (2026-09-13 KST).** 기존 revision 33,000건에서도 `ChapterService.updateChapter`가 본문을 commit하고 최신 100건만 남긴다. 삭제 실패는 Chapter·ChapterBody·ChapterRevision 전체를 rollback하며, autosave 5분 경계 전후도 명세와 일치한다.

이 판정은 worker별 임시 실제 SQLite와 production `ChapterService` 경로에 한정한다. package persistence는 mock했으며 packaged Electron, 사용자 DB 업그레이드, DB 파일의 물리적 축소는 검증하지 않았다.

## 문서 정보

| 항목 | 값 |
| --- | --- |
| 기준 | `database.md` DB-09 재개 조건 |
| 대상 | `persistChapterRevision`, `ChapterService.updateChapter`, Chapter·ChapterBody·ChapterRevision transaction |
| 설계 기법 | ISTQB 명세 기반 테스트, 상태 전이, 경계값 분석, 오류 추정, 회귀 테스트 |
| 테스트 레벨 | Real DB Component Integration, AutoSave Unit Mocked, Static/Build |
| 실행일 | 2026-09-13 KST |
| 기준 소스 | `b76d6f0e` 위 DB-04·DB-09 작업 트리 |
| 환경 | Darwin arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0, better-sqlite3 13.0.3 |

## 결함과 수정 계약

수정 전 구현은 상한 밖 revision ID를 전부 읽은 다음 Drizzle `inArray()`에 넘겼다. 33,000건에서 SQLite의 bind variable 한도를 초과해 `too many SQL variables`가 발생했고, 같은 transaction의 최신 본문도 저장되지 않았다.

수정 후에는 한 SQL statement가 최신 100건 밖의 ID를 subquery로 선택하고 삭제한다. 애플리케이션으로 ID 배열을 가져오지 않으므로 기존 이력 크기에 따라 bind 수가 증가하지 않는다. schema·migration·새 dependency는 추가하지 않았다.

통과 조건은 다음과 같다.

- 과거 revision 33,000건에서 content update가 오류 없이 완료된다.
- commit 뒤 ChapterBody는 입력 본문이고 해당 chapter의 revision은 정확히 100건이다.
- 최근 autosave와의 간격이 `299,999ms`이면 같은 row를 갱신하고, `300,000ms`이면 새 row를 만든다.
- retention `DELETE`가 실패하면 Chapter의 legacy content, ChapterBody content/hash, 새 revision INSERT가 모두 이전 상태로 rollback된다.
- 기존 105건 보관·reason 전달·chapter transaction·incremental package·검색 회귀가 유지된다.

## 상태 모델과 테스트 데이터

| 상태 | 설명 |
| --- | --- |
| H0 | 실제 Project·Chapter·ChapterBody와 과거 manual revision 33,000건 |
| H1 | 새 manual revision INSERT 직후 33,001건, retention 미완료 |
| H2 | transaction commit 뒤 최신 본문과 revision 100건 |
| A0 | autosave revision 1건, 기준 시각 `00:00:00.000Z` |
| A1 | `+299,999ms` autosave가 기존 row를 최신 본문으로 갱신 |
| A2 | 별도 chapter의 `+300,000ms` autosave가 새 row를 추가 |
| F0 | 실제 본문 `initial`, 기존 revision 100건, DELETE 실패 trigger 설치 |
| F1 | 새 본문·revision 시도 중 retention DELETE가 `SQLITE_CONSTRAINT_TRIGGER`로 실패 |
| F2 | transaction rollback 뒤 본문·hash·revision이 F0와 동일 |

33,000건 fixture는 recursive CTE로 실제 `ChapterRevision` table에 넣었다. 모든 과거 row는 새 저장보다 이른 `createdAt`을 사용하며 chapter별 고유 ID를 갖는다. 테스트 공통 setup이 worker별 임시 main/cache DB와 userData를 구성하고 각 테스트 전 table을 비운다.

## 테스트 케이스

### TC-DB-09-R: 수정 전 대량 이력 RED

| 항목 | 내용 |
| --- | --- |
| 목적 | 기존 105건 테스트가 놓친 SQLite bind 한도 결함을 production service 경로에서 고정 |
| 사전 상태 | H0, package persistence mock 성공 |
| 입력 | `updateChapter({ content: "latest body" })` |
| 절차 | 33,000건 INSERT → update 호출 → 본문과 revision 수 검사 |
| 기대 결과 | 최신 본문 commit, revision 100건 |
| 수정 전 실제 결과 | `too many SQL variables`; `CHAPTER_UPDATE_FAILED`; 테스트 1건 실패 |
| 결과 | **RED 재현 성공** |

### TC-DB-09-A: 대량 이력 GREEN

| 항목 | 내용 |
| --- | --- |
| 목적 | 기존 이력 크기와 무관한 retention 및 본문 commit 확인 |
| 사전 상태 | H0 |
| 입력 | manual content update 1회 |
| 절차 | 실제 `ChapterService.updateChapter` 완료 후 ChapterBody와 count 조회 |
| 기대 결과 | H2; body=`latest body`, revision count=100 |
| 실제 결과 | 기대 결과와 일치 |
| 결과 | **PASS** |

### TC-DB-09-B: 5분 경계값

| 항목 | 내용 |
| --- | --- |
| 목적 | `< 5분` 조건의 직전값과 정확한 경계값을 분리 |
| 사전 상태 | 두 chapter가 각각 A0 |
| 입력 | 첫 chapter `+299,999ms`, 둘째 chapter `+300,000ms` autosave |
| 절차 | fake system clock으로 시각 고정 → 실제 service update → row 수와 전문 조회 |
| 기대 결과 | 첫 chapter 1건·본문 갱신, 둘째 chapter 2건·새 본문 존재 |
| 실제 결과 | 기대 결과와 일치 |
| 결과 | **PASS** |

### TC-DB-09-C: retention 실패 원자성

| 항목 | 내용 |
| --- | --- |
| 목적 | 오래된 row 삭제 실패가 최신 본문만 남기는 부분 commit을 만들지 않는지 확인 |
| 사전 상태 | F0; `BEFORE DELETE` TEMP trigger가 `RAISE(ABORT)` 실행 |
| 입력 | manual content update 1회 |
| 절차 | 실패 assertion 후 `finally`에서 trigger 제거 → 세 table 조회 |
| 기대 결과 | `CHAPTER_UPDATE_FAILED`; Chapter/ChapterBody=`initial`, hash=`initial-hash`, revision 100건, rejected 본문 없음 |
| 실제 결과 | 기대 결과와 일치 |
| 결과 | **PASS** |

### TC-DB-09-D: 기존 정책 회귀

| 항목 | 내용 |
| --- | --- |
| 목적 | reason 분리, autosave burst, 105→100 보관 및 관련 저장 경계 보존 |
| 사전 상태 | 각 기존 fixture와 실제 임시 DB |
| 입력 | manual/autosave update, chapter transaction, incremental package, 검색 갱신 |
| 기대 결과 | 기존 assertion 전부 통과 |
| 실제 결과 | 5 files, 14 tests PASS |
| 결과 | **PASS** |

## 실행 기록

### RED

```sh
pnpm exec vitest run tests/main/services/core/chapter/chapterRevisionRetention.test.ts
```

수정 전 결과: **1 file failed, 1 failed / 2 passed**. 실패 원인은 `persistChapterRevision`의 DELETE prepare 단계에서 발생한 `SqliteError: too many SQL variables`였다.

### GREEN 전용·관련 회귀

같은 명령 재실행 결과: **1 file passed, 5 tests passed**.

실패 원인의 native code까지 assertion을 강화한 첫 실행은 **1 failed / 4 passed**였다. 실제 오류는 `ServiceError.cause`의 `DrizzleError.cause`에 있는 `SQLITE_CONSTRAINT_TRIGGER`였으나 테스트가 한 단계 얕게 검사했다. assertion을 실제 wrapper 구조에 맞춘 뒤 5건이 통과했으며, 이 중간 실패는 제품 rollback 실패가 아니다.

```sh
pnpm exec vitest run \
  tests/main/services/core/chapter/chapterRevisionRetention.test.ts \
  tests/main/manager/autoSaveSaveContract.test.ts \
  tests/main/services/core/chapter/chapterWriteTransaction.test.ts \
  tests/main/services/core/chapter/chapterIncrementalPackage.test.ts \
  tests/main/services/searchService.test.ts
```

상태: `SKIP_DB_TEST_SETUP`을 사용하지 않았다. 실제 임시 main/cache SQLite에서 대량 INSERT, retention DELETE, trigger rollback과 관련 저장 경로를 실행했다. package persistence는 각 테스트의 기존 mock 또는 임시 파일 경계를 유지했다.

결과: **5 files passed, 14 tests passed**.

```sh
SKIP_DB_TEST_SETUP=1 pnpm exec vitest run tests/main/services/autoSaveManager.runtimeStats.test.ts
```

상태: DB를 자체 mock하는 AutoSaveManager origin/fake timer 단위 테스트다.

결과: **1 file passed, 2 tests passed**.

### 전체 database 회귀와 build

최종 회귀 보고서 R1의 실제 DB·filesystem·process 명령을 동일하게 실행했다. 사용자 DB와 사용자 `.luie`는 사용하지 않았다.

결과: **18 files passed, 71 tests passed**. 직전 R2 비DB 결과 13 files/87 tests와 합친 DB-09 완료 직후 누적 검증 범위는 **31 files/158 tests PASS**였다.

```sh
pnpm exec eslint \
  src/main/services/core/chapter/chapterWriteOperations.ts \
  tests/main/services/core/chapter/chapterRevisionRetention.test.ts
pnpm run build
git diff --check
```

결과: ESLint **PASS**, production build **PASS**(main 938, preload 31, renderer 2,952 modules), diff check **PASS**.

```sh
pnpm run typecheck
```

결과: 이번 DB-09 파일의 오류는 없으나 기존 renderer 오류로 전체 명령은 실패했다.

```text
src/renderer/src/features/manuscript/components/Sidebar.tsx(157,5):
TS6133: 'handleRenameProject' is declared but its value is never read.
```

## 잔여 범위

- retention은 live row 수를 100건으로 제한한다. SQLite page 파일의 물리적 축소나 `VACUUM`을 수행하는 정책은 아니다.
- 실제 DB statement와 rollback을 검증했지만 packaged Electron에서 오래된 사용자 DB를 열어 저장하는 업그레이드 시나리오는 실행하지 않았다.
- package persistence는 이 항목의 원인이 아니므로 mock했다. `.luie` write·checkpoint 경쟁은 DB-10D와 DB-11 범위다.
