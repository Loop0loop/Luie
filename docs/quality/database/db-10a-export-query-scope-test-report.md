# DB-10A export 조회 범위 테스트 보고서

## 문서 정보

| 항목             | 값                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------- |
| 테스트 기준      | `database.md` DB-10                                                                     |
| 테스트 대상      | `getProjectForExport`, `exportProjectPackageWithOptions`                                |
| 테스트 설계 기법 | ISTQB 명세 기반 테스트, 경계값 분석, 상태 전이, 동등 분할                               |
| 테스트 레벨      | Real DB Integration / Service Unit Mocked                                               |
| 실행일           | 2026-09-13 KST                                                                          |
| 기준 HEAD        | `0faf4fad`                                                                              |
| 환경             | Darwin arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0, worker별 실제 SQLite 임시 DB |

## 변경 계약

- `snapshotExportLimit > 0`이면 Snapshot을 `createdAt DESC`로 정렬하고 SQL query의 `LIMIT`에서 제한한다.
- limit이 0 이하이면 기존 의미와 같이 모든 snapshot을 조회한다.
- chapter export 조회는 `ChapterBody.content`와 legacy `Chapter.content`를 각각 JS row로 projection하지 않는다.
- `COALESCE(ChapterBody.content, Chapter.content)`를 `content` 한 컬럼으로 반환해 canonical body 우선과 legacy fallback을 모두 유지한다.
- export payload와 `.luie` entry 형식은 변경하지 않는다.

## 상태 모델

| 상태 | 설명                                                                   |
| ---- | ---------------------------------------------------------------------- |
| S0   | project에 시간순 snapshot 5건이 저장됨                                 |
| S1   | export query에 `snapshotExportLimit=2`가 전달됨                        |
| S2   | 최신 snapshot 2건만 mapper와 export record로 전달됨                    |
| S3   | `snapshotExportLimit=0`이면 기존 계약대로 snapshot 5건이 모두 전달됨   |
| C0   | chapter A는 legacy와 ChapterBody가 모두 있고 chapter B는 legacy만 있음 |
| C1   | A는 ChapterBody, B는 legacy fallback 본문 한 값만 export record에 존재 |

검증 전이는 `S0 → S1 → S2`와 `C0 → C1`이다.

## 진입·종료 기준

진입 기준:

- 실제 SQLite 임시 DB에 project, chapter, ChapterBody, Snapshot fixture를 저장할 수 있다.
- 설정 mock에서 `snapshotExportLimit=5`를 export engine에 제공할 수 있다.
- container writer 입력 payload를 관찰할 수 있다.

종료 기준:

- 실제 DB 조회가 양수 limit 수만 반환하고 최신 순서를 보존하며 0에서는 전체를 반환한다.
- canonical ChapterBody가 legacy Chapter.content보다 우선한다.
- ChapterBody가 없는 기존 자료는 legacy content로 export된다.
- 설정 limit이 export query와 최종 snapshot payload에 반영된다.
- 관련 package attachment 회귀 테스트가 통과한다.

## 테스트 케이스

### TC-DB-10A-A: 실제 DB snapshot 경계와 chapter content projection

| 항목      | 내용                                                                                      |
| --------- | ----------------------------------------------------------------------------------------- |
| 목적      | snapshot 제한이 조회 단계에 적용되고 chapter 본문 우선순위가 유지되는지 확인              |
| 사전 상태 | snapshot 5건, canonical+legacy 본문이 있는 chapter A, legacy 본문만 있는 chapter B        |
| 입력      | `getProjectForExport(projectId, 2)`                                                       |
| 절차      | fixture 저장 → export record 조회 → snapshot content 순서와 chapter별 content 비교        |
| 기대 결과 | snapshot=`snapshot-5`, `snapshot-4`; A=`canonical chapter body`; B=`legacy fallback body` |
| 실제 결과 | 기대 결과와 일치                                                                          |
| 결과      | PASS                                                                                      |

### TC-DB-10A-B: snapshot limit 0 경계값

| 항목      | 내용                                                                 |
| --------- | -------------------------------------------------------------------- |
| 목적      | limit 0이 기존의 전체 snapshot export 의미를 유지하는지 확인         |
| 사전 상태 | 시간순 snapshot 5건                                                  |
| 입력      | `getProjectForExport(projectId, 0)`                                  |
| 절차      | 같은 실제 DB fixture를 limit 0으로 조회 → snapshot content 순서 확인 |
| 기대 결과 | 최신순 `snapshot-5`부터 `snapshot-1`까지 5건 모두 반환               |
| 실제 결과 | 기대 결과와 일치                                                     |
| 결과      | PASS                                                                 |

