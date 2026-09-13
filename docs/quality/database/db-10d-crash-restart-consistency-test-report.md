# DB-10D 증분 package crash/restart 일치성 테스트 보고서

## 문서 정보

| 항목             | 값                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| 테스트 기준      | `database.md` DB-10                                                                              |
| 테스트 대상      | `writeLuieSqliteEntry`, `ProjectService.scheduleStalePackageExports`, `ProjectExportQueue.flush` |
| 테스트 설계 기법 | ISTQB 명세 기반 테스트, 상태 전이, 오류 추정                                                     |
| 테스트 레벨      | Real DB / Filesystem / Process Integration                                                       |
| 실행일           | 2026-09-13 KST                                                                                   |
| 기준 HEAD        | `0faf4fad`                                                                                       |
| 환경             | Darwin arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0, 실제 `SIGKILL`과 임시 SQLite 파일     |

## 검증 계약

- authoritative main DB transaction이 먼저 완료되고 `.luie` 증분 write 전에 프로세스가 종료되면 package는 이전 entry를 유지하고 project revision은 stale checkpoint로 남아야 한다.
- `writeLuieSqliteEntry()`가 완료된 직후 프로세스가 강제 종료되어도 chapter entry, `meta.json`, container timestamp는 한 transaction 결과로 재개방되어야 한다.
- content-only incremental 성공은 project 전체 변경을 대표할 수 없으므로 `exportedRevision`을 직접 앞당기지 않는다.
- 재시작 시 `revision > exportedRevision`인 attachment를 startup recovery가 찾아 authoritative DB 전체를 export한 뒤 `exportedRevision = revision`으로 맞춰야 한다.

## 상태 모델

| 상태 | 설명                                                                                       |
| ---- | ------------------------------------------------------------------------------------------ |
| R0   | DB와 package가 old body이며 `revision = exportedRevision`                                  |
| R1   | DB는 latest body이고 `revision > exportedRevision`, package는 아직 old body                |
| KB   | package write 전에 child process가 `SIGKILL`로 종료되어 package가 old body를 유지          |
| KA   | incremental transaction 완료 뒤 child process가 `SIGKILL`로 종료되어 package가 latest body |
| RS   | main DB connection을 종료하고 같은 파일로 다시 initialize한 재시작 상태                    |
| RC   | startup recovery full export 완료, package=latest body, `revision = exportedRevision`      |

검증 전이는 `R0 → R1 → KB → RS → RC`와 `R0 → R1 → KA → RS → RC`이다.

## 진입·종료 기준

진입 기준:

- worker별 실제 main/cache SQLite DB가 초기화되어 있다.
- OS 임시 디렉터리에 SQLite v2 `.luie`를 만들고 DB와 package를 같은 old body로 맞춘다.
- baseline project revision을 `markProjectExported()`로 current 상태로 만든다.
- 별도 Node.js child process가 Vite SSR loader로 실제 `writeLuieSqliteEntry()` TypeScript module을 실행할 수 있다.

종료 기준:

- write 완료 후 강제 종료한 파일이 재개방되고 `PRAGMA quick_check`가 `ok`를 반환한다.
- 완료된 incremental write의 chapter entry, `meta.json`, container timestamp가 같은 commit timestamp를 가진다.
- write 전 강제 종료에서는 package entry가 old body를 유지한다.
- 두 상태 모두 main DB 재연결 뒤 stale revision으로 탐지된다.
- startup recovery flush 뒤 package 본문이 authoritative DB 본문과 일치하고 `exportedRevision = revision`이다.
- 관련 container, revision, startup·shutdown 회귀 테스트가 통과한다.

## 테스트 케이스

### TC-DB-10D-A: incremental commit 직후 강제 종료

