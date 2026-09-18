# Database TODO 최종 회귀 테스트 보고서

현재 판정: **Risky — 2차 보정 완료, 실환경 검증 미완료**. 2026-09-18 현재 R1/R2 통합 회귀 182건과 DB-04B·DB-06B·DB-12B 후속 회귀가 통과했다. source LOC gate와 실제 Electron·사용자 규모 성능/crash 검증 전에는 release 안정화 완료로 올리지 않는다.

## 문서 정보

| 항목             | 값                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| 테스트 기준      | `implementation-todo.md` DB-01~DB-14                                                           |
| 테스트 설계 기법 | ISTQB 명세 기반 테스트, 상태 전이, 경곗값 분석, 오류 추정, 회귀 테스트                         |
| 테스트 레벨      | Unit / Component Integration / Real DB·Filesystem·Process Integration / Build                  |
| 실행일           | 2026-09-13 KST                                                                                 |
| 기준             | `b76d6f0e` 작업 트리; 기존 154건 실행 기준은 `0faf4fad` 위 변경                               |
| 환경             | Darwin 25.6.0 arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0, worker별 임시 SQLite·`.luie` |

## QA 검토 소스의 커밋 기준

원 실행은 `0faf4fad` 위 미커밋 변경에서 수행했다. QA 재검토 후 그 제품 코드·테스트·migration을 변경 없이 아래 5개 작업 커밋으로 나눴다. 누적 코드 기준은 `ba707bf3adca4c1764b5b41a45aee5ab77eb9db5`이며, 이어지는 문서 커밋은 SSoT·TODO·보고서 판정 동기화다. 이는 기존 개별 실행의 dirty tree fingerprint를 소급 복원했다는 의미가 아니다.

| 커밋       | 작업 범위                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| `cc53190e` | main/cache schema·migration·packaged bootstrap, cache transaction API, 공통 테스트 Electron mock             |
| `5b45fa9e` | 파생 enqueue·runnable 선택·wake-up, chunk 재사용, 검색 dirty 범위·FTS transaction 및 관련 테스트             |
| `a93ea9f5` | 저장 세대·실패 전파, chapter transaction·revision 정책, keyword 갱신, export 조회·증분 패키지 및 관련 테스트 |
| `2e5e50b4` | low-end vector 정책 실행 연결과 검색 테스트                                                                  |
| `ba707bf3` | 원격 pagination·row delta·local apply와 동기화 테스트                                                        |

문서 커밋 `b76d6f0e` 뒤 작업 트리에서 DB-04 claim 전 generation 유실, DB-06 동시 FTS 중복, DB-09 대량 revision bind 실패, DB-11 stale sync package/revision, DB-12 전체 rebuild와 global history scan을 수정했다.

## 기존 실행의 검증 범위

| 묶음 | 실행 상태                                                                                      | 결과                    |
| ---- | ---------------------------------------------------------------------------------------------- | ----------------------- |
| R1   | 실제 main/cache DB, FTS/vector, transaction rollback, 300장/1,000 appearance, `.luie`, SIGKILL | 19 files, 79 tests PASS |
| R2   | DB setup 생략, mock IPC/service/HTTP, autosave 경쟁, export queue, sync pagination/delta        | 14 files, 103 tests PASS |
| R3   | main/cache Drizzle migration journal·schema                                                    | PASS                    |
| R4   | 1K/3K chapter derived DB benchmark threshold                                                   | PASS                    |
| R5   | Electron main/preload/renderer production bundle                                               | PASS                    |
| R6   | 변경 source와 신규 테스트 ESLint, whitespace diff                                              | PASS                    |
| R7   | TypeScript 전체                                                                                | 기존 renderer 오류 1건  |

총 회귀 결과는 **33 files, 182 tests passed**다. R1과 R2에는 중복 파일이 없으며 사용자 DB와 사용자 `.luie`는 사용하지 않았다.

## 기존 실행 기록

