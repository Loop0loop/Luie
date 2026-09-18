# DB-11 sync authoritative package 보정 테스트 보고서

## 판정

**PASS — [X] 완료 (2026-09-13 KST).** sync local apply 뒤 `.luie` 저장을 stale merged bundle 기반 writer에서 기존 `ProjectExportQueue`의 authoritative DB export로 전환했다. local snapshot A 뒤 DB와 package가 B로 저장된 상태에서 remote character delta를 적용해도 DB/package 본문은 B이고, 완료 revision도 그 package와 일치한다.

이 PASS는 authoritative package sub-scope의 과거 판정이다. 2026-09-14 후속 QA에서 분리한 DB-11A world 삭제 부활과 DB-11B 동일 chapter 경쟁도 각각 [DB-11A 보고서](test2/db-11a-world-deletion-remediation-test-report.md), [DB-11B 보고서](test2/db-11b-concurrent-chapter-remediation-test-report.md)에서 완료했다. DB-11 전체 현행 판정은 SSoT를 따른다.

이 판정은 worker별 실제 임시 SQLite·실제 임시 `.luie`와 production sync applier/export queue 경로에 한정한다. 원격 HTTP는 synthetic bundle로 대체했고 DB connection 재시작만 수행했다. packaged Electron process 재실행이나 실제 Supabase 경쟁 실행은 아니다.

## 문서 정보

| 항목 | 값 |
| --- | --- |
| 기준 | `database.md` DB-11 재개 조건 |
| 대상 | `applyMergedBundleToLocalFirstLuie`, `ProjectExportQueue`, project revision checkpoint, `.luie` container |
| 설계 기법 | ISTQB 명세 기반 테스트, 상태 전이, 결정표, 오류 추정, 회귀 테스트 |
| 테스트 레벨 | Real DB·Filesystem Integration, Component Mock, Unit, Build |
| 실행일 | 2026-09-13 KST |
| 기준 소스 | `b76d6f0e` 위 DB-04·DB-09·DB-11 작업 트리 |
| 환경 | Darwin arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0, better-sqlite3 13.0.3 |

## 결함과 수정 계약

보정 전 sync는 local A와 remote를 merge한 `packageBundle`을 오래 보관했다. 그 사이 로컬 저장과 package flush로 본문 B가 확정돼도, remote delta transaction 뒤 현재 project revision을 캡처한 다음 package payload는 A로 만들었다. 따라서 DB=B, package=A인데 `revision=exportedRevision`인 거짓 완료 상태가 가능했다.

보정 후 sync transaction은 remote delta만 DB에 적용하고 영향 프로젝트 ID를 확정한다. 이후 `projectService.exportProjectPackageNow(projectId, "sync")`를 호출한다. 이 queue는 export 시작 revision을 캡처하고 authoritative DB에서 full package를 만든 뒤 해당 revision만 완료 처리한다. export 중 revision이 증가하면 최신 revision으로 다시 export한다.

통과 조건은 다음과 같다.

- stale package bundle의 chapter A를 입력해도 현재 ChapterBody B를 A로 되돌리지 않는다.
- remote character delta는 실제 DB에 반영되고 최종 `.luie` chapter entry는 B다.
- 성공 뒤 `revision=exportedRevision`이고 DB 재연결 뒤에도 package B와 revision 상태가 유지된다.
- 재연결 뒤 해당 project가 `listProjectsNeedingExport()`에 나타나지 않는다.
- authoritative export가 `false` 또는 예외면 sync apply는 `SYNC_LUIE_PERSIST_FAILED`로 실패하고 `sync:retry`를 예약한다.
- DB transaction 실패 시 package export를 시작하지 않는다.
- export 도중 더 최신 revision이 생기면 queue가 dirty 상태를 유지하고 후속 export로 최신 세대를 처리한다.

## 상태 모델

