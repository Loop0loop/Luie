# DB-06B clear transaction 보정 보고서

## 현재 판정

- [X] **PASS — clear/upsert 결합 원자성·FTS 부재 fallback 완료 (2026-09-18 KST)**
- 기준 parent commit: `b7e7f957`

## 원인과 수정

기존 `clearChapter()`는 FTS rowid 조회, projection 삭제, FTS 삭제를 세 await 경계로 나눴다. 그 사이 같은 chapter upsert가 새 FTS row와 mapping을 만들면 clear가 projection을 지운 뒤 옛 rowid만 삭제해 고아 FTS를 남길 수 있었다.

현재 mapping 조회·projection 삭제·FTS 삭제를 기존 `cacheDb.runSqliteTransaction()` 한 번으로 묶었다. FTS table/module 부재 오류는 transaction rollback 뒤 projection-only delete로 재실행한다.

## 회귀

| 항목 | 내용 |
| --- | --- |
| 결합 전이 | 기존 mapping → `Promise.all(clearChapter, upsertChapter)` |
| 기대 | target projection 1·FTS 1, rowid mapping 일치, unrelated project 보존 |
| FTS 부재 | FTS table 제거 뒤 clear가 오류 없이 projection 삭제 |
| 직접 결과 | 1 file / 7 tests PASS |
| 관련 회귀 | 4 files / 20 tests PASS |

```sh
pnpm exec vitest run \
  tests/main/services/chapterSearchCacheRebuild.test.ts \
  tests/main/services/chapterService.test.ts \
  tests/main/services/searchService.test.ts \
  tests/main/services/dbMaintenanceService.test.ts
```

실제 worker별 main/cache SQLite를 사용했고 `SKIP_DB_TEST_SETUP`은 사용하지 않았다. 여러 process가 같은 cache DB를 동시에 쓰는 시나리오는 지원·검증 범위가 아니다.
