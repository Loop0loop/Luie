# Project-wide Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `.luie` 복구 데이터의 DB revision, package 내용, exported checkpoint가 같은 canonical 상태를 가리키게 한다.

**Architecture:** `ChapterBody`와 memory canonical DB를 먼저 실제 export SSOT로 맞춘다. 그 위에 SQLite trigger로 mutation과 revision을 원자화하고, queue 밖 full writer는 payload와 같은 시점에 캡처한 revision만 성공 후 mark한다.

**Tech Stack:** Electron 40, TypeScript 5, Drizzle ORM, better-sqlite3, SQLite trigger, Vitest, pnpm

## Global Constraints

- 설계 SSOT: `docs/superpowers/specs/2026-07-19-project-wide-revision-design.md`.
- branch `feature/00-save-integrity`, 현재 workspace 사용. worktree 금지.
- 새 DB table/column/migration/dependency/event log 금지.
- revision은 단조 증가 dirty token이며 mutation 수와 같을 필요가 없다.
- canonical rollback은 revision도 rollback한다.
- package 성공 전 `exportedRevision`을 올리지 않는다.
- renderer package entry writer는 full checkpoint로 mark하지 않는다.
- 사용자 dirty renderer/UI 파일과 `tests/dom/entityGallery.test.tsx`는 수정·stage하지 않는다.
- 각 Task는 RED → GREEN → 회귀 → SSOT 동기화 → subagent 코드/테스트 검토 → 사용자 승인 → 한 커밋이다.
- 자동 backoff, Notion UI timer, P95 인증은 범위 밖이다.

## Review Decisions

초안 `6d88fff9`의 병렬 검토에서 발견된 차단 사항을 다음처럼 해결한다.

- `ChapterBody`만 최신인데 `Chapter.content`를 export하던 false-clean을 Task 1에서 먼저 제거한다.
- sync는 detached bundle을 쓰므로 persistence 시점 revision을 읽지 않고 DB apply transaction의 revision을 전달한다.
- sync memory canonical row를 package만이 아니라 DB에도 같은 transaction으로 적용한다.
- attach/materialize/corrupt recovery를 queue 밖 full writer 목록에 포함한다.
- real DB 테스트는 `SKIP_DB_TEST_SETUP=1`을 쓰지 않고 Electron-as-Node로 실행한다.
- 구현 코드를 계획에 복제하지 않고 exact interface, assertion, command만 SSOT로 둔다.

---

### Task 1: ChapterBody를 실제 본문 SSOT로 통일

**Files:**

- Modify: `src/main/services/core/project/exportEngine/projectRecord.ts`
- Modify: `src/main/services/features/sync/syncBundleHelpers.ts`
- Modify: `src/main/services/features/sync/syncLocalApply.ts`
- Modify: `src/main/services/core/project/projectImportTransaction.ts`
- Modify: `src/main/services/features/snapshot/snapshotImportFromFile.ts`
- Modify: `tests/main/services/projectExportEngine.test.ts`
- Create: `tests/main/services/syncBundleHelpers.chapterBody.test.ts`
- Modify: `tests/main/services/syncLocalApply.test.ts`
- Modify: `tests/main/services/projectImportTransaction.test.ts`
- Modify: `docs/superpowers/specs/2026-07-19-project-wide-revision-design.md`
- Modify: `docs/superpowers/plans/2026-07-19-project-wide-revision.md`

**Interfaces:**

- `ChapterBody.content` 우선, row가 없을 때만 `Chapter.content` fallback.
- `upsertChapter(tx, chapter)`는 Chapter와 ChapterBody를 같은 transaction에서 갱신.
- package/snapshot import는 Chapter insert와 ChapterBody insert를 같은 transaction에서 수행.

- [x] **Step 1: RED 작성**

다음 assertion을 실제 DB 또는 현재 query mock에 추가한다.

```ts
expect(exportedChapter.content).toBe("chapter-body-new");
expect(syncBundle.chapters[0]?.content).toBe("chapter-body-new");
expect(savedChapter.content).toBe("remote-body");
expect(savedChapterBody.content).toBe("remote-body");
```

fixture는 같은 chapter에 `Chapter.content = "legacy-old"`, `ChapterBody.content = "chapter-body-new"`를 저장한다. import/sync assertion은 두 table 값이 같은지 확인한다.

- [x] **Step 2: RED 확인**

Run:

