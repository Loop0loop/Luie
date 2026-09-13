# DB-10C chapter 증분 package 저장 테스트 보고서

## 문서 정보

| 항목             | 값                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------- |
| 테스트 기준      | `database.md` DB-10                                                                         |
| 테스트 대상      | `updateChapterRecord`, `ProjectService.persistPackageAfterMutation`, `writeLuieSqliteEntry` |
| 테스트 설계 기법 | ISTQB 명세 기반 테스트, 상태 전이, 동등 분할, 오류 추정                                     |
| 테스트 레벨      | Real DB / Filesystem Integration, Service Unit Mocked                                       |
| 실행일           | 2026-09-13 KST                                                                              |
| 기준 HEAD        | `0faf4fad`                                                                                  |
| 환경             | Darwin arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0, 임시 SQLite DB와 실제 `.luie`    |

## 변경 계약

- chapter update의 변경 필드가 content와 계산된 wordCount뿐이면 `manuscript/{chapterId}.md` 단일 entry writer를 사용한다.
- 단건 writer가 같은 transaction에서 `meta.json`과 container timestamp를 갱신하는 DB-10B 계약을 재사용한다.
- 같은 본문이 DB에 이미 저장된 재시도도 package entry persistence를 생략하지 않는다.
- 단건 write가 실패하면 즉시 전체 project export를 시도한다. 전체 export도 실패하면 저장 오류를 호출자에게 전달한다.
- title·synopsis가 함께 바뀌거나 content가 아닌 chapter update는 기존 전체 export queue를 사용한다.
- chapter 생성·삭제·복원·purge·순서 변경, Save As, 복구와 package format 갱신의 전체 export 경로는 유지한다.

## 상태 모델

| 상태 | 설명                                                                     |
| ---- | ------------------------------------------------------------------------ |
| P0   | authoritative DB와 `.luie` chapter entry가 모두 old body                 |
| D1   | DB transaction이 new body를 저장                                         |
| P1   | chapter entry=new body, meta와 container timestamp 갱신, 다른 entry 불변 |
| PS   | DB=new body지만 package entry만 stale body인 재시도 상태                 |
| PF   | incremental entry write 실패                                             |
| F0   | 전체 export fallback이 최신 DB 전체를 package로 저장                     |
| M0   | title·synopsis 등 metadata 변경이 포함된 chapter update                  |
| M1   | 기존 full export가 debounce queue에 예약됨                               |

검증 전이는 `P0 → D1 → P1`, `PS → P1`, `PF → F0`, `M0 → M1`이다.

## 진입·종료 기준

진입 기준:

- worker별 실제 main/cache SQLite DB와 OS 임시 디렉터리의 SQLite v2 `.luie`가 준비되어 있다.
- DB의 Chapter/ChapterBody와 package의 manuscript entry가 같은 old body로 시작한다.
- package 전체 entry content와 container timestamp를 전후 비교할 수 있다.
- 단건 writer 성공·실패와 full export 호출을 unit mock에서 제어할 수 있다.

종료 기준:

- content-only update 뒤 해당 chapter entry가 최신 DB 본문과 일치한다.
- `meta.json`은 `updatedAt`만 변경되고 다른 meta field는 유지된다.
- 다른 manuscript/world/entity/snapshot entry content는 변경되지 않는다.
- content-only update에서 full export가 호출되거나 예약되지 않는다.
- 같은 본문 재시도가 stale package entry를 고친다.
- metadata update와 incremental failure는 각각 기존 full export 및 fallback 경로를 사용한다.
- chapter transaction, autosave/manual save, container 회귀 테스트가 통과한다.

## 테스트 케이스

### TC-DB-10C-A: content-only 실제 `.luie` 증분 저장

| 항목      | 내용                                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------------------- |
| 목적      | 본문 저장이 전체 package를 재작성하지 않고 chapter entry와 meta만 갱신하는지 확인                              |
| 사전 상태 | DB와 package chapter=`old body`, world·character 등 비교용 entry 존재                                          |
| 입력      | `ChapterService.updateChapter({ id, content: "new body" })`                                                    |
| 절차      | package 전체 entry 사전 조회 → content update → 전체 entry와 container info 재조회 → full export spy 확인      |
| 기대 결과 | chapter entry=`new body`; meta는 updatedAt만 변경; container timestamp 변경; 그 외 entry 불변; full export 0회 |
| 실제 결과 | 기대 결과와 일치                                                                                               |
| 결과      | PASS                                                                                                           |

### TC-DB-10C-B: DB no-op 상태의 package 재시도

