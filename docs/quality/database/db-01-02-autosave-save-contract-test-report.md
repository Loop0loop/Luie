# DB-01·DB-02 자동 저장 계약 테스트 보고서

## 문서 정보

| 항목             | 값                                                                    |
| ---------------- | --------------------------------------------------------------------- |
| 테스트 기준      | `database.md` DB-01, DB-02                                            |
| 테스트 대상      | `performAutoSave`, `flushAllPendingSaves`, `MANUAL_SAVE` handler      |
| 테스트 설계 기법 | ISTQB 명세 기반 테스트, 상태 전이, 결정표, 제어된 비동기 interleaving |
| 테스트 레벨      | Unit Mocked / Handler Unit Mocked                                     |
| 실행일           | 2026-09-12 KST                                                        |
| 기준 HEAD        | `0faf4fad`                                                            |
| 환경             | Darwin arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0             |

## 범위와 상태 모델

자동 저장 상태는 다음 다섯 상태로 구분했다.

| 상태 | 설명                                                    |
| ---- | ------------------------------------------------------- |
| S0   | pending 없음                                            |
| S1   | 본문 A가 pending이고 저장 전                            |
| S2   | 본문 A의 DB 저장이 진행 중                              |
| S3   | A 저장 중 같은 chapter의 본문 B가 새 pending으로 등록됨 |
| SF   | DB 저장이 실패하고 최신 pending이 남아 있음             |

검증한 전이는 `S1 → S2 → S3 → S2(B) → S0`과 `S1 → SF`다. 실제 시간 지연 대신 테스트가 resolve 시점을 제어하는 Promise를 사용해 A 저장 중 B 도착 상태를 재현했다.

## 진입·종료 기준

진입 기준:

- 동일 chapter/project에 서로 다른 본문 A와 B를 준비한다.
- DB 쓰기 성공·대기·실패를 테스트에서 결정할 수 있다.
- `saved`, error, mirror, snapshot, package export 호출을 관찰할 수 있다.

종료 기준:

- 최신 pending B가 이전 A 완료로 삭제되지 않는다.
- flush는 같은 chapter의 후속 세대까지 처리한다.
- DB 실패는 pending을 보존하고 호출자에게 전달된다.
- `MANUAL_SAVE`는 flush 실패 뒤 package export를 호출하지 않는다.
- 관련 기존 handler·runtime stats 회귀 테스트가 통과한다.

## 테스트 케이스

### TC-DB-01-A: 저장 중 도착한 최신 본문 보존

| 항목      | 내용                                                                                                     |
| --------- | -------------------------------------------------------------------------------------------------------- |
| 목적      | A 저장 완료가 새 pending B를 삭제하거나 최신 본문을 저장 완료로 표시하지 않는지 확인                     |
| 사전 상태 | S1, `pendingSaves[chapter-1] = A`                                                                        |
| 입력      | A=`old body`, B=`new body`, 동일 chapter/project                                                         |
| 절차      | A 저장 시작 → DB Promise 대기 확인 → pending을 B로 교체 → A 완료 → 상태 확인 → B 저장 실행               |
| 기대 결과 | A 완료 후 B 유지, `saved`·mirror·snapshot 미호출. B 완료 후 pending 제거, `saved` 1회, mirror에는 B 전달 |
| 실제 결과 | 기대 결과와 일치                                                                                         |
| 결과      | PASS                                                                                                     |

### TC-DB-01-B: flush가 후속 세대까지 배출

| 항목      | 내용                                                                                |
| --------- | ----------------------------------------------------------------------------------- |
| 목적      | flush 시작 후 같은 chapter의 후속 세대가 생겨도 미저장 pending을 남기지 않는지 확인 |
| 사전 상태 | S1, 첫 `performSave`가 A 처리 중 B를 pending으로 등록하도록 제어                    |
| 입력      | project-1/chapter-1의 A와 B                                                         |
| 절차      | `flushAllPendingSaves` 실행 → 첫 save에서 B 등록 → 두 번째 save에서 B 제거          |
| 기대 결과 | `performSave` 2회, flush 종료 시 pending 0개                                        |
| 실제 결과 | `performSave` 2회, pending 0개                                                      |
| 결과      | PASS                                                                                |