```bash
ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron ./node_modules/vitest/vitest.mjs run --no-file-parallelism tests/main/services/projectExportEngine.test.ts tests/main/services/syncBundleHelpers.chapterBody.test.ts tests/main/services/syncLocalApply.test.ts tests/main/services/projectImportTransaction.test.ts
```

Expected: exporter/sync collector가 legacy content를 읽거나 ChapterBody가 없어 FAIL.

- [x] **Step 3: 최소 GREEN**

- `getProjectForExport()`의 chapter query는 `ChapterBody`를 left join하고 `bodyContent ?? chapter.content`를 mapper 입력으로 사용한다.
- `buildLocalBundleFromDatabase()`는 project chapter의 body rows를 한 번에 읽어 `Map<chapterId, content>`로 overlay한다. chapter마다 query하는 N+1은 만들지 않는다.
- `upsertChapter()`는 기존 Chapter upsert 뒤 `ChapterBody`를 `chapterId` conflict update하고 `hashChapterContent(content)`를 저장한다.
- `applyProjectImportTransaction()`와 snapshot import transaction도 동일한 body row를 bulk insert한다.

- [x] **Step 4: GREEN·정적 검증**

Step 2 명령을 다시 실행한다. 이어서 대상 ESLint, `pnpm run typecheck`, `git diff --check`를 실행한다. typecheck는 사용자 dirty `BinderSidebarPanelBody.tsx:102` 기존 `TS2322` 외 신규 오류가 없어야 한다.

- [x] **Step 5: 검토·SSOT·커밋**

subagent가 export/sync/import 세 경로의 본문 우선순위와 테스트를 독립 검토한다. 설계 SSOT에 실제 테스트 결과를 기록하고 사용자 승인 후 정확한 Task 1 파일만 다음 메시지로 커밋한다.

```text
fix(storage): export canonical chapter bodies
```

Actual (2026-07-19): RED는 4 files/17 tests 중 5건이 normal export와 sync collector의 legacy 본문 사용, sync apply와 package/snapshot import의 `ChapterBody` 누락으로 예상대로 실패했다. 최소 구현 뒤 같은 Electron-as-Node 명령은 4 files/17 tests PASS이고, body overlay 테스트는 두 chapter를 한 번의 `ChapterBody` query로 처리하면서 row 없는 chapter의 legacy fallback도 고정한다. 대상 ESLint와 `git diff --check`는 PASS다. `tsc6 --noEmit`은 Task 1 신규 오류 없이 사용자 dirty `BinderSidebarPanelBody.tsx:102`의 기존 TS2322 한 건만 유지한다. 독립 재리뷰 verdict는 Production-ready이며 Critical/Important 0이다.

Final review follow-up: insert/update query를 만들기만 하고 `.run()`하지 않는 변이를 기존 mock assertion이 놓치는 Important 1건을 수정했다. table별 run spy와 sync 기존 update/신규 insert branch assertion을 먼저 추가한 뒤 production의 네 `.run()`을 임시 제거했을 때 focused 2 files/9 tests 중 3건이 예상대로 실패했다. production 원복 후 지정 4 files/17 tests는 다시 PASS했고, 재리뷰는 Production-ready, Critical/Important/Minor 0이다.

---

### Task 2: SQLite revision trigger와 업그레이드 backfill

**Files:**

- Create: `src/main/database/main/projectRevisionTriggerSql.ts`
- Modify: `src/main/database/main/databaseSchemaBootstrap.ts`
- Modify: `src/main/services/core/project/projectRevisionStore.ts`
- Modify: `src/main/services/features/world/entities/characterService.ts`
- Modify: `src/main/services/features/world/entities/eventService.ts`
- Modify: `src/main/services/features/world/entities/factionService.ts`
- Modify: `src/main/services/features/world/entities/termService.ts`
- Create: `tests/main/database/projectRevisionTrigger.test.ts`
- Modify: `tests/main/services/projectRevisionStore.test.ts`
- Modify: `tests/main/services/worldEntitySaveIntegrity.test.ts`
- Modify: `tests/main/services/projectSaveRecovery.integration.test.ts`
- Modify: `docs/superpowers/specs/2026-07-19-project-wide-revision-design.md`
- Modify: `docs/superpowers/plans/2026-07-19-project-wide-revision.md`

**Interfaces:**