| 항목      | 내용                                                                                                             |
| --------- | ---------------------------------------------------------------------------------------------------------------- |
| 목적      | 완료 응답을 낸 SQLite 증분 transaction이 즉시 `SIGKILL`돼도 온전하게 남는지 확인                                 |
| 사전 상태 | DB와 package=old body, baseline revision current                                                                 |
| 입력      | main DB body를 latest로 저장 → child에서 `writeLuieSqliteEntry(latest)` 완료 → child 자신에게 `SIGKILL`          |
| 절차      | child exit signal 확인 → package 재개방 → chapter/meta/container timestamp와 `quick_check` 확인 → DB 재연결·복구 |
| 기대 결과 | signal=`SIGKILL`; entry=latest; 세 timestamp 동일; `quick_check=ok`; 복구 후 package와 revision current          |
| 실제 결과 | 기대 결과와 일치                                                                                                 |
| 결과      | PASS                                                                                                             |

### TC-DB-10D-B: incremental write 전 강제 종료

| 항목      | 내용                                                                                                 |
| --------- | ---------------------------------------------------------------------------------------------------- |
| 목적      | main DB만 최신인 crash window를 다음 시작에서 자동 복구하는지 확인                                   |
| 사전 상태 | DB와 package=old body, baseline revision current                                                     |
| 입력      | main DB body를 latest로 저장 → 실제 writer module을 load한 child를 write 호출 전에 `SIGKILL`         |
| 절차      | package=old 확인 → main DB disconnect/initialize → stale export schedule → export queue 명시적 flush |
| 기대 결과 | 재시작 직후 `revision > exportedRevision`; 복구 후 package=latest 및 두 revision 동일                |
| 실제 결과 | 기대 결과와 일치                                                                                     |
| 결과      | PASS                                                                                                 |

## 실행 기록

### DB-10D 전용 테스트

```sh
pnpm exec vitest run tests/main/services/projectSaveRecovery.integration.test.ts
```

상태: 실제 worker DB와 임시 `.luie`를 사용했다. 별도 Node.js process가 실제 incremental writer를 실행하거나 실행 직전에 멈춘 뒤 자신에게 `SIGKILL`을 보냈다. 이어서 main DB를 disconnect/initialize하고 startup recovery API를 실행했다.

결과: **1 file passed, 2 tests passed**.

### 관련 저장·수명주기 회귀 테스트

```sh
pnpm exec vitest run \
  tests/main/services/projectSaveRecovery.integration.test.ts \
  tests/main/services/core/chapter/chapterIncrementalPackage.test.ts \
  tests/main/services/luieContainer.test.ts \
  tests/main/services/projectRevisionStore.test.ts \
  tests/main/lifecycle/deferredStartupMaintenance.test.ts \
  tests/main/lifecycle/shutdownWiring.test.ts
```

상태: 실제 DB·package 증분 저장과 복구, revision CAS, startup stale export 연결, 정상 종료 export flush 결정을 함께 실행했다. 사용자 DB와 사용자 package는 사용하지 않았다.

결과: **6 files passed, 42 tests passed**.

### 정적 검사

```sh
pnpm exec eslint tests/main/services/projectSaveRecovery.integration.test.ts
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

이번 DB-10D 변경 파일에서는 TypeScript 오류가 보고되지 않았다.

## 판정과 잔여 범위

- DB-10D 종료 기준을 충족해 PASS로 판정한다.
- 안전한 revision mark는 기존 full export queue가 captured revision의 전체 package export에 성공한 뒤 수행하는 방식이다. chapter incremental 경로에서 project-wide `exportedRevision`을 직접 갱신하지 않는 현재 정책을 유지한다.
- 테스트는 write 호출 전과 commit 완료 직후의 실제 `SIGKILL`을 검증했다. SQLite commit 내부의 임의 instruction 또는 저장 장치 전원 차단은 재현하지 않았다.
- 재시작은 실제 DB connection 재생성과 production startup recovery API로 검증했다. packaged Electron application 전체를 종료·재실행하는 E2E는 수행하지 않았다.
- 실제 사용자 크기 package의 latency, write bytes, event-loop 지연은 측정하지 않았다. DB-10E 확대 여부는 별도 성능 측정 결과로 결정한다.