### R1: 실제 DB·filesystem·process 통합

```sh
pnpm exec vitest run \
  tests/main/services/appearanceCacheIsolation.test.ts \
  tests/main/services/chapterKeywordAppearanceTransaction.test.ts \
  tests/main/services/chapterSearchCacheRebuild.test.ts \
  tests/main/services/chapterService.test.ts \
  tests/main/services/core/chapter/chapterDerivedJobs.test.ts \
  tests/main/services/core/chapter/chapterIncrementalPackage.test.ts \
  tests/main/services/core/chapter/chapterKeywordDispatchAfterCommit.test.ts \
  tests/main/services/core/chapter/chapterRevisionRetention.test.ts \
  tests/main/services/core/chapter/chapterWriteTransaction.test.ts \
  tests/main/services/core/project/projectExportRecord.test.ts \
  tests/main/services/dbMaintenanceService.test.ts \
  tests/main/services/derivedJobRunnableSelection.test.ts \
  tests/main/services/luieContainer.test.ts \
  tests/main/services/memoryProjectionService.test.ts \
  tests/main/services/projectSaveRecovery.integration.test.ts \
  tests/main/services/rag/contextAssemblerSearch.test.ts \
  tests/main/services/searchService.test.ts \
  tests/main/services/syncLocalApply.test.ts \
  tests/main/services/syncStalePackageRevision.test.ts
```

상태: `SKIP_DB_TEST_SETUP`을 사용하지 않았다. worker별 임시 main/cache SQLite를 초기화하고 FTS5/sqlite-vec, transaction failure trigger, 300장 FTS, 1,000 appearance bulk, revision retention, `.luie` entry transaction, child `SIGKILL` 후 startup recovery를 실행했다. sync world/memo delta에는 미변경 sibling UPDATE/DELETE를 `RAISE(ABORT)` 하는 TEMP trigger 3개를 설치했다.

2026-09-18 재실행 결과: **19 files passed, 79 tests passed**. DB-06B clear/upsert·FTS 부재 회귀 2건이 추가됐다.

초기 분류 실행에서 이 묶음 중 `chapterService`, `chapterDerivedJobs`, `chapterKeywordDispatchAfterCommit`을 비DB 묶음에 잘못 넣어 DB 초기화 전 8건이 실패했다. 실제 DB setup으로 옮긴 뒤 `chapterDerivedJobs`의 paused 보존/failed 재활성화 모순 2건을 발견했고 공통 enqueue helper를 수정했다. 최종 동일 실제 DB 범위는 모두 통과했다.

### R2: 비DB 계약·scheduler·원격 sync

```sh
SKIP_DB_TEST_SETUP=1 pnpm exec vitest run \
  tests/main/handler/manualSaveHandler.test.ts \
  tests/main/manager/autoSaveSaveContract.test.ts \
  tests/main/services/autoSaveManager.runtimeStats.test.ts \
  tests/main/services/derivedJobWorkerWakeup.test.ts \
  tests/main/services/projectExportEngine.test.ts \
  tests/main/services/projectExportQueue.test.ts \
  tests/main/services/projectService.immediateDurability.test.ts \
  tests/main/services/snapshotService.packageBehavior.unit.test.ts \
  tests/main/services/syncBundleApplier.commitOrder.test.ts \
  tests/main/services/syncDelta.test.ts \
  tests/main/services/syncMapper.test.ts \
  tests/main/services/syncRepository.test.ts \
  tests/main/services/syncService.test.ts \
  tests/main/services/worldReplicaService.test.ts
```

상태: 실제 DB를 검증하지 않는 mock 범위만 넣었다. 저장 세대 경쟁과 실패 전파, export 선택, 5K~5M snapshot body 전달, idle wake-up, 2,001/1,001 원격 pagination, 무작업/directional sync delta를 실행했다.

2026-09-18 재실행 결과: **14 files passed, 103 tests passed**. 기존 101건 뒤 world tombstone read/revive 회귀 2건이 추가됐다.