```ts
export const PROJECT_REVISION_DIRECT_TABLES: readonly string[];
export const PROJECT_REVISION_TRIGGER_NAMES: readonly string[];
export const PROJECT_REVISION_TRIGGER_SQL: string;
export function touchProjectUpdatedAt(
  client: DbLike,
  projectId: string,
  nowIso: string,
): void;
```

direct table은 Chapter, Character, Term, Faction, Event, WorldEntity, EntityRelation, Snapshot, WorldDocument, ScrapMemo와 `MEMORY_CANONICAL_EXPORTABLE_TABLES` 11종이다. ChapterBody는 owner Chapter lookup trigger를 사용한다.

- [x] **Step 1: RED 작성**

`projectRevisionTrigger.test.ts`가 다음을 실제 bootstrap DB로 검증한다.

- Project INSERT는 revision 1, title/description/createdAt 변경은 증가, updatedAt-only 변경은 불변.
- 대표 direct table INSERT/UPDATE/DELETE delta.
- ChapterBody INSERT/UPDATE/DELETE owner delta.
- projectId 이동 시 old/new project 모두 증가.
- transaction rollback 시 data와 revision 모두 원복.
- EntityRelation pointer-only normalization delta 0, semantic insert/`createdAt` update delta 1.
- trigger 이름 집합은 정확히 expected와 같고 memory subset은 `MEMORY_CANONICAL_EXPORTABLE_TABLES`와 같다.
- ProjectAttachment exportedRevision, ProjectLocalState, ProjectSettings mutation은 revision 불변.
- trigger 하나만 삭제한 legacy DB 재-bootstrap은 모든 기존 project를 정확히 1 증가시키고 다음 재실행은 불변.

`worldEntitySaveIntegrity.test.ts`는 seed 뒤 baseline을 읽어 service mutation revision delta와 `Project.updatedAt` 변경을 함께 검증한다. recovery test는 고정 revision seed를 없애고 baseline mark → raw chapter mutation → export 수렴을 검증한다.

- [x] **Step 2: RED 확인**

Run:

```bash
ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron ./node_modules/vitest/vitest.mjs run --no-file-parallelism tests/main/database/projectRevisionTrigger.test.ts tests/main/services/projectRevisionStore.test.ts tests/main/services/worldEntitySaveIntegrity.test.ts tests/main/services/projectSaveRecovery.integration.test.ts
```

Expected: trigger module/설치가 없어 FAIL.

- [x] **Step 3: 최소 GREEN**

- 고정 table 목록에서 idempotent INSERT/UPDATE/DELETE SQL을 만든다.
- EntityRelation UPDATE OF에는 `projectId`, semantic fields, `createdAt`, `updatedAt`을 포함하고 pointer columns는 제외한다.
- Project metadata trigger는 revision update 재귀를 일으키지 않는다.
- bootstrap은 trigger가 하나라도 없으면 `CREATE TRIGGER`와 `UPDATE Project SET revision = revision + 1`을 하나의 better-sqlite3 transaction에서 실행한다.
- 기존 four entity service는 `bumpProjectRevision` 대신 `touchProjectUpdatedAt`을 사용해 trigger 이중 증가를 없앤다.

- [x] **Step 4: GREEN·회귀·정적 검증**

Step 2와 `tests/main/database/entityRelationPointerTrigger.test.ts`, 기존 export queue/recovery tests를 Electron-as-Node로 실행한다. 대상 ESLint, `pnpm run typecheck`, `git diff --check`를 실행한다.

- [x] **Step 5: 검토·SSOT·커밋**

subagent가 trigger SQL, 테스트 false-positive, SSOT table 목록을 따로 검토한다. Critical/Important 0이면 결과를 문서에 기록하고 사용자 승인 후 커밋한다.

```text
feat(storage): track canonical project revisions
```

