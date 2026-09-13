# DB-10B SQLite entry transaction 테스트 보고서

## 문서 정보

| 항목             | 값                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------ |
| 테스트 기준      | `database.md` DB-10 추가 관찰                                                              |
| 테스트 대상      | `writeLuieSqliteEntry`                                                                     |
| 테스트 설계 기법 | ISTQB 명세 기반 테스트, 상태 전이, 오류 추정, fault injection                              |
| 테스트 레벨      | Real Filesystem / SQLite Integration                                                       |
| 실행일           | 2026-09-13 KST                                                                             |
| 기준 HEAD        | `0faf4fad`                                                                                 |
| 환경             | Darwin arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0, OS 임시 디렉터리의 실제 `.luie` |

## 변경 계약

- 단일 entry upsert, `meta.json` 갱신, `LuieContainerInfo.updatedAt` 갱신을 같은 `better-sqlite3` transaction에서 실행한다.
- 세 statement 중 하나가 실패하면 앞서 실행된 statement도 모두 rollback한다.
- entry path 검증, package 크기·format 검증, meta JSON 정규화는 write transaction 전에 끝낸다.
- 기존 `DELETE` journal과 `synchronous=FULL`, package path write lock을 유지한다.
- 함수 입력·반환과 `.luie` schema 및 payload 형식은 변경하지 않는다.

## 상태 모델

| 상태 | 설명                                                                 |
| ---- | -------------------------------------------------------------------- |
| W0   | 기존 entry, `meta.json`, container timestamp가 저장됨                |
| W1   | transaction 안에서 대상 entry upsert 실행                            |
| W2   | transaction 안에서 `meta.json` content·timestamp 갱신                |
| WF   | `LuieContainerInfo.updatedAt` UPDATE trigger가 `RAISE(ABORT)` 실행   |
| R0   | transaction rollback 후 entry, meta, container info가 모두 W0와 동일 |
| C0   | 정상 경로에서 세 write가 한 transaction으로 commit                   |

실패 전이는 `W0 → W1 → W2 → WF → R0`, 성공 전이는 `W0 → W1 → W2 → C0`다.

## 진입·종료 기준

진입 기준:

- OS 임시 디렉터리에 실제 SQLite v2 `.luie` 파일을 생성할 수 있다.
- SQLite trigger로 세 번째 statement인 container timestamp UPDATE를 실패시킬 수 있다.
- transaction 전후의 entry·meta·container row 전체를 직접 조회할 수 있다.

종료 기준:

- 마지막 statement 실패가 호출자에게 전달된다.
- 실패 뒤 대상 entry의 content·createdAt·updatedAt가 모두 이전 값이다.
- 실패 뒤 `meta.json`의 content·createdAt·updatedAt가 모두 이전 값이다.
- 실패 뒤 `LuieContainerInfo.updatedAt`가 이전 값이다.
- 정상 단건 write, 극단 크기·경로, package writer rollback, IPC filesystem 호출자 테스트가 통과한다.

## 테스트 케이스

### TC-DB-10B-A: container timestamp 실패 시 전체 rollback

| 항목      | 내용                                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------- |
| 목적      | 세 번째 write 실패 뒤 앞선 entry와 meta write가 부분 커밋되지 않는지 확인                                             |
| 사전 상태 | 실제 `.luie`에 `world/synopsis.json`, `meta.json`, `LuieContainerInfo`가 정상 저장됨                                  |
| 오류 주입 | `BEFORE UPDATE OF updatedAt ON LuieContainerInfo` trigger가 `RAISE(ABORT, 'forced container timestamp failure')` 실행 |
| 입력      | synopsis entry를 `before`에서 `after`로 변경하는 `writeLuieSqliteEntry` 호출                                          |
| 절차      | 세 row 사전 조회 → trigger 생성 → 단건 write → rejection 확인 → readonly connection으로 세 row 재조회                 |
| 기대 결과 | 강제 오류가 전달되고 entry·meta·container row가 content와 timestamp를 포함해 사전 상태와 완전히 동일                  |
| 실제 결과 | 기대 결과와 일치                                                                                                      |
| 결과      | PASS                                                                                                                  |

### TC-DB-10B-B: 정상 단건 write와 meta timestamp 갱신

| 항목      | 내용                                                           |
| --------- | -------------------------------------------------------------- |
| 목적      | transaction 적용 후 기존 성공 계약이 유지되는지 확인           |
| 사전 상태 | 과거 `updatedAt`을 가진 meta와 정상 SQLite v2 container        |
| 입력      | `world/synopsis.json` 단건 write                               |
| 절차      | package 생성 → 단건 write → `meta.json` read 및 timestamp 비교 |
| 기대 결과 | entry write 성공, meta.updatedAt이 기존 값보다 큼              |
| 실제 결과 | 기대 결과와 일치                                               |
| 결과      | PASS                                                           |

### TC-DB-10B-C: container·호출자 회귀

| 항목      | 내용                                                                           |
| --------- | ------------------------------------------------------------------------------ |
| 목적      | transaction이 크기·경로·format 검사와 filesystem IPC 계약을 바꾸지 않는지 확인 |
| 사전 상태 | 실제 임시 `.luie`와 handler mock fixture                                       |
| 입력      | container 기본·extreme·writer rollback·IPC migration test suite                |
| 절차      | 관련 4개 test file을 함께 실행                                                 |
| 기대 결과 | 모든 기존 assertion과 DB-10B fault test 통과                                   |
| 실제 결과 | 4 files, 47 tests 통과                                                         |
| 결과      | PASS                                                                           |

## 실행 기록

### DB-10B 실제 파일 통합 테스트

```sh
pnpm exec vitest run tests/main/services/luieContainer.test.ts
```

상태: OS 임시 디렉터리에 실제 SQLite `.luie`를 생성했다. 실제 `better-sqlite3` connection과 trigger를 사용했고 사용자 프로젝트 파일은 사용하지 않았다.

결과: **1 file passed, 13 tests passed**.

### 관련 회귀 테스트

```sh
pnpm exec vitest run \
  tests/main/services/luieContainer.test.ts \
  tests/main/services/luieContainer.extreme.test.ts \
  tests/main/services/luiePackageWriter.rollback.test.ts \
  tests/main/handler/ipcFsHandlers.luieMigration.test.ts
```

상태: 실제 container의 entry 크기·경로·format·sidecar 정리, package writer rollback, filesystem IPC의 SQLite v2 경계를 함께 검증했다.

결과: **4 files passed, 47 tests passed**.

### 정적 검사

```sh
pnpm exec eslint \
  src/main/services/io/luieSqliteContainer.ts \
  tests/main/services/luieContainer.test.ts
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

이번 DB-10B 변경 파일에서는 TypeScript 오류가 보고되지 않았다.

## 잔여 검증 범위

- trigger 기반 rollback은 실제 SQLite 파일과 journal을 사용했지만 process kill 또는 OS 전원 차단을 발생시키지는 않았다.
- transaction은 동일 파일 안 세 row의 원자성을 보장한다. package 전체 export와 authoritative main DB 사이의 일치성은 [DB-10D 테스트](db-10d-crash-restart-consistency-test-report.md)에서 검증했다.
- content-only chapter 저장 경로에서 이 단건 writer를 사용하는 작업은 DB-10C에서 구현한다.