### R3: migration

```sh
pnpm run check:drizzle
```

결과: **main PASS, cache PASS — Everything's fine**.

### R4: derived DB benchmark

```sh
pnpm run check:derived-db-bench
```

상태: `/tmp/luie-bench`의 synthetic SQLite에서 1,000×5,000자, 3,000×5,000자, 1,000×15,000자 dataset을 사용했다.

결과: **thresholds passed**. list50 0.06~~0.07ms, openOne 0.05~~0.10ms, enqueue500 2.05~2.48ms였다. 단일 로컬 warm 실행값이며 실기기 SLA로 해석하지 않는다.

### R5: production build

```sh
pnpm run build
```

결과: **PASS**. main 938 modules, preload 31 modules, renderer 2,952 modules를 변환했다.

### R6: 정적 검사

변경된 DB/save/search/sync source와 신규 테스트를 대상으로 `pnpm exec eslint <files>`를 실행했다.

결과: **PASS, lint error 0개**.

```sh
git diff --check
```

결과: **PASS**.

### R7: 전체 TypeScript

```sh
pnpm run typecheck
```

결과: **BLOCKED by pre-existing unrelated error**.

```text
src/renderer/src/features/manuscript/components/Sidebar.tsx(157,5):
TS6133: 'handleRenameProject' is declared but its value is never read.
```

이번 database 작업 파일에서는 TypeScript 오류가 보고되지 않았고 production build는 통과했다.

## 추가 품질 gate 상태

- `check:core-complexity`: PASS. renderer 기존 advisory 2건만 출력됐다.
- `check:persist-contracts`: 기존 `graphStore.ts`의 persist option 누락 1건으로 실패했다. database 변경과 무관하다.
- `check:source-loc`: 당시 실패를 기존 대형 파일 중심으로 설명했으나, 최신 QA에서 **원 HEAD 대비 database 누적 변경 파일 8건·기존 16건**으로 정정했다. 상세 비교는 아래 최신 검증 결과를 따른다. 기능·정확성 검사를 완화하거나 baseline을 올리지 않았다.
- `verify:packaged-drizzle`은 빌드된 app resources 경로를 요구한다. 로컬 `resources/`에는 builder가 복사하기 전의 drizzle 산출물이 없어 검증 대상으로 사용할 수 없으며, `electron-builder.json`은 root `drizzle`을 `extraResources/drizzle`로 복사하도록 유지한다.

## 이전 판정 기록 — 최신 QA에서 대체됨

- TODO의 필수 구현 DB-01~DB-14와 조건부 DB-10E 판정은 각 항목 보고서의 종료 기준을 충족했다.
- 저장 성공 의미, rollback, source generation, bounded history, pagination, no-op sync, package crash recovery를 실제 실패·경계 상태에서 확인했다.
- 남은 실패는 renderer TypeScript 1건과 기존 저장소 품질 debt이며 이번 database 동작의 실패는 없다.

## 2026-09-13 최신 QA 검증 결과

검토 기준은 원 HEAD `0faf4fad`와 그 위의 database 변경분이다. 누적 보정은 `21448949`, DB-04B는 `b7e7f957`, DB-06B는 `9a23054e`, DB-12B는 `2d3219bf`에 고정했다. 위 문서 정보의 HEAD는 이전 실행 기준으로 보존한다. 그보다 앞선 개별 실행에는 변경분 fingerprint와 raw Vitest 산출물이 연결되어 있지 않아 HEAD만으로 당시의 정확한 소스 상태를 재구성할 수 없다.