Actual (2026-07-19): RED는 trigger module과 `touchProjectUpdatedAt` 부재, raw canonical mutation 미추적으로 지정 4 files 중 3 files가 예상 실패했다. 최소 구현 뒤 지정 4 files/20 tests PASS, pointer trigger와 export queue/checkpoint/DB-loss recovery를 포함한 8 files/63 tests PASS다. 총 68개 trigger와 direct table 21종의 정확한 집합 및 각 direct table 실제 CRUD delta, partial legacy trigger 복구 시 모든 project 정확히 +1 및 다음 bootstrap idempotency, canonical transaction과 강제 backfill 실패 rollback 원자성을 실제 DB로 검증했다. 최종 리뷰 follow-up은 project A/B의 Chapter 사이로 `ChapterBody.chapterId` 이동 시 양쪽 revision이 각각 +1임을 production 변경 없이 고정했고, 재리뷰는 Production-ready, Critical/Important/Minor 0이다. 대상 ESLint와 `git diff --check`는 PASS이며, `tsc6 --noEmit`은 Task 2 신규 오류 없이 사용자 dirty Binder TS2322 baseline만 유지한다. 별도 `dbRecoveryService.test.ts`는 hoisted `better-sqlite3` mock과 전역 cache DB setup 충돌로 production 진입 전 7 tests가 skip되어 통과 수에 포함하지 않았다.

---

### Task 3: Sync DB 상태와 captured revision을 동일 transaction에 고정

**Files:**

- Create: `src/main/services/features/sync/syncMemoryCanonicalApply.ts`
- Modify: `src/main/services/features/sync/syncBundleApplier.ts`
- Modify: `src/main/services/features/sync/syncPackagePersistence.ts`
- Create: `tests/main/services/syncMemoryCanonicalApply.test.ts`
- Modify: `tests/main/services/syncBundleApplier.commitOrder.test.ts`
- Modify: `tests/main/services/syncPackagePersistence.retry.test.ts`
- Modify: `docs/superpowers/specs/2026-07-19-project-wide-revision-design.md`
- Modify: `docs/superpowers/plans/2026-07-19-project-wide-revision.md`

**Interfaces:**

```ts
export function applyMemoryCanonicalSyncRows(
  tx: DbLike,
  bundle: SyncBundle,
  deletedProjectIds: ReadonlySet<string>,
): void;

export type SyncCapturedRevisions = ReadonlyMap<string, number>;
```

`applyMergedBundleToLocalFirstLuie()`의 DB transaction은 merged chapter/world/memory를 적용한 뒤 non-deleted bundle project revision을 읽어 `SyncCapturedRevisions`를 반환한다. `persistBundleToLuiePackages()`는 이 map을 필수 입력으로 받고 현재 revision을 다시 조회하지 않는다.

- [x] **Step 1: RED 작성**

- memory apply test는 local+remote merged canonical rows가 raw `row.id`를 유지해 DB에 upsert되고 명시적 deleted row만 제거되는지 검증한다. bundle에 없는 suggested/local-only row는 보존돼야 한다.
- transaction failure 시 memory와 revision 모두 rollback되는지 검증한다.
- commit-order test는 `db apply → revision capture → package` 순서를 검증한다.
- persistence test는 전달된 revision 7로 write를 시작하고 writer 안에서 DB current revision을 8로 올린 뒤 `markProjectExported(projectId, 7)`만 호출되는지 검증한다.
- write/mark 실패 시 mark 성공 기록이 없고 `sync:retry`가 예약되는지 검증한다.

- [x] **Step 2: RED 확인**

Run:

```bash
ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron ./node_modules/vitest/vitest.mjs run --no-file-parallelism tests/main/services/syncMemoryCanonicalApply.test.ts tests/main/services/syncBundleApplier.commitOrder.test.ts tests/main/services/syncPackagePersistence.retry.test.ts
```

Expected: memory DB apply와 transaction capture interface가 없어 FAIL.

- [x] **Step 3: 최소 GREEN**

- sync memory helper는 허용된 canonical table만 처리한다. non-deleted merged row는 dependency 순서로 upsert하고 명시적 deleted row만 dependency 역순으로 삭제한다. bundle에 없는 package 밖 local row는 보존한다. sync row의 `row.id`와 `projectId`를 보존하고 import용 ID rescoping helper는 재사용하지 않는다.
- DB transaction 마지막 select 결과를 map으로 반환한다.
- package persistence는 map의 captured revision을 payload build/write와 함께 사용하고 성공 후 같은 값만 mark한다.
- capture 후 concurrent edit는 더 큰 current revision으로 남아 startup/queue dirty 판정이 유지된다.

- [x] **Step 4: GREEN·회귀·정적 검증**

Step 2, `syncService.test.ts`, `projectExportQueue.test.ts`를 실행한다. 대상 ESLint, `pnpm run typecheck`, `git diff --check`를 실행한다.

- [x] **Step 5: 검토·SSOT·커밋**