| 항목      | 내용                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------- |
| 목적      | DB 저장 뒤 package persistence만 실패했던 재시도에서 조기 반환으로 package가 stale하지 않도록 확인 |
| 사전 상태 | DB=`new body`, package chapter entry=`stale package body`                                          |
| 입력      | 동일한 `content="new body"`로 chapter update 재호출                                                |
| 절차      | package entry만 강제로 stale하게 변경 → 동일 본문 update → package entry 재조회                    |
| 기대 결과 | DB row 재작성 없이 package chapter entry가 `new body`로 복구되고 full export 0회                   |
| 실제 결과 | 기대 결과와 일치                                                                                   |
| 결과      | PASS                                                                                               |

### TC-DB-10C-C: metadata update의 전체 export 유지

| 항목      | 내용                                                                    |
| --------- | ----------------------------------------------------------------------- |
| 목적      | 증분 분기가 title 등 package metadata 변경을 누락하지 않는지 확인       |
| 사전 상태 | content-only 증분 저장 완료                                             |
| 입력      | `ChapterService.updateChapter({ id, title: "Renamed" })`                |
| 절차      | title-only update → package export schedule spy 확인                    |
| 기대 결과 | `schedulePackageExport(projectId, "chapter:update:debounced")` 1회 이상 |
| 실제 결과 | 기대 결과와 일치                                                        |
| 결과      | PASS                                                                    |

### TC-DB-10C-D: incremental 실패의 전체 export fallback

| 항목      | 내용                                                                           |
| --------- | ------------------------------------------------------------------------------ |
| 목적      | package가 없거나 단건 write가 실패해도 최신 DB를 전체 export로 복구하는지 확인 |
| 사전 상태 | 유효한 attachment path, incremental writer가 `missing package` 오류를 반환     |
| 입력      | content-only persistence payload                                               |
| 절차      | 단건 writer 실패 주입 → full export mock 성공 → revision mark 호출 확인        |
| 기대 결과 | 전체 export 1회, 성공 revision을 `markProjectExported`에 전달, 최종 호출 성공  |
| 실제 결과 | 기대 결과와 일치                                                               |
| 결과      | PASS                                                                           |

## 실행 기록

### DB-10C 전용 테스트

```sh
pnpm exec vitest run \
  tests/main/services/core/chapter/chapterIncrementalPackage.test.ts \
  tests/main/services/projectService.immediateDurability.test.ts
```

상태: 첫 file은 실제 SQLite DB와 OS 임시 `.luie`를 사용했다. 두 번째 file은 incremental writer와 full export를 mock해 성공·fallback 정책을 분리했다. 사용자 DB와 사용자 package는 사용하지 않았다.

결과: **2 files passed, 15 tests passed**.

### 관련 저장 회귀 테스트

```sh
pnpm exec vitest run \
  tests/main/services/core/chapter/chapterIncrementalPackage.test.ts \
  tests/main/services/core/chapter/chapterWriteTransaction.test.ts \
  tests/main/services/chapterService.test.ts \
  tests/main/services/projectService.immediateDurability.test.ts \
  tests/main/services/luieContainer.test.ts \
  tests/main/manager/autoSaveSaveContract.test.ts \
  tests/main/handler/manualSaveHandler.test.ts
```

상태: 실제 DB transaction, 실제 `.luie` entry, chapter 대용량 본문, project persistence policy, autosave generation·실패 전달, manual save full checkpoint를 함께 검증했다.

최종 결과: **7 files passed, 41 tests passed**.

초기 실행에서는 `chapterService.test.ts`가 하위 `attemptImmediatePackageExport`만 mock해 content-only update가 존재하지 않는 `/tmp/*.luie`에 접근하면서 3건이 실패했다. 테스트의 package 경계를 공개 API인 `persistPackageAfterMutation` mock으로 교정한 뒤 같은 명령에서 모두 통과했다.

### 정적 검사

```sh
pnpm exec eslint \
  src/main/services/features/project/projectService.ts \
  src/main/services/core/chapter/chapterWriteOperations.ts \
  tests/main/services/projectService.immediateDurability.test.ts \
  tests/main/services/core/chapter/chapterIncrementalPackage.test.ts \
  tests/main/services/chapterService.test.ts
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

이번 DB-10C 변경 파일에서는 TypeScript 오류가 보고되지 않았다.

## 잔여 검증 범위

- incremental 성공은 `ProjectAttachment.exportedRevision`을 앞당기지 않는다. 다른 도메인의 미반영 revision을 잘못 완료 처리하지 않기 위한 보수적 상태이며, 다음 시작에서 stale revision recovery가 전체 export를 한 번 수행할 수 있다.
- incremental entry와 authoritative DB revision의 crash/restart 경계 및 안전한 revision mark 조건은 [DB-10D 테스트](db-10d-crash-restart-consistency-test-report.md)에서 검증했다.
- 실제 사용자 크기 package의 write bytes, latency, main event-loop 지연 감소량은 아직 측정하지 않았다.