- R1의 동일 명령을 실제 worker별 main/cache SQLite·임시 `.luie` 환경에서 재실행: **19 files, 79 tests PASS**. DB-06 upsert/clear 경쟁·mapping 실패 rollback·FTS 부재 fallback, DB-09 33,000건 retention·5분 경계·DELETE 실패 rollback, DB-11 stale package/revision, DB-12 failed/paused 전체 rebuild와 50,000건 global query를 포함한다.
- R2의 동일 명령을 `SKIP_DB_TEST_SETUP=1`인 mock 계약 환경에서 재실행: **14 files, 103 tests PASS**. DB-11이 재사용하는 export queue와 world tombstone read/revive 회귀를 포함한다.
- 합계 **33 files, 182 tests PASS**. DB-04 claim 전 경쟁, DB-06 upsert/clear 동시성, DB-09 대량 이력, DB-11 stale package/world tombstone, DB-12 전체 rebuild/global query를 영구 회귀에 포함했다.
- `pnpm run check:drizzle` main/cache와 `git diff --check` 재실행: PASS. packaged Electron에서의 기존 DB 업그레이드 실행을 뜻하지 않는다.
- `pnpm run build` 재실행: PASS — main 938, preload 31, renderer 2,952 modules transformed.
- 변경된 database source·회귀 테스트 ESLint: PASS. `check:core-complexity`는 renderer 기존 advisory 2건을 출력하고 PASS했다.
- `pnpm run typecheck` 재실행: 기존 `Sidebar.tsx`의 `TS6133` 1건을 재현했다. 기존 renderer 오류와 아래 database 잔존 결함을 구분한다.
- `check:persist-contracts`: 기존 `graphStore.ts` persist option 누락 1건으로 실패. `check:main-service-boundaries`: 기존 `autoSaveMirrorStore.ts` legacy import 1건으로 실패. `check:target-file-drift`는 task packet 부재로 enforcement를 건너뛰었다.
- `verify:packaged-drizzle`은 `<resourcesPath>` 인수 없이 실행해 usage exit 1이었다. migration/schema 검증은 `check:drizzle`과 실제 worker DB bootstrap으로 수행했으며 packaged app resources 검증으로 확대하지 않는다.
- `node scripts/check-source-loc.mjs` 재실행: **24건 실패**. 원 HEAD `0faf4fad` 대비 database 누적 변경 파일 8건과 기존 범위 16건으로 분류했다.

| 이번 변경으로 새로 실패한 파일                                     | 원 HEAD LOC → 검토 시 LOC | 실패 원인               |
| ------------------------------------------------------------------ | ------------------------- | ----------------------- |
| `src/main/services/features/dbMaintenance/dbMaintenanceService.ts` | 498 → 522                 | 새 500줄 초과           |
| `src/main/services/features/search/chapterSearchCacheService.ts`   | 431 → 567                 | 새 500줄 초과           |
| `tests/main/services/memoryProjectionService.test.ts`              | 366 → 589                 | 새 500줄 초과           |
| `tests/main/services/syncLocalApply.test.ts`                       | 350 → 538                 | 새 500줄 초과           |
| `src/main/services/features/project/projectService.ts`             | 522 → 565                 | 허용 baseline 526 초과  |
| `tests/main/services/luieContainer.test.ts`                        | 570 → 641                 | 허용 baseline 570 초과  |
| `tests/main/services/projectExportEngine.test.ts`                  | 630 → 681                 | 허용 baseline 630 초과  |
| `tests/main/services/syncService.test.ts`                          | 1243 → 1325               | 허용 baseline 1243 초과 |

LOC는 `scripts/check-source-loc.mjs`와 같은 줄 계산법을 사용했다. database 누적 변경 파일 8건은 기존 debt로 종료할 수 없으며, 크기 자체를 데이터 손실 결함으로 해석하지는 않는다.

