# DB-04 claim 전 source generation 보정 테스트 보고서

## 문서 정보

| 항목        | 값                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------ |
| 테스트 기준 | `database.md` DB-04 P1 재개 조건                                                           |
| 대상        | `memoryBuildJobEnqueue`, `memoryProjectionService`, chapter derived enqueue                |
| 설계 기법   | ISTQB 상태 전이, 경쟁 조건 오류 추정, 회귀 테스트                                          |
| 테스트 레벨 | Component Integration / 실제 SQLite                                                        |
| 실행일      | 2026-09-13 KST                                                                             |
| 기준        | `b76d6f0e` 작업 트리                                                                       |
| 환경        | Darwin arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0, worker별 임시 main/cache SQLite |

## 결함과 수정 계약

worker가 pending job과 source A를 조회한 뒤 claim하기 전에 source B가 저장되면 기존 enqueue는 같은 job ID를 갱신했다. worker는 그 ID를 그대로 claim해 A로 chunk를 만들고 `completed`로 바꾸므로 B의 후속 pending이 사라졌다.

수정 후 pending 또는 failed job에 새 source가 enqueue되면 하나의 SQL UPDATE에서 job UUID를 새 값으로 교체한다. job ID를 generation token으로 사용하므로 이전 ID를 선택한 worker의 claim은 0행으로 실패한다. running job에는 기존 계약대로 별도 pending successor를 만들고 paused job은 사용자 상태를 보존한다. schema와 migration은 변경하지 않았다.

## 상태 전이

| 상태  | 사건                                          | 기대 전이                                     |
| ----- | --------------------------------------------- | --------------------------------------------- |
| P-A   | source A의 pending generation을 worker가 선택 | 아직 claim하지 않음                           |
| P-B   | claim 전 source B 저장·enqueue                | 같은 논리 작업의 UUID를 교체하고 pending 유지 |
| C-A   | worker가 이전 UUID로 claim                    | 0행, A 처리와 completed 확정 없음             |
| C-B   | 다음 worker cycle이 새 UUID claim             | B를 읽어 chunk 생성 후 completed              |
| R-A   | A generation이 이미 running                   | B용 pending successor 1개 생성                |
| PAUSE | paused generation에 새 source enqueue         | paused와 동일 UUID 유지                       |
| FAIL  | failed generation에 새 source enqueue         | 새 UUID의 pending, attempts 0, error null     |

## 진입·종료 기준

진입 기준:

- source 선택과 claim 사이에 B 저장을 결정적으로 삽입할 수 있다.
- 실제 `Chapter`, `ChapterBody`, `MemoryBuildJob`, `MemoryChunk` 상태를 조회할 수 있다.
- running·paused·failed 상태의 기존 회귀가 준비돼 있다.

종료 기준:

- claim 전 B enqueue 뒤 첫 실행은 `processed=0`, chunk 0개, 새 UUID pending 1개다.
- 다음 실행은 B chunk만 만들고 해당 generation을 completed로 끝낸다.
- running successor, paused 보존, failed 재활성화 계약이 유지된다.
- 관련 Vitest, ESLint, production build가 통과하고 변경 파일에 새 TypeScript 오류가 없다.

## 테스트 케이스

### TC-DB-04-R: RED 재현

| 항목         | 내용                                                                                 |
| ------------ | ------------------------------------------------------------------------------------ |
| 사전 상태    | 실제 임시 DB에 source A와 pending chunk job 1개                                      |
| 자극         | worker의 `setImmediate` 경계에서 source B와 derived jobs를 같은 transaction으로 저장 |
| 기대         | 이전 generation claim 실패, `processed=0`                                            |
| 수정 전 실제 | `processed=1`; A chunk 생성과 completed 확정                                         |
| 결과         | **FAIL 재현 성공**                                                                   |

### TC-DB-04-G1: claim 전 generation 교체

| 항목      | 내용                                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------- |
| 사전 상태 | TC-R과 동일                                                                                                           |
| 절차      | B 저장 → 새 UUID 확인 → 첫 worker 결과와 DB 조회 → 두 번째 worker 실행                                                |
| 기대      | 첫 실행은 pending B 보존·chunk 0개, 두 번째 실행은 B chunk·completed                                                  |
| 실제      | 첫 실행 `processed=0`, UUID 변경, pending 1개, chunk 0개; 두 번째 실행 `processed=1`, chunk=`source B`, completed 1개 |
| 결과      | PASS                                                                                                                  |

### TC-DB-04-G2: claim 이후와 제어 상태 회귀

| 항목 | 내용                                                                                |
| ---- | ----------------------------------------------------------------------------------- |
| 상태 | running A에 B/C enqueue, paused, failed                                             |
| 기대 | running+pending 각 1개; paused 유지; failed는 새 UUID pending·attempts 0·error null |
| 실제 | 기대와 일치                                                                         |
| 결과 | PASS                                                                                |

## 실행 기록

RED:

```sh
pnpm exec vitest run tests/main/services/memoryProjectionService.test.ts \
  -t "keeps a pending successor when the source changes after selection and before claim"
```

상태: 제품 코드 수정 전, 실제 worker별 임시 SQLite에서 실행했다. 결과는 **1 test failed**, `expected processed 0, received 1`이었다.

GREEN 및 실제 DB 회귀:

```sh
pnpm exec vitest run \
  tests/main/services/memoryProjectionService.test.ts \
  tests/main/services/core/chapter/chapterDerivedJobs.test.ts \
  tests/main/services/dbMaintenanceService.test.ts \
  tests/main/services/memory/memoryBuildJobControl.test.ts \
  tests/main/services/chapterSummaryProjector.test.ts
```

상태: `SKIP_DB_TEST_SETUP`을 사용하지 않았다. 실제 임시 main/cache SQLite에서 pre-claim 경쟁, chunk 생성, running successor, paused/failed 상태를 실행했다.

결과: **5 files passed, 33 tests passed**.

```sh
SKIP_DB_TEST_SETUP=1 pnpm exec vitest run \
  tests/main/services/embeddingProjector.test.ts
```

상태: 이 파일은 자체 DB mock을 사용하는 비DB 계약 테스트다.

결과: **1 file passed, 2 tests passed**.

정적·빌드 검사:

```sh
pnpm exec eslint \
  src/main/services/features/memory/memoryBuildJobEnqueue.ts \
  tests/main/services/memoryProjectionService.test.ts \
  tests/main/services/core/chapter/chapterDerivedJobs.test.ts
pnpm run build
pnpm run typecheck
```

결과: ESLint와 production build는 PASS다. typecheck는 기존 renderer `Sidebar.tsx:157`의 TS6133 한 건으로 실패했으며 DB-04 변경 파일의 새 오류는 없다.

## 판정

- [X] claim 전 source 변경은 이전 generation을 완료하지 않고 최신 generation을 pending으로 보존한다.
- [X] claim 후 변경은 running과 분리된 successor로 보존한다.
- [X] paused와 failed 정책 및 chunk·summary·embedding 관련 회귀가 통과했다.
- 실제 Electron 장시간 경쟁과 process crash는 이번 component integration 범위에 포함하지 않았다.