subagent가 memory FK 순서, raw ID 보존, concurrency test를 독립 검토한다. 결과를 SSOT에 기록하고 사용자 승인 후 커밋한다.

```text
fix(sync): persist canonical revision baselines
```

Actual (2026-07-19): 초기 지정 3 files RED는 helper 부재, revision capture 누락, captured mark/mark-failure retry 누락으로 예상 실패했다. 최종 리뷰 follow-up RED는 Entity의 unmentioned Alias/Fact child에서 generic FK 오류, Episode의 unmentioned Evidence child에서 silent cascade를 실제 DB로 재현했고, current-revision 재조회 변이는 강화 persistence test에서 `writer → select:project → mark:8`로 실패했으며 project 소유권 불일치 delete false-positive도 RED로 고정했다. 최소 구현과 follow-up 뒤 3 files/14 tests PASS다. FK-enabled SQLite TEMP trigger log로 canonical 11종의 exact dependency INSERT/역순 DELETE 실행을 검증했고 raw ID/projectId, forward self-FK, local-only suggested 보존, memory+revision rollback을 확인했다. 중앙 FK metadata preflight는 Alias cascade/Fact restrict, Episode/Eval child, cross-project child를 보존하고 모든 실제 dependent가 같은 bundle/project에서 명시 삭제된 경우만 성공한다. 강화 persistence test는 실제 DB/attachment/revision store에서 captured bundle title이 writer payload에 전달됨을 확인하고 writer callback의 canonical mutation으로 revision 7→8 후 captured 7만 mark한다. Project select spy는 writer 전 current revision 재조회가 없고 mark validation 경계에서만 조회됨을 고정하며 최종 dirty 판정도 유지한다. write/mark 실패는 성공 기록 없이 `sync:retry`를 예약한다. 공식 harness의 `SKIP_DB_TEST_SETUP=1`로 syncService/projectExportQueue 2 files/27 tests PASS이며, 신규 실제 DB 증거는 focused suite에서 별도 확보했다. 대상 ESLint/diff-check PASS, 직접 `tsc6 --noEmit`은 사용자 dirty Binder TS2322 baseline 한 건만 유지한다. `pnpm run typecheck` wrapper는 pnpm registry signature/version-switch 검증 단계에서 compiler 실행 전 종료했다. follow-up 자체검토 결과 Critical/Important 0이며 root 재리뷰 대기다.

---

### Task 4: Queue 밖 full checkpoint writer 수렴

**Files:**

- Modify: `src/main/services/core/project/projectImportTransaction.ts`
- Modify: `src/main/services/features/snapshot/snapshotImportFromFile.ts`
- Modify: `src/main/services/core/project/projectPackageAttachment.ts`
- Modify: `src/main/services/core/project/projectImportOpen.ts`
- Modify: `tests/main/services/projectImportTransaction.test.ts`
- Create: `tests/main/services/snapshotImportRevision.test.ts`
- Modify: `tests/main/services/projectService.packageAttachment.test.ts`
- Modify: `tests/main/services/projectService.test.ts`
- Modify: `tests/main/services/projectSaveRecovery.integration.test.ts`
- Modify: `docs/superpowers/specs/2026-07-19-project-wide-revision-design.md`
- Modify: `docs/superpowers/specs/2026-07-18-save-integrity-design.md`
- Modify: `docs/superpowers/plans/2026-07-19-project-wide-revision.md`

**Interfaces:**

- package hydration: final transaction revision을 attachment exportedRevision으로 insert.
- snapshot import: attachment 생성 → revision capture → atomic write → captured mark.
- attach/materialize/corrupt recovery: export 전 capture → full export → attachment path 설정 → captured mark.
- capture 뒤 mutation은 더 큰 revision으로 남는다. mark 실패는 성공으로 반환하지 않는다.

- [x] **Step 1: RED 작성**

- project import는 mock 호출 순서가 아니라 chapter+body를 포함한 실제 DB transaction 후 `revision === exportedRevision`을 검증한다.
- snapshot import 성공은 revision 수렴, writer 실패와 mark 실패는 reject 후 Project/Attachment rollback을 각각 검증한다.
- attach/materialize unit test는 capture 값 7만 mark하고 export/attachment 실패 시 mark하지 않는지 검증한다.
- corrupt recovery real DB test는 recovery path 변경 뒤 `revision === exportedRevision`을 검증한다.
- chapter recovery test는 package 본문뿐 아니라 flush 뒤 `revision === exportedRevision === stale.revision`을 검증한다.

