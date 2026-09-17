# DB-04 파생 작업 generation 테스트 보고서

## 최신 보정 완료 · 2026-09-13

현재 판정: **PASS**. pending/failed 재enqueue에서 job UUID를 원자적으로 교체해 claim 전 source 변경이 이전 selector에 흡수되지 않게 했다. RED→GREEN 실제 DB 상태와 전체 실행 기록은 [claim 전 generation 보정 보고서](db-04-preclaim-generation-remediation-test-report.md)에 있다.

## 이전 QA 재검토 · 2026-09-13

당시 판정: **REOPEN · P1 · source 선조회 이후 claim 이전의 최신 작업 유실이 남아 있었다.** 아래 내용은 보정 전 재현 이력이다.

- 당시 [memoryProjectionService.ts](../../../src/main/services/features/memory/memoryProjectionService.ts)의 source batch 선조회(72행) → `setImmediate`(81행) → claim(83행) 사이에 source B를 저장하면, [memoryBuildJobEnqueue.ts](../../../src/main/services/features/memory/memoryBuildJobEnqueue.ts)가 기존 row ID를 유지했다. worker는 선조회한 A를 처리하고 그 row를 completed로 확정했다.
- 현재 소스를 로드한 실제 함수·native SQLite `:memory:` 재현 결과는 `body=B`, `chunk=A`, `jobs=[completed]`, `latestSourceHasPending=false`였다. Node v22.23.0, SQLite 3.53.4에서 DB singleton과 logger를 격리하고 worker yield에 synthetic B 저장과 실제 enqueue를 주입했다. 실제 Electron 장시간 경쟁 실측은 아니다.
- 재실행 스크립트는 `/private/tmp/luie-db04-current-review.cjs`이며 `node /private/tmp/luie-db04-current-review.cjs`로 실행했다. 임시 경로 산출물이므로 저장소에 영구 보관된 회귀 테스트는 아니다.
- 기존 상태 모델은 이미 running인 G0에서 시작해 이 창을 누락했다. 종료 기준에는 선조회 이후 claim 이전 변경, 실제 최신 chunk 내용, 후속 job 유무를 추가해야 한다. source를 claim 후 읽고 완료 시 generation/hash를 대조하는 보장이 아직 필요하다.

## 문서 정보

| 항목             | 값                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------- |
| 테스트 기준      | `database.md` DB-04                                                                     |
| 테스트 대상      | chapter derived enqueue, memory rebuild enqueue, SearchDirtyQueue enqueue               |
| 테스트 설계 기법 | ISTQB 명세 기반 테스트, 상태 전이, 동등 분할, 제어된 worker 완료                        |
| 테스트 레벨      | Real DB Integration                                                                     |
| 실행일           | 2026-09-13 KST                                                                          |
| 기준 HEAD        | `0faf4fad`                                                                              |
| 환경             | Darwin arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0, worker별 실제 SQLite 임시 DB |

## 변경 계약

- `MemoryBuildJob`과 `SearchDirtyQueue`의 row ID를 source 작업 generation 식별자로 사용한다.
- 같은 대상·작업 유형의 `pending` 또는 `failed` row가 있으면 UUID를 교체하고 pending으로 초기화해 이전 claim generation을 무효화한다.
- `running` row만 있으면 그 row를 갱신하지 않고 별도 `pending` row를 생성한다.
- worker가 이전 row ID를 `completed`로 바꿔도 새 row ID의 `pending` 상태는 영향을 받지 않는다.
- `paused` row는 사용자 중지 상태를 유지한다. 이후 DB-12에서 새 source의 `failed` row는 `pending`, attempts 0, error null로 재활성화하도록 확정했다.
- schema column이나 migration은 추가하지 않는다.

## 상태 모델

| 상태 | 설명                                                                            |
| ---- | ------------------------------------------------------------------------------- |
| G0   | source A용 작업 row가 `running`                                                 |
| G1   | source B 저장으로 서로 다른 ID의 후속 row가 `pending`                           |
| G2   | source C 저장이 후속 `pending` UUID를 교체해 `running` 1건·`pending` 1건을 유지 |
| G3   | source A worker가 자신의 row ID만 `completed`로 변경                            |
| G4   | 최신 source를 처리할 후속 row가 계속 `pending`                                  |
| P0   | 같은 대상의 작업이 `paused`                                                     |
| F0   | 같은 대상의 작업이 `failed`                                                     |

주요 검증 전이는 `G0 → G1 → G2 → G3 + G4`다. 최종 보존·재시도 회귀는 `P0 → P0`, `F0 → pending`이다.

## 진입·종료 기준

진입 기준:

- Vitest worker 전용 실제 SQLite main/cache DB가 초기화되어 있다.
- 동일 project/source/job type의 `running`, `pending`, `paused`, `failed` 상태를 직접 구성할 수 있다.
- 완료 update는 worker와 같은 방식으로 기존 row ID 또는 기존 `running` 상태만 대상으로 실행한다.

종료 기준:

- chunks, summary, embedding, search의 실행 중 enqueue가 각각 후속 `pending` row를 남긴다.
- 실행 중 source가 연속 변경되어도 후속 `pending`은 한 건으로 합쳐진다.
- 이전 generation 완료 뒤 최신 generation의 `pending`이 삭제되거나 `completed`로 바뀌지 않는다.
- 명시적 전체 memory rebuild도 `running` 작업을 최종 generation으로 취급하지 않는다.
- paused 사용자 중지와 DB-12의 failed 재활성화 계약이 함께 유지된다.

## 테스트 케이스

### TC-DB-04-A: 실행 중 chapter 파생 작업에 후속 generation 생성