2026-09-18 LOC 1차 보정에서 production 3건을 기존 책임 모듈로 분리했다. source LOC script 기준 `dbMaintenanceService.ts` 493줄, `chapterSearchCacheService.ts` 446줄, `projectService.ts` 492줄이며 `projectService.ts`의 stale debt baseline도 제거했다. 실제 DB·queue·project 회귀 **7 files/69 tests**, 비DB validation **1 file/2 tests**, ESLint와 build가 통과했다. `check:source-loc`는 **21건 실패(database 테스트 5건 + 기존 범위 16건)**로 줄었고, typecheck는 기존 `Sidebar.tsx:157` 오류 1건만 남았다. 오래된 `projectService.pathSafety.test.ts`는 현재 `infra/database`의 `getClient()`가 아닌 제거된 mock 경계를 사용해 별도 정리가 필요하다.

LOC 2차 보정은 `syncLocalApply`의 chapter upsert와 `memoryProjectionService`의 pre-claim generation 회귀를 별도 파일로 이동했다. 원 assertion은 유지했고 실제 DB **4 files/18 tests**와 ESLint가 통과했다. `check:source-loc`는 **19건 실패(database 테스트 3건 + 기존 범위 16건)**다.

### 환경과 성능 증거의 범위

- R1은 실제 SQLite·filesystem 통합이지만 `tests/setup.ts`의 Electron mock을 사용한다. R2의 DB/IPC/HTTP mock 통과를 실서버·실제 IPC 저장 성공으로 확대하지 않는다. DB-14도 utility 환경 변수와 vector guard spy를 사용한 실행기 테스트이며 실제 utility process 통합은 아니다.
- R4 `scripts/benchmark-derived-db.mjs`는 production `better-sqlite3`·Drizzle 경로가 아닌 `node:sqlite`와 직접 작성한 축약 schema를 사용한다. dataset마다 list/open/enqueue를 한 번씩 측정하며 `.luie` export, autosave, FTS rebuild, 변경된 runnable index와 worker는 실행하지 않는다. 기존 threshold PASS는 이번 변경의 p95/p99 또는 성능 개선 증거가 아니다.
- `tests/.tmp/derived-db-bench.json`의 2026-09-13 결과는 위 R4 수치와 일치한다. 기존 `save-latency-*.json`은 2026-07-20 생성 결과이며 확인 가능한 source HEAD는 `c7ddf4b…`다. 이번 변경의 측정값으로 재사용하지 않는다.
- 실제 사용자 규모에서 같은 corpus로 측정한 저장·전체 export p95/p99, main event-loop delay, 실패율, SQL/commit 수, heap/RSS, DB/WAL/package write bytes가 없다. cold/warm, 저사양, 배터리/AC, 저속·외장 볼륨, Windows/Linux 검증도 없다.
- DB-10D는 별도 Node child에서 writer 호출 전 또는 writer 반환 후 `SIGKILL`을 발생시키고, 부모의 DB 연결 재생성과 recovery API로 복구를 확인했다. writer 반환 시에는 정상 `database.close()`까지 끝난다. commit 내부 강제 종료, authoritative DB writer 강제 종료, packaged Electron 전체 종료·재실행, 전원 차단은 검증하지 않았다.
- DB-10E는 성능 근거와 허용 한계가 없어 **확대 보류를 결정한 것**이다. 측정이나 world·snapshot 증분 구현을 완료한 상태가 아니다.
- 기존 `writingLoop.fullprod.spec.ts`는 이번 실행 기록에 포함되지 않는다. 현재 harness는 `api.chapter.update` 왕복을 측정하고 queue timeout 뒤 pending/running 0을 단언하지 않는다. Electron helper도 DB URL 외 userData·sync 격리를 보장하지 않으므로 수정·격리 확인 없이 안정화 인증에 사용하지 않는다.

원 감사 `database.md`의 `/private/tmp/luie-*.cjs` 재현 스크립트 4개는 현재 존재하지 않는다. 과거 원인 분석 기록은 보존하되, 해당 명령을 현재 재실행 가능한 증거로 분류하지 않는다.

### 보정 항목과 근거