| 상태 | 설명 |
| --- | --- |
| S0 | sync가 local chapter A를 수집한 상태 |
| L1 | remote 대기 중 로컬 저장 완료: authoritative DB=B, `.luie`=B, revision current |
| R1 | remote character 변경이 도착하고 stale merged bundle은 chapter A를 포함 |
| D1 | sync transaction이 character delta를 DB에 commit하고 project revision 증가 |
| P1 | authoritative export queue가 D1 이후 DB에서 package payload 수집 |
| OK | DB body=B, package body=B, remote character 존재, revision=exportedRevision |
| F1 | authoritative export 실패, retry 예약 및 sync 실패 |

주요 전이는 `S0 → L1 → R1 → D1 → P1 → OK`다. 실패 전이는 `D1 → F1`이며 DB transaction 실패는 `R1 → error`에서 package export 없이 종료한다.

## 결정표

| DB apply | authoritative export | revision 증가 중 export | 기대 상태 |
| --- | --- | --- | --- |
| 성공 | 성공 | 없음 | package current, sync 계속 |
| 성공 | 성공 | 있음 | queue가 다시 export한 뒤 최신 revision 완료 |
| 성공 | 실패 | 무관 | `SYNC_LUIE_PERSIST_FAILED`, `sync:retry` |
| 실패 | 미실행 | 무관 | `SYNC_DB_CACHE_APPLY_FAILED`, package 호출 0회 |

## 테스트 케이스

### TC-DB-11-R: stale package/revision RED

| 항목 | 내용 |
| --- | --- |
| 목적 | mock 계약 재현을 실제 DB·파일 반례로 승격 |
| 사전 상태 | L1; 실제 Project/Chapter/ChapterBody/Attachment, 실제 `.luie` entry=B, baseline revision 완료 |
| 입력 | chapter A와 remote character를 가진 stale merged bundle, character-only local delta |
| 절차 | production applier 호출 → DB·file·revision 조회 |
| 기대 결과 | DB/package=B, character 반영, revision current |
| 보정 전 실제 결과 | DB=B, package=A, 최신 revision 완료; file assertion 실패 |
| 결과 | **RED 재현 성공** |

### TC-DB-11-A: authoritative DB export GREEN

| 항목 | 내용 |
| --- | --- |
| 목적 | stale bundle payload가 최신 로컬 저장을 덮어쓰지 못하는지 확인 |
| 사전 상태 | TC-DB-11-R과 동일 |
| 입력 | 동일 stale A + remote character delta |
| 절차 | applier 완료 → character/ChapterBody/container entry/revision 조회 |
| 기대 결과 | remote character 존재, DB/package body=B, `revision=exportedRevision` |
| 실제 결과 | 기대 결과와 일치 |
| 결과 | **PASS** |

### TC-DB-11-B: DB 재연결 후 완료 상태

| 항목 | 내용 |
| --- | --- |
| 목적 | in-memory 상태가 아닌 persisted DB/package 결과 확인 |
| 사전 상태 | TC-DB-11-A 완료 |
| 절차 | main/cache DB disconnect → initialize → package·revision·stale 목록 재조회 |
| 기대 결과 | package=B, revision 상태 동일, export 필요 목록에 project 없음 |
| 실제 결과 | 기대 결과와 일치 |
| 결과 | **PASS** |

### TC-DB-11-C: package export 실패

| 항목 | 내용 |
| --- | --- |
| 목적 | DB apply 뒤 package 실패를 sync 성공으로 오판하지 않는지 확인 |
| 사전 상태 | mocked transaction 성공, authoritative export가 `false` 반환 |
| 입력 | 영향 project 1개 |
| 기대 결과 | `SYNC_LUIE_PERSIST_FAILED:project-1`, `schedulePackageExport(project-1, sync:retry)` 1회 |
| 실제 결과 | 기대 결과와 일치 |
| 결과 | **PASS** |

### TC-DB-11-D: DB apply 실패 순서

| 항목 | 내용 |
| --- | --- |
| 목적 | DB가 실패했는데 package만 최신으로 쓰는 역순 부분 성공 방지 |
| 사전 상태 | transaction이 즉시 예외 발생 |
| 기대 결과 | `SYNC_DB_CACHE_APPLY_FAILED`, authoritative export 0회 |
| 실제 결과 | 기대 결과와 일치 |
| 결과 | **PASS** |

