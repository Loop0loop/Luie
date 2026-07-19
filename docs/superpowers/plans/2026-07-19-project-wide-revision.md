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

- [ ] **Step 1: RED 작성**

다음 assertion을 실제 DB 또는 현재 query mock에 추가한다.

```ts
expect(exportedChapter.content).toBe("chapter-body-new");
expect(syncBundle.chapters[0]?.content).toBe("chapter-body-new");
expect(savedChapter.content).toBe("remote-body");
expect(savedChapterBody.content).toBe("remote-body");
```

fixture는 같은 chapter에 `Chapter.content = "legacy-old"`, `ChapterBody.content = "chapter-body-new"`를 저장한다. import/sync assertion은 두 table 값이 같은지 확인한다.

- [ ] **Step 2: RED 확인**

Run:

```bash
ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron ./node_modules/vitest/vitest.mjs run --no-file-parallelism tests/main/services/projectExportEngine.test.ts tests/main/services/syncBundleHelpers.chapterBody.test.ts tests/main/services/syncLocalApply.test.ts tests/main/services/projectImportTransaction.test.ts
```

Expected: exporter/sync collector가 legacy content를 읽거나 ChapterBody가 없어 FAIL.

- [ ] **Step 3: 최소 GREEN**

- `getProjectForExport()`의 chapter query는 `ChapterBody`를 left join하고 `bodyContent ?? chapter.content`를 mapper 입력으로 사용한다.
- `buildLocalBundleFromDatabase()`는 project chapter의 body rows를 한 번에 읽어 `Map<chapterId, content>`로 overlay한다. chapter마다 query하는 N+1은 만들지 않는다.
- `upsertChapter()`는 기존 Chapter upsert 뒤 `ChapterBody`를 `chapterId` conflict update하고 `hashChapterContent(content)`를 저장한다.
- `applyProjectImportTransaction()`와 snapshot import transaction도 동일한 body row를 bulk insert한다.

- [ ] **Step 4: GREEN·정적 검증**

Step 2 명령을 다시 실행한다. 이어서 대상 ESLint, `pnpm run typecheck`, `git diff --check`를 실행한다. typecheck는 사용자 dirty `BinderSidebarPanelBody.tsx:102` 기존 `TS2322` 외 신규 오류가 없어야 한다.

- [ ] **Step 5: 검토·SSOT·커밋**

subagent가 export/sync/import 세 경로의 본문 우선순위와 테스트를 독립 검토한다. 설계 SSOT에 실제 테스트 결과를 기록하고 사용자 승인 후 정확한 Task 1 파일만 다음 메시지로 커밋한다.

```text
fix(storage): export canonical chapter bodies
```

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

- [ ] **Step 1: RED 작성**

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

- [ ] **Step 2: RED 확인**

Run:

```bash
ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron ./node_modules/vitest/vitest.mjs run --no-file-parallelism tests/main/database/projectRevisionTrigger.test.ts tests/main/services/projectRevisionStore.test.ts tests/main/services/worldEntitySaveIntegrity.test.ts tests/main/services/projectSaveRecovery.integration.test.ts
```

Expected: trigger module/설치가 없어 FAIL.

- [ ] **Step 3: 최소 GREEN**

- 고정 table 목록에서 idempotent INSERT/UPDATE/DELETE SQL을 만든다.
- EntityRelation UPDATE OF에는 `projectId`, semantic fields, `createdAt`, `updatedAt`을 포함하고 pointer columns는 제외한다.
- Project metadata trigger는 revision update 재귀를 일으키지 않는다.
- bootstrap은 trigger가 하나라도 없으면 `CREATE TRIGGER`와 `UPDATE Project SET revision = revision + 1`을 하나의 better-sqlite3 transaction에서 실행한다.
- 기존 four entity service는 `bumpProjectRevision` 대신 `touchProjectUpdatedAt`을 사용해 trigger 이중 증가를 없앤다.

- [ ] **Step 4: GREEN·회귀·정적 검증**

Step 2와 `tests/main/database/entityRelationPointerTrigger.test.ts`, 기존 export queue/recovery tests를 Electron-as-Node로 실행한다. 대상 ESLint, `pnpm run typecheck`, `git diff --check`를 실행한다.

- [ ] **Step 5: 검토·SSOT·커밋**

subagent가 trigger SQL, 테스트 false-positive, SSOT table 목록을 따로 검토한다. Critical/Important 0이면 결과를 문서에 기록하고 사용자 승인 후 커밋한다.

```text
feat(storage): track canonical project revisions
```

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

- [ ] **Step 1: RED 작성**

- memory apply test는 local+remote merged canonical rows가 raw `row.id`를 유지해 DB에 upsert되고 명시적 deleted row만 제거되는지 검증한다. bundle에 없는 suggested/local-only row는 보존돼야 한다.
- transaction failure 시 memory와 revision 모두 rollback되는지 검증한다.
- commit-order test는 `db apply → revision capture → package` 순서를 검증한다.
- persistence test는 전달된 revision 7로 write를 시작하고 writer 안에서 DB current revision을 8로 올린 뒤 `markProjectExported(projectId, 7)`만 호출되는지 검증한다.
- write/mark 실패 시 mark 성공 기록이 없고 `sync:retry`가 예약되는지 검증한다.