| 항목                            | 구현 범위                                                           | 최신 QA 보정 결과와 증거                                                                                                                                                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **DB-04 · 해결**                | pending/failed UUID generation 교체, running successor, paused 보존 | 실제 SQLite RED에서 claim 전 B 유실을 재현하고 수정 후 이전 claim 0행·새 pending·다음 cycle B chunk를 확인했다. [보정 보고서](db-04-preclaim-generation-remediation-test-report.md)                                                                                                              |
| **DB-09 · 해결**                | reason 분리, coalescing, SQL subquery 최신 100개 retention          | 실제 `ChapterService.updateChapter`와 SQLite에서 33,000건 저장·100건 상한, 299,999/300,000ms 경계, 강제 DELETE 실패 rollback을 확인했다. [보정 보고서](db-09-large-history-remediation-test-report.md)                                                                                       |
| **DB-11 · 2차 보정 완료**       | 양방향 row delta, authoritative export, world tombstone, snapshot precondition | DB-11A 즉시 export·실패 retry·DB 재연결·revive와 DB-11B body/metadata stale 거부·B/C conflict·bounded retry를 확인했다. [DB-11A](test2/db-11a-world-deletion-remediation-test-report.md), [DB-11B](test2/db-11b-concurrent-chapter-remediation-test-report.md) |
| **DB-06 · 해결**                | 전체·단건 FTS transaction, prepared INSERT, rowid mapping           | 동시 단건 upsert 뒤 projection/FTS 각 1건과 mapping 일치, mapping 실패 시 전체 단건 rollback을 실제 cache SQLite에서 확인했다. [보정 보고서](db-06-concurrent-upsert-remediation-test-report.md)                                                                                                  |
| **DB-12 · 해결**                | 전체 rebuild generation reset, global partial index, idle wake-up  | failed-only는 새 ID의 pending/0/null, paused는 보존했다. 50,000 completed + 1 pending의 실제 global query가 terminal 제외 partial index를 사용하고 20회 p95 < 50ms를 통과했다. [보정 보고서](db-12-full-rebuild-global-query-remediation-test-report.md)                                                |

최신 QA의 임시 재현 스크립트에는 `/private/tmp/luie-db04-current-review.cjs`, `/private/tmp/luie-retention-review-repro.cjs`, `/private/tmp/luie-sync-snapshot-review.cjs`가 사용됐다. 임시 경로는 영구 검증 산출물이 아니다. DB-04·DB-09·DB-11 반례는 저장소 테스트로 옮겼다.

원 SSOT DB-13의 “같은 인물 1,000회 출현 → appearance INSERT 1,000회” 가정은 현재 extractor의 `seen` dedupe와 맞지 않는다. [DB-13 결과본](db-13-keyword-appearance-transaction-test-report.md)은 이 가정을 이미 정정했다. cache API 1,000행 rollback 검증과 반복 이름 1개 추출 검증을 구분한다.

## 최신 최종 판정

- 기존 DB-01~14 보고 범위와 DB-11A·DB-11B·DB-04B·DB-06B 후속 정확성 반례, DB-12B production query 근거 보정을 완료했다.
- 현재 R1/R2 회귀 182건, DB-04B 관련 실제 DB 4 files/31 tests, DB-06B 관련 실제 DB 4 files/20 tests, DB-12 관련 실제 DB 5 files/35 tests·비DB 2 files/3 tests가 통과했다. 실제 SQLite·임시 파일 사용은 유효한 통합 증거지만, 제한된 crash 위치와 미측정 실환경 성능까지 보장하지 않는다.
- TypeScript 기존 renderer 오류 1건, source LOC database 테스트 3건·기존 범위 16건, 기존 persist/main-service boundary gate 실패를 각각 남긴다. 이전의 “남은 실패는 기존 debt뿐”이라는 판정을 철회한다.
- DB-10D는 명시한 Node writer 전후·DB 재연결 복구 범위만 완료이며, DB-10E는 조건부 확대 보류다. 후속 수정·반례 회귀와 현재 revision의 실제 Electron/사용자 규모 검증 후 안정화 여부를 다시 판정한다.