### TC-DB-11-E: export queue 세대·재시도 회귀

| 항목 | 내용 |
| --- | --- |
| 목적 | 새 sync 경로가 의존하는 queue의 revision/dirty/failure/detached 계약 확인 |
| 사전 상태 | fake timer와 mocked revision/export 경계 |
| 입력 | export 중 최신 revision 도착, 실패 후 명시적 flush, detached/reattach 등 13개 상태 |
| 기대 결과 | 최신 세대 재실행, 실패 상태 보존, 명시적 retry 및 clean skip |
| 실제 결과 | 1 file, 13 tests PASS |
| 결과 | **PASS** |

## 실행 기록

### RED와 GREEN

```sh
pnpm exec vitest run tests/main/services/syncStalePackageRevision.test.ts
```

보정 전 결과: **1 file failed, 1 test failed**. 실제 `.luie` chapter entry 기대값 B에 대해 A가 반환됐다. 보정 후 동일 명령은 **1 file passed, 1 test passed**다.

상태: `SKIP_DB_TEST_SETUP`을 사용하지 않았다. worker별 임시 SQLite migration과 OS 임시 `.luie`를 사용했고 사용자 DB·사용자 package를 수정하지 않았다. remote fetch 완료 시점의 상태는 stale merged bundle A와 remote character delta로 직접 구성했다.

### component·queue·legacy package 회귀

```sh
SKIP_DB_TEST_SETUP=1 pnpm exec vitest run \
  tests/main/services/syncBundleApplier.commitOrder.test.ts \
  tests/main/services/projectExportQueue.test.ts
```

상태: mock transaction/export와 fake timer로 순서, 실패, retry, export 중 새 revision을 제어했다.

결과: **2 files passed, 17 tests passed**.

```sh
pnpm exec vitest run \
  tests/main/services/syncPackagePersistence.retry.test.ts \
  tests/main/services/syncPackagePersistence.test.ts
```

상태: 이전 sync 전용 builder의 retry/checkpoint 및 world/memory payload 회귀다. 일부 case가 실제 임시 DB를 사용하므로 DB setup을 생략하지 않았다.

결과: **2 files passed, 4 tests passed**.

### 전체 database 회귀

R1에 `syncStalePackageRevision.test.ts`를 추가해 실제 DB·filesystem·process 묶음을 실행했다.

결과: **19 files passed, 72 tests passed**.

R2 기존 13개 비DB 묶음은 **13 files/88 tests PASS**였고, 새 production 경로가 직접 의존하는 `projectExportQueue.test.ts` **1 file/13 tests PASS**를 별도 실행했다. 중복 없는 R2 범위는 **14 files/101 tests**, DB-11 완료 직후 R1과 합계는 **33 files/173 tests PASS**였다.

### 정적 검사와 build

```sh
pnpm exec eslint \
  src/main/services/features/sync/syncBundleApplier.ts \
  tests/main/services/syncBundleApplier.commitOrder.test.ts \
  tests/main/services/syncStalePackageRevision.test.ts
pnpm run build
git diff --check
```

결과: ESLint **PASS**, production build **PASS**(main 938, preload 31, renderer 2,952 modules), diff check **PASS**.

```sh
pnpm run typecheck
```

결과: 이번 DB-11 파일의 오류는 없으나 기존 renderer 오류로 전체 명령은 실패했다.

```text
src/renderer/src/features/manuscript/components/Sidebar.tsx(157,5):
TS6133: 'handleRenameProject' is declared but its value is never read.
```

## 잔여 범위

- 실제 DB·file의 위험 상태를 검증했지만 실제 Supabase 응답을 지연시킨 HTTP 종단 테스트는 아니다. fetch 단계의 A와 remote 결과를 applier 입력으로 고정했다.
- DB connection 재연결은 수행했지만 Electron process kill/relaunch는 하지 않았다. process crash 경계는 DB-10D의 제한된 범위와 동일하게 별도다.
- sync는 영향 프로젝트를 authoritative DB에서 full export한다. world·snapshot 증분 확대는 DB-10E에서 근거 부족으로 보류한 정책을 유지한다.