### TC-DB-10A-C: 설정 limit의 export engine 전달

| 항목      | 내용                                                                             |
| --------- | -------------------------------------------------------------------------------- |
| 목적      | 앱 설정값이 query limit으로 전달되어 최종 package payload 범위를 제한하는지 확인 |
| 사전 상태 | 시간순 snapshot 7건, `snapshotExportLimit=5`, container writer mock              |
| 입력      | `exportProjectPackageWithOptions({ projectId })`                                 |
| 절차      | export 실행 → query mock의 limit 적용 → writer payload snapshot ID 확인          |
| 기대 결과 | 최신 `snapshot-7`부터 `snapshot-3`까지 5건만 writer에 전달                       |
| 실제 결과 | 기대 결과와 일치                                                                 |
| 결과      | PASS                                                                             |

### TC-DB-10A-D: 기존 export·attachment 회귀

| 항목      | 내용                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------ |
| 목적      | 조회 범위 축소가 기존 world payload, SQLite container meta, package attachment 계약을 깨지 않는지 확인 |
| 사전 상태 | 기존 mock export fixture와 worker별 임시 DB                                                            |
| 입력      | project export engine 및 package attachment 전체 테스트                                                |
| 절차      | 관련 3개 test file을 한 번에 실행                                                                      |
| 기대 결과 | 모든 기존 assertion과 DB-10A 신규 assertion 통과                                                       |
| 실제 결과 | 3 files, 18 tests 통과                                                                                 |
| 결과      | PASS                                                                                                   |

## 실행 기록

### DB-10A 전용 테스트

```sh
pnpm exec vitest run \
  tests/main/services/core/project/projectExportRecord.test.ts \
  tests/main/services/projectExportEngine.test.ts
```

상태: 첫 test file은 `SKIP_DB_TEST_SETUP` 없이 실제 worker별 SQLite DB를 사용했다. 두 번째 file은 DB query와 container writer를 mock해 설정 전달과 payload 계약을 검증했다. 사용자 DB와 사용자 `.luie` 파일은 사용하지 않았다.

결과: **2 files passed, 9 tests passed**.

### 관련 회귀 테스트

```sh
pnpm exec vitest run \
  tests/main/services/core/project/projectExportRecord.test.ts \
  tests/main/services/projectExportEngine.test.ts \
  tests/main/services/projectService.packageAttachment.test.ts
```

결과: **3 files passed, 18 tests passed**.

### 정적 검사

```sh
pnpm exec eslint \
  src/main/services/core/project/exportEngine/projectRecord.ts \
  src/main/services/core/project/projectExportMapper.ts \
  src/main/services/core/project/projectExportEngine.ts \
  tests/main/services/core/project/projectExportRecord.test.ts \
  tests/main/services/projectExportEngine.test.ts
```

결과: **PASS, lint error 0개**.

```sh
pnpm run typecheck
```

결과: **BLOCKED by pre-existing unrelated error**.

```text
src/renderer/src/features/manuscript/components/Sidebar.tsx(157,5):
TS6133: 'handleRenameProject' is declared but its value is never read.
```

이번 DB-10A 변경 파일에서는 TypeScript 오류가 보고되지 않았다.

## 테스트 환경에서 확인된 제약

실제 package 휴지통 통합 테스트도 확장 실행했으나 repository root에 테스트 입력 `/Users/user/Luie/test.luie`가 없어 제품 코드 실행 전에 종료됐다.

```text
ENOENT: no such file or directory, open '/Users/user/Luie/test.luie'
```

이 file에 의존하지 않는 package attachment와 export 테스트 18건은 통과했다.

## 잔여 검증 범위

- 실제 사용자 규모의 snapshot 본문 bytes와 export peak heap 감소량은 측정하지 않았다.
- DB-10A는 조회량만 줄인다. 기존 전체 `.luie` 재작성 비용은 DB-10B~DB-10D에서 줄이고 실제 파일 상태로 검증한다.
- legacy Chapter.content column 자체의 제거는 reader migration 범위를 별도로 확인해야 하므로 이번 단계에서 수행하지 않았다.