- [x] **Step 2: RED 확인**

Run:

```bash
ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron ./node_modules/vitest/vitest.mjs run --no-file-parallelism tests/main/services/projectImportTransaction.test.ts tests/main/services/snapshotImportRevision.test.ts tests/main/services/projectService.packageAttachment.test.ts tests/main/services/projectService.test.ts tests/main/services/projectSaveRecovery.integration.test.ts
```

Expected: direct writer baseline/mark가 없어 FAIL.

- [x] **Step 3: 최소 GREEN**

- import transaction의 project select를 모든 canonical insert 뒤로 옮긴다.
- snapshot import는 legacy `Project.projectPath` 대신 ProjectAttachment를 만들고 captured revision만 성공 후 mark한다.
- attach/materialize 두 sibling flow는 같은 파일의 작은 local helper로 capture/export/attach/mark 순서를 공유한다.
- corrupt recovery는 동일 순서를 직접 적용한다. renderer entry writer에는 mark를 추가하지 않는다.

- [x] **Step 4: 전체 저장 회귀와 정적 검증**

Task 1~4 focused tests와 기존 Task 8~16 저장 회귀를 Electron-as-Node로 실행한다. 대상 ESLint, `pnpm run typecheck`, `git diff --check`를 실행한다. 사용자 dirty TS2322 외 신규 오류가 없어야 한다.

- [x] **Step 5: 최종 독립 재리뷰**

구현과 amend 뒤 root 코드·QA·SSOT 3중 재리뷰가 모두 통과했다. 실제 테스트 수와 verdict를 확정했으며 Task 4 자신의 hash는 기록하지 않는다.

```text
fix(storage): converge direct revision checkpoints
```

Actual (2026-07-19): 기준 commit은 Task 1 `8ae3d04c`, Task 2 `a028e5a7`, Task 3 `a171b90e`다. RED exact 5-file 명령은 31 tests 중 Task 4 계약 누락 7건과 기존 대용량 world-entry baseline 5건이 실패했다. GREEN은 package hydration final revision baseline, snapshot attachment/write/mark rollback, attach/materialize capture order와 failure mark 금지, corrupt recovery 수렴, writer 중 concurrent mutation dirty 보존을 고정한 Task 4 계약 17 tests PASS다. exact 명령은 Task 4 관련 26 tests PASS이며 동일 기존 baseline 5건만 남았다. follow-up mutation RED는 snapshot mark-before-write 3건과 corrupt capture-after-export 1건을 검출했고 원복 GREEN focused 2 files/5 tests PASS다. snapshot mark 실패는 DB state를 rollback하고 작성된 recovery artifact를 경로와 함께 logging하며 보존한다. Task 1~3와 공유 recovery 11 files/49 tests, Task 8~16 Electron-as-Node 저장 회귀 19 files/167 tests PASS다. 대상 ESLint/diff-check PASS, direct `tsc6 --noEmit`은 사용자 dirty Binder TS2322 한 건만 유지한다. pnpm wrapper는 무출력 장기 대기로 중단했다. 구현·commit·follow-up 완료 뒤 root 코드 리뷰는 Production-ready, QA는 PASS, SSOT는 Approved로 모두 Critical/Important 0이다.

---

## 완료 조건

- ChapterBody-only 최신 본문이 normal export와 sync에서 보존된다.
- sync memory canonical DB와 package가 같은 merged 상태다.
- canonical mutation/rollback/project 이동이 revision과 원자적이다.
- 최초/부분 trigger 설치 backfill은 정확히 한 번 실행된다.
- sync와 모든 queue 밖 full writer는 payload와 같은 captured revision만 mark한다.
- 기존 project writer의 write/mark 실패는 성공을 반환하지 않고 attachment baseline을 전진시키지 않아 dirty 상태를 유지한다.
- 신규 snapshot import의 write/mark 실패는 성공을 반환하지 않고 생성한 Project/Attachment를 rollback한다. write 성공 뒤 mark 실패의 output `.luie`는 recovery artifact로 보존한다.
- capture 뒤 concurrent mutation은 더 높은 dirty revision으로 남는다.
- 파생·로컬 table과 renderer entry mirror는 revision checkpoint를 오염시키지 않는다.
- 사용자 dirty UI 파일은 diff/commit에 포함되지 않는다.