- [ ] **Step 2: RED 확인**

Run:

```bash
ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron ./node_modules/vitest/vitest.mjs run --no-file-parallelism tests/main/services/syncMemoryCanonicalApply.test.ts tests/main/services/syncBundleApplier.commitOrder.test.ts tests/main/services/syncPackagePersistence.retry.test.ts
```

Expected: memory DB apply와 transaction capture interface가 없어 FAIL.

- [ ] **Step 3: 최소 GREEN**

- sync memory helper는 허용된 canonical table만 처리한다. non-deleted merged row는 dependency 순서로 upsert하고 명시적 deleted row만 dependency 역순으로 삭제한다. bundle에 없는 package 밖 local row는 보존한다. sync row의 `row.id`와 `projectId`를 보존하고 import용 ID rescoping helper는 재사용하지 않는다.
- DB transaction 마지막 select 결과를 map으로 반환한다.
- package persistence는 map의 captured revision을 payload build/write와 함께 사용하고 성공 후 같은 값만 mark한다.
- capture 후 concurrent edit는 더 큰 current revision으로 남아 startup/queue dirty 판정이 유지된다.

- [ ] **Step 4: GREEN·회귀·정적 검증**

Step 2, `syncService.test.ts`, `projectExportQueue.test.ts`를 실행한다. 대상 ESLint, `pnpm run typecheck`, `git diff --check`를 실행한다.

- [ ] **Step 5: 검토·SSOT·커밋**

subagent가 memory FK 순서, raw ID 보존, concurrency test를 독립 검토한다. 결과를 SSOT에 기록하고 사용자 승인 후 커밋한다.

```text
fix(sync): persist canonical revision baselines
```

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

- [ ] **Step 1: RED 작성**

- project import는 mock 호출 순서가 아니라 chapter+body를 포함한 실제 DB transaction 후 `revision === exportedRevision`을 검증한다.
- snapshot import 성공은 revision 수렴, writer 실패와 mark 실패는 reject 후 Project/Attachment rollback을 각각 검증한다.
- attach/materialize unit test는 capture 값 7만 mark하고 export/attachment 실패 시 mark하지 않는지 검증한다.
- corrupt recovery real DB test는 recovery path 변경 뒤 `revision === exportedRevision`을 검증한다.
- chapter recovery test는 package 본문뿐 아니라 flush 뒤 `revision === exportedRevision === stale.revision`을 검증한다.

- [ ] **Step 2: RED 확인**

Run:

```bash
ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron ./node_modules/vitest/vitest.mjs run --no-file-parallelism tests/main/services/projectImportTransaction.test.ts tests/main/services/snapshotImportRevision.test.ts tests/main/services/projectService.packageAttachment.test.ts tests/main/services/projectService.test.ts tests/main/services/projectSaveRecovery.integration.test.ts
```

Expected: direct writer baseline/mark가 없어 FAIL.

- [ ] **Step 3: 최소 GREEN**

- import transaction의 project select를 모든 canonical insert 뒤로 옮긴다.
- snapshot import는 legacy `Project.projectPath` 대신 ProjectAttachment를 만들고 captured revision만 성공 후 mark한다.
- attach/materialize 두 sibling flow는 같은 파일의 작은 local helper로 capture/export/attach/mark 순서를 공유한다.
- corrupt recovery는 동일 순서를 직접 적용한다. renderer entry writer에는 mark를 추가하지 않는다.

- [ ] **Step 4: 전체 저장 회귀와 정적 검증**

Task 1~4 focused tests와 기존 Task 8~16 저장 회귀를 Electron-as-Node로 실행한다. 대상 ESLint, `pnpm run typecheck`, `git diff --check`를 실행한다. 사용자 dirty TS2322 외 신규 오류가 없어야 한다.

- [ ] **Step 5: 최종 독립 검토·SSOT·커밋**

코드, 테스트, SSOT 세 subagent가 Critical/Important 0인지 검토한다. 실제 테스트 수와 verdict, Task 1~3 commit hash를 문서에 기록한다. Task 4 자신의 hash는 기록하지 않는다. 사용자 승인 후 정확한 Task 4 파일만 커밋한다.

```text
fix(storage): converge direct revision checkpoints
```

---

## 완료 조건

- ChapterBody-only 최신 본문이 normal export와 sync에서 보존된다.
- sync memory canonical DB와 package가 같은 merged 상태다.
- canonical mutation/rollback/project 이동이 revision과 원자적이다.
- 최초/부분 trigger 설치 backfill은 정확히 한 번 실행된다.
- sync와 모든 queue 밖 full writer는 payload와 같은 captured revision만 mark한다.
- write/mark 실패와 concurrent mutation은 dirty 상태를 유지한다.
- 파생·로컬 table과 renderer entry mirror는 revision checkpoint를 오염시키지 않는다.
- 사용자 dirty UI 파일은 diff/commit에 포함되지 않는다.
