# DB-04B paused generation 보정 보고서

## 현재 판정

- [X] **PASS — pause 상태와 최신 source generation 동시 보존 (2026-09-18 KST)**
- 기준 parent commit: `21448949`

## 원인과 수정

worker가 source A용 pending row ID를 선택한 뒤 사용자가 pause하고 source B를 저장하면 enqueue는 paused row의 ID를 유지했다. resume이 같은 ID를 pending으로 바꾸므로 A를 가진 이전 selector가 이를 claim할 수 있었다.

공통 `upsertMemoryBuildJob()`에서 paused 상태는 유지하되 ID를 새 UUID로 교체하고 attempts/error를 초기화한다. resume 전에는 실행되지 않고, resume 뒤에는 B generation만 pending이 된다. 별도 table이나 generation column은 추가하지 않았다.

## 회귀

| 항목 | 내용 |
| --- | --- |
| 상태 전이 | selected A ID → pause → enqueue B → 새 UUID paused → resume |
| 기대 | 옛 ID claim 실패, 새 UUID pending, attempts 0, error null |
| 실제 | 기대값과 일치 |
| 테스트 | `tests/main/services/core/chapter/chapterDerivedJobs.test.ts` |
| 직접 결과 | 1 file / 3 tests PASS |
| 관련 회귀 | 4 files / 31 tests PASS |

```sh
pnpm exec vitest run \
  tests/main/services/core/chapter/chapterDerivedJobs.test.ts \
  tests/main/services/memoryProjectionService.test.ts \
  tests/main/services/dbMaintenanceService.test.ts \
  tests/main/services/memory/memoryBuildJobControl.test.ts
```

실제 worker별 임시 SQLite를 사용했고 `SKIP_DB_TEST_SETUP`은 사용하지 않았다. 실제 장시간 Electron pause/resume UI 조작은 검증 범위가 아니다.