### TC-DB-02-A: DB 실패 전달과 pending 보존

| 항목      | 내용                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------- |
| 목적      | DB 실패가 성공으로 변환되지 않고 재시도 가능한 최신 본문을 보존하는지 확인                      |
| 사전 상태 | S1, latest body가 pending                                                                       |
| 입력      | `updateChapter`가 `database unavailable` error를 throw                                          |
| 절차      | `performAutoSave` 실행 → rejection·pending·event·stats 확인                                     |
| 기대 결과 | 동일 error로 reject, pending 유지, error event 1회, `saved`·mirror 미호출, failed 1/succeeded 0 |
| 실제 결과 | 기대 결과와 일치                                                                                |
| 결과      | PASS                                                                                            |

### TC-DB-02-B: 수동 저장에서 package export 차단

| 항목      | 내용                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| 목적      | autosave flush 실패 후 이전 DB 내용으로 `.luie` package를 생성하지 않는지 확인                               |
| 사전 상태 | `MANUAL_SAVE` handler 등록, 실제 `flushAllPendingSaves`에 pending 1건 등록                                   |
| 입력      | project-1, `chapter database write failed` error                                                             |
| 절차      | handler 실행 → flush 내부 DB save 단계 실패 주입 → rejection 확인 → `exportProjectPackageNow` 호출 여부 확인 |
| 기대 결과 | flush error가 유지되고 package export는 0회                                                                  |
| 실제 결과 | 동일 error로 reject, package export 0회                                                                      |
| 결과      | PASS                                                                                                         |

## 실행 기록

### 계약 테스트

```sh
SKIP_DB_TEST_SETUP=1 pnpm exec vitest run \
  tests/main/manager/autoSaveSaveContract.test.ts \
  tests/main/handler/manualSaveHandler.test.ts
```

상태: 제품 DB setup을 생략한 mock 계약 환경. 실제 SQLite·filesystem·Electron은 사용하지 않았다.

결과: **2 files passed, 7 tests passed**.

### 관련 회귀 테스트

```sh
SKIP_DB_TEST_SETUP=1 pnpm exec vitest run \
  tests/main/manager/autoSaveSaveContract.test.ts \
  tests/main/services/autoSaveManager.runtimeStats.test.ts \
  tests/main/handler/manualSaveHandler.test.ts \
  tests/main/handler/ipcInputValidation.system.test.ts
```

상태: autosave manager 통계, handler 성공·실패 순서, IPC 입력 검증을 함께 실행했다. 기존 runtime stats 테스트의 mock이 과거 `services`/`database` 경로를 가리켜 실제 Electron utility import로 빠지는 테스트 환경 오류를 발견했다. mock을 현재 `domains`/`infra` 경계로 교정한 뒤 같은 명령을 다시 실행했다.

최종 결과: **4 files passed, 21 tests passed**.

### 정적 검사

```sh
pnpm exec eslint \
  src/main/manager/autoSave/autoSavePerformSave.ts \
  src/main/manager/autoSave/autoSaveFlushOps.ts \
  src/main/manager/autoSave/autoSaveManager.ts \
  src/main/manager/autoSave/autoSaveInterval.ts \
  tests/main/manager/autoSaveSaveContract.test.ts \
  tests/main/handler/manualSaveHandler.test.ts \
  tests/main/services/autoSaveManager.runtimeStats.test.ts
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

이번 변경 파일에서는 TypeScript 오류가 보고되지 않았으며, 해당 renderer 오류는 이 작업 범위에서 수정하지 않았다.

## 잔여 검증 범위

- 이 테스트는 manager와 handler의 저장 완료 계약을 검증한다.
- 실제 SQLite write failure, 강제 종료, mirror 복구, 실제 `.luie` 파일 내용은 DB-03과 DB-10 단계의 real DB/filesystem 테스트에서 검증한다.
- 지속적인 입력으로 flush 중 새 generation이 무한히 추가되는 사용 상태의 최대 대기 정책은 이번 범위에 포함하지 않았다.