| 항목      | 내용                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 목적      | source A 처리 중 B·C가 저장될 때 최신 작업이 이전 worker 완료에 흡수되지 않는지 확인                                            |
| 사전 상태 | 동일 chapter의 chunks, summary, embedding, search row 각 1건이 `running`                                                        |
| 입력      | `source-b-saved`, 이어서 `source-c-saved` reason으로 `enqueueChapterDerivedJobs` 2회 호출                                       |
| 절차      | 실행 중 row 준비 → B enqueue → C enqueue → 상태 조회 → 기존 memory/search row 완료 처리 → `pending` 재조회                      |
| 기대 결과 | 각 작업 유형마다 `running` 1건·`pending` 1건, search pending reason은 C, 이전 row 완료 뒤 memory pending 3건·search pending 1건 |
| 실제 결과 | 기대 결과와 일치                                                                                                                |
| 결과      | PASS                                                                                                                            |

### TC-DB-04-B: 전체 memory rebuild가 실행 중 작업 뒤에 후속 작업 유지

| 항목      | 내용                                                                                     |
| --------- | ---------------------------------------------------------------------------------------- |
| 목적      | project 전체 rebuild의 bulk dedupe도 `running`을 최신 요청으로 잘못 간주하지 않는지 확인 |
| 사전 상태 | chapter의 `rebuild_chunks`, `rebuild_embedding` row가 각각 `running`                     |
| 입력      | source filter 없이 `rebuildMemoryChunks({ projectId })` 호출                             |
| 절차      | 기존 pending 작업을 running으로 전환 → 전체 rebuild enqueue → 대상·job type별 상태 조회  |
| 기대 결과 | chunks와 embedding 각각 `running` 1건·`pending` 1건                                      |
| 실제 결과 | 기대 결과와 일치                                                                         |
| 결과      | PASS                                                                                     |

### TC-DB-04-C: paused 보존과 failed 재활성화 회귀

| 항목      | 내용                                                                                    |
| --------- | --------------------------------------------------------------------------------------- |
| 목적      | generation 분리로 사용자 pause와 새 source retry 정책이 우회되지 않는지 확인            |
| 사전 상태 | summary `paused` 1건 또는 embedding `failed` 1건                                        |
| 입력      | 동일 chapter에 `enqueueChapterDerivedJobs` 호출                                         |
| 절차      | 상태별 row 준비 → enqueue → row 수·ID·상태·priority·attempts·error 조회                 |
| 기대 결과 | paused는 기존 ID·상태 유지; failed는 새 UUID의 pending/attempts 0/error null로 재활성화 |
| 실제 결과 | 기대 결과와 일치                                                                        |
| 결과      | PASS                                                                                    |

## 실행 기록

### DB-04 실제 DB 통합 테스트

```sh
pnpm exec vitest run \
  tests/main/services/core/chapter/chapterDerivedJobs.test.ts \
  tests/main/services/dbMaintenanceService.test.ts
```

상태: `SKIP_DB_TEST_SETUP`을 사용하지 않았다. worker별 임시 SQLite main/cache DB에서 generation 상태와 완료 후 잔존 row를 조회했다. 사용자 DB와 실제 `.luie` 파일은 사용하지 않았다.

결과: **2 files passed, 7 tests passed**.

### 관련 job control 회귀 테스트

```sh
pnpm exec vitest run \
  tests/main/services/core/chapter/chapterDerivedJobs.test.ts \
  tests/main/services/dbMaintenanceService.test.ts \
  tests/main/services/memory/memoryBuildJobControl.test.ts
```

결과: **3 files passed, 17 tests passed**.

mock DB만 사용하는 embedding 테스트는 DB setup을 생략하는 프로젝트 규칙으로 별도 실행했다.

```sh
SKIP_DB_TEST_SETUP=1 pnpm exec vitest run \
  tests/main/services/embeddingProjector.test.ts
```

결과: **1 file passed, 2 tests passed**.

### 정적 검사

```sh
pnpm exec eslint \
  src/main/services/features/memory/memoryBuildJobEnqueue.ts \
  src/main/services/core/chapter/chapterDerivedJobs.ts \
  src/main/services/features/dbMaintenance/dbMaintenanceMemory.ts \
  src/main/services/features/memory/memoryProjectionService.ts \
  tests/main/services/core/chapter/chapterDerivedJobs.test.ts \
  tests/main/services/dbMaintenanceService.test.ts
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

이번 DB-04 변경 파일에서는 TypeScript 오류가 보고되지 않았다.

## 테스트 환경에서 확인된 제약

초기 실행에서 `memoryProjectionService.test.ts`와 `chapterSummaryProjector.test.ts`는 suite import 단계에서 `tests/setup.ts`의 Electron mock 때문에 종료됐고, `embeddingProjector.test.ts`는 자체 DB mock과 공통 setup이 충돌했다. 이후 공통 test setup을 현재 import 계약에 맞추고 비DB embedding 테스트만 `SKIP_DB_TEST_SETUP=1`로 분리했다. DB-09 완료 직후 실제 DB 통합 실행은 `memoryProjectionService.test.ts`를 포함한 18 files/71 tests가 통과했고 `chapterSummaryProjector.test.ts`도 관련 회귀에서 통과했다.

## 현재 잔여 검증 범위

- running 이후에는 별도 pending을 만들고 claim 이전에는 pending UUID를 교체해 최신 작업을 보존한다. 별도 source hash column과 schema migration은 추가하지 않았다.
- 과거 claim 전 유실 반례는 저장소의 실제 SQLite 회귀 테스트로 고정됐고 수정 후 통과했다.
- 실제 Electron main loop와 utility process를 함께 실행하는 장시간 경쟁 테스트는 수행하지 않았다.
- exhausted `failed` 작업의 새 source 재활성화는 DB-12에서 검증했고, 사용자 `paused`는 재활성화 대상에서 제외한다.
