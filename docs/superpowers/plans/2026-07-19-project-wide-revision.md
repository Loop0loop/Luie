# Project-wide Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 복구 가능한 `.luie` canonical 데이터의 모든 DB mutation을 `Project.revision`에 반영하고, 이미 package에 반영된 import·sync 결과는 같은 captured revision으로 `exportedRevision`에 수렴시킨다.

**Architecture:** SQLite bootstrap이 canonical table용 `AFTER INSERT/UPDATE/DELETE` trigger를 설치해 데이터와 revision 증가를 같은 transaction으로 묶는다. 기존 `ProjectExportQueue`는 유지하고, queue 밖 package writer만 성공한 captured revision을 exported로 표시한다.

**Tech Stack:** Electron 40, TypeScript 5, Drizzle ORM, better-sqlite3/SQLite trigger, Vitest, pnpm

## Global Constraints

- 설계 SSOT: `docs/superpowers/specs/2026-07-19-project-wide-revision-design.md`.
- 현재 `feature/00-save-integrity`에서 작업하며 worktree를 만들지 않는다.
- 새 DB table, column, migration, dependency, event log를 추가하지 않는다.
- revision은 정확한 mutation 개수가 아니라 단조 증가 dirty token이다.
- canonical mutation rollback 시 revision 증가도 rollback한다.
- `ProjectAttachment`, local state/settings, search/FTS, embedding/build job 등 파생·로컬 table은 제외한다.
- export 성공 전에 `exportedRevision`을 올리지 않는다.
- 사용자 dirty renderer/UI 파일과 `tests/dom/entityGallery.test.tsx`는 수정하거나 stage하지 않는다.
- 각 Task는 RED → 최소 GREEN → 회귀 → 문서 동기화 → 사용자 승인 → 한 커밋 순서다.
- 자동 backoff, Notion UI timer, 저장 latency P95 인증은 변경하지 않는다.

---

## File Map

### 새 파일

- `src/main/database/main/projectRevisionTriggerSql.ts`: canonical table 목록과 idempotent revision trigger SQL.
- `tests/main/database/projectRevisionTrigger.test.ts`: trigger 설치·원자성·이동·제외 table 실제 DB 검증.
- `tests/main/services/snapshotImportRevision.test.ts`: snapshot import checkpoint 수렴 검증.

### 수정 파일

- `src/main/database/main/databaseSchemaBootstrap.ts`: bootstrap 뒤 revision trigger 설치.
- `src/main/services/core/project/projectRevisionStore.ts`: 수동 bump를 timestamp touch로 축소.
- `src/main/services/features/world/entities/{character,event,faction,term}Service.ts`: trigger와 중복되는 bump 제거.
- `src/main/services/core/project/projectImportTransaction.ts`: hydration revision을 attachment baseline으로 기록.
- `src/main/services/features/snapshot/snapshotImportFromFile.ts`: attachment 생성과 성공 revision mark.
- `src/main/services/features/sync/syncPackagePersistence.ts`: revision capture와 성공 mark.
- `tests/main/services/projectRevisionStore.test.ts`
- `tests/main/services/worldEntitySaveIntegrity.test.ts`
- `tests/main/services/projectImportTransaction.test.ts`
- `tests/main/services/syncPackagePersistence.retry.test.ts`
- `tests/main/services/projectSaveRecovery.integration.test.ts`
- 저장 설계 SSOT 2개와 이 계획 문서.

---

### Task 1: SQLite가 canonical mutation과 revision을 원자적으로 묶는다

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
- Modify: `docs/superpowers/specs/2026-07-19-project-wide-revision-design.md`

**Interfaces:**

- Consumes: `Project.revision`, `ensurePackagedSqliteSchema()`, 기존 entity transaction.
- Produces: `PROJECT_REVISION_DIRECT_TABLES`, `PROJECT_REVISION_TRIGGER_NAMES`, `PROJECT_REVISION_TRIGGER_SQL`, `touchProjectUpdatedAt(client, projectId, nowIso)`.

- [ ] **Step 1: trigger 계약 RED 테스트 작성**

`tests/main/database/projectRevisionTrigger.test.ts`에서 bootstrap된 임시 DB를 사용한다. 목록 누락은 trigger 이름 검증으로, 공통 SQL 동작은 대표 canonical row로 검증한다.

```ts
import * as fsPromises from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import Database from "better-sqlite3";
import { afterEach, expect, it } from "vitest";
import { ensurePackagedSqliteSchema } from
  "../../../src/main/database/main/databaseSchemaBootstrap.js";
import {
  PROJECT_REVISION_DIRECT_TABLES,
  PROJECT_REVISION_TRIGGER_NAMES,
} from "../../../src/main/database/main/projectRevisionTriggerSql.js";

const NOW = "2026-07-19T00:00:00.000Z";
const logger = { info: () => undefined, warn: () => undefined };
const tempDirs: string[] = [];

const openBootstrappedDatabase = async () => {
  const tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "luie-revision-"));
  tempDirs.push(tempDir);
  const dbPath = path.join(tempDir, "test.sqlite");
  ensurePackagedSqliteSchema(dbPath, logger);
  const database = new Database(dbPath);
  database.pragma("foreign_keys = OFF");
  return database;
};

const insertProject = (database: InstanceType<typeof Database>, id: string) =>
  database.prepare(`INSERT INTO "Project"
    ("id", "title", "createdAt", "updatedAt") VALUES (?, ?, ?, ?)`)
    .run(id, id, NOW, NOW);

const insertChapter = (
  database: InstanceType<typeof Database>, id: string, projectId: string,
) => database.prepare(`INSERT INTO "Chapter"
  ("id", "projectId", "title", "content", "order", "wordCount", "createdAt", "updatedAt")
  VALUES (?, ?, ?, '', 0, 0, ?, ?)`)
  .run(id, projectId, id, NOW, NOW);

const getRevision = (database: InstanceType<typeof Database>, id: string) =>
  Number((database.prepare(`SELECT "revision" FROM "Project" WHERE "id" = ?`)
    .get(id) as { revision: number }).revision);

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) =>
    fsPromises.rm(dir, { recursive: true, force: true })));
});

const EXPECTED_DIRECT_TABLES = [
  "Chapter", "Character", "Term", "Faction", "Event", "WorldEntity",
  "EntityRelation", "Snapshot", "WorldDocument", "ScrapMemo",
  "MemoryEntity", "MemoryEntityAlias", "MemoryEpisode",
  "MemoryEpisodeEvidence", "MemoryFact", "MemoryFactEvidence",
  "MemoryFactInvalidation", "MemoryEvalCase", "MemoryEvalEvidence",
  "MemoryEvalEntity", "MemoryEvalRelation",
] as const;

it("installs triggers for every canonical package table", async () => {
  const database = await openBootstrappedDatabase();
  const names = database
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'trigger'`)
    .all()
    .map((row) => String((row as { name: string }).name));
  expect(PROJECT_REVISION_DIRECT_TABLES).toEqual(EXPECTED_DIRECT_TABLES);
  expect(names).toEqual(expect.arrayContaining([...PROJECT_REVISION_TRIGGER_NAMES]));
  expect(names.some((name) => name.startsWith("MemoryChunk_project_revision_")))
    .toBe(false);
  database.close();
});

it("increments old and new projects when a canonical row moves", async () => {
  const database = await openBootstrappedDatabase();
  insertProject(database, "old-project");
  insertProject(database, "new-project");
  const oldBaseline = getRevision(database, "old-project");
  const newBaseline = getRevision(database, "new-project");
  insertChapter(database, "chapter-1", "old-project");
  database.prepare(`UPDATE "Chapter" SET "projectId" = ? WHERE "id" = ?`)
    .run("new-project", "chapter-1");
  expect(getRevision(database, "old-project")).toBe(oldBaseline + 2);
  expect(getRevision(database, "new-project")).toBe(newBaseline + 1);
  database.close();
});

it("rolls revision back with the canonical mutation", async () => {
  const database = await openBootstrappedDatabase();
  insertProject(database, "project-1");
  const baseline = getRevision(database, "project-1");
  expect(() => database.transaction(() => {
    insertChapter(database, "chapter-1", "project-1");
    throw new Error("rollback");
  })()).toThrow("rollback");
  expect(getRevision(database, "project-1")).toBe(baseline);
  database.close();
});

it("tracks ChapterBody through Chapter and ignores local state", async () => {
  const database = await openBootstrappedDatabase();
  insertProject(database, "project-1");
  insertChapter(database, "chapter-1", "project-1");
  const baseline = getRevision(database, "project-1");
  database.prepare(`INSERT INTO "ChapterBody"
    ("chapterId", "content", "contentHash", "updatedAt") VALUES (?, ?, ?, ?)`)
    .run("chapter-1", "body", "hash", NOW);
  expect(getRevision(database, "project-1")).toBe(baseline + 1);
  database.prepare(`INSERT INTO "ProjectLocalState"
    ("projectId", "createdAt", "updatedAt") VALUES (?, ?, ?)`)
    .run("project-1", NOW, NOW);
  expect(getRevision(database, "project-1")).toBe(baseline + 1);
  database.close();
});

it("tracks project creation and metadata but not bookkeeping", async () => {
  const database = await openBootstrappedDatabase();
  insertProject(database, "project-1");
  expect(getRevision(database, "project-1")).toBe(1);
  database.prepare(`UPDATE "Project" SET "title" = ? WHERE "id" = ?`)
    .run("Renamed", "project-1");
  database.prepare(`UPDATE "Project" SET "updatedAt" = ? WHERE "id" = ?`)
    .run("2026-07-19T01:00:00.000Z", "project-1");
  expect(getRevision(database, "project-1")).toBe(2);
  database.close();
});

it("dirties existing projects once when revision triggers are first installed", async () => {
  const database = await openBootstrappedDatabase();
  for (const name of PROJECT_REVISION_TRIGGER_NAMES) {
    database.exec(`DROP TRIGGER IF EXISTS "${name}"`);
  }
  insertProject(database, "legacy-project");
  database.prepare(`UPDATE "Project" SET "revision" = 5 WHERE "id" = ?`)
    .run("legacy-project");
  const dbPath = String(database.name);
  database.close();

  ensurePackagedSqliteSchema(dbPath, logger);
  const upgraded = new Database(dbPath);
  expect(getRevision(upgraded, "legacy-project")).toBe(6);
  upgraded.close();

  ensurePackagedSqliteSchema(dbPath, logger);
  const rerun = new Database(dbPath);
  expect(getRevision(rerun, "legacy-project")).toBe(6);
  rerun.close();
});
```

`EntityRelation` insert가 pointer normalization의 내부 UPDATE 때문에 이중 증가하지 않는 테스트도 작성한다.

```ts
it("does not double increment relation pointer normalization", async () => {
  const database = await openBootstrappedDatabase();
  insertProject(database, "project-1");
  const baseline = getRevision(database, "project-1");
  database.prepare(`INSERT INTO "EntityRelation"
    ("id", "projectId", "sourceId", "sourceType", "targetId", "targetType",
     "relation", "createdAt", "updatedAt")
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run("relation-1", "project-1", "place-1", "Place", "character-1",
      "Character", "related", NOW, NOW);
  expect(getRevision(database, "project-1")).toBe(baseline + 1);
  database.close();
});
```

- [ ] **Step 2: RED 확인**

Run: `SKIP_DB_TEST_SETUP=1 pnpm vitest tests/main/database/projectRevisionTrigger.test.ts --run`

Expected: `projectRevisionTriggerSql.js` 또는 trigger export가 없어 FAIL.

- [ ] **Step 3: 최소 trigger SQL 구현**

`projectRevisionTriggerSql.ts`는 외부 입력 없이 고정 목록을 SQL로 변환한다.

```ts
const DIRECT_TABLES = [
  "Chapter", "Character", "Term", "Faction", "Event", "WorldEntity",
  "EntityRelation", "Snapshot", "WorldDocument", "ScrapMemo",
  "MemoryEntity", "MemoryEntityAlias", "MemoryEpisode",
  "MemoryEpisodeEvidence", "MemoryFact", "MemoryFactEvidence",
  "MemoryFactInvalidation", "MemoryEvalCase", "MemoryEvalEvidence",
  "MemoryEvalEntity", "MemoryEvalRelation",
] as const;

export const PROJECT_REVISION_DIRECT_TABLES = DIRECT_TABLES;

const updateEvent = (table: (typeof DIRECT_TABLES)[number]): string =>
  table === "EntityRelation"
    ? `AFTER UPDATE OF "projectId", "sourceId", "sourceType", "targetId", "targetType", "relation", "attributes", "updatedAt" ON "EntityRelation"`
    : `AFTER UPDATE ON "${table}"`;

const directTableSql = (table: (typeof DIRECT_TABLES)[number]): string => `
CREATE TRIGGER IF NOT EXISTS "${table}_project_revision_insert"
AFTER INSERT ON "${table}" BEGIN
  UPDATE "Project" SET "revision" = "revision" + 1 WHERE "id" = NEW."projectId";
END;
CREATE TRIGGER IF NOT EXISTS "${table}_project_revision_update"
${updateEvent(table)} BEGIN
  UPDATE "Project" SET "revision" = "revision" + 1 WHERE "id" = OLD."projectId";
  UPDATE "Project" SET "revision" = "revision" + 1
    WHERE "id" = NEW."projectId" AND NEW."projectId" <> OLD."projectId";
END;
CREATE TRIGGER IF NOT EXISTS "${table}_project_revision_delete"
AFTER DELETE ON "${table}" BEGIN
  UPDATE "Project" SET "revision" = "revision" + 1 WHERE "id" = OLD."projectId";
END;`;
```

같은 파일에 다음 특수 trigger를 추가한다.

- `Project` INSERT는 새 attached project가 export 실패 후에도 dirty가 되도록 revision 1을 만든다.
- `Project` UPDATE는 `title`, `description` 값이 실제로 바뀐 경우만 증가한다.
- `ChapterBody`는 `Chapter.chapterId -> Chapter.projectId` 조회로 owner revision을 증가시킨다.
- `EntityRelation` UPDATE trigger는 pointer-only column을 제외한다.

```ts
const projectSql = `
CREATE TRIGGER IF NOT EXISTS "Project_project_revision_insert"
AFTER INSERT ON "Project" BEGIN
  UPDATE "Project" SET "revision" = "revision" + 1 WHERE "id" = NEW."id";
END;
CREATE TRIGGER IF NOT EXISTS "Project_project_revision_update"
AFTER UPDATE OF "title", "description" ON "Project"
WHEN NEW."title" IS NOT OLD."title" OR NEW."description" IS NOT OLD."description"
BEGIN
  UPDATE "Project" SET "revision" = "revision" + 1 WHERE "id" = NEW."id";
END;`;

const chapterBodySql = `
CREATE TRIGGER IF NOT EXISTS "ChapterBody_project_revision_insert"
AFTER INSERT ON "ChapterBody" BEGIN
  UPDATE "Project" SET "revision" = "revision" + 1
    WHERE "id" = (SELECT "projectId" FROM "Chapter" WHERE "id" = NEW."chapterId");
END;
CREATE TRIGGER IF NOT EXISTS "ChapterBody_project_revision_update"
AFTER UPDATE ON "ChapterBody" BEGIN
  UPDATE "Project" SET "revision" = "revision" + 1
    WHERE "id" = (SELECT "projectId" FROM "Chapter" WHERE "id" = OLD."chapterId");
  UPDATE "Project" SET "revision" = "revision" + 1
    WHERE NEW."chapterId" <> OLD."chapterId"
      AND "id" = (SELECT "projectId" FROM "Chapter" WHERE "id" = NEW."chapterId");
END;
CREATE TRIGGER IF NOT EXISTS "ChapterBody_project_revision_delete"
AFTER DELETE ON "ChapterBody" BEGIN
  UPDATE "Project" SET "revision" = "revision" + 1
    WHERE "id" = (SELECT "projectId" FROM "Chapter" WHERE "id" = OLD."chapterId");
END;`;

export const PROJECT_REVISION_TRIGGER_NAMES = [
  "Project_project_revision_insert",
  "Project_project_revision_update",
  "ChapterBody_project_revision_insert",
  "ChapterBody_project_revision_update",
  "ChapterBody_project_revision_delete",
  ...DIRECT_TABLES.flatMap((table) => [
    `${table}_project_revision_insert`,
    `${table}_project_revision_update`,
    `${table}_project_revision_delete`,
  ]),
] as const;

export const PROJECT_REVISION_TRIGGER_SQL = [
  projectSql,
  chapterBodySql,
  ...DIRECT_TABLES.map(directTableSql),
].join("\n");
```

`databaseSchemaBootstrap.ts`에서 `backfillChapterBody()`와 기존 pointer trigger 설치 뒤 실행한다. trigger가 하나라도 없으면 설치와 기존 project revision 1회 증가를 하나의 better-sqlite3 transaction으로 묶는다. 기존 chapter mutation이 이전 버전에서 revision에 반영되지 않았어도 업그레이드 직후 stale checkpoint recovery 대상이 된다.

```ts
import { PROJECT_REVISION_TRIGGER_SQL } from "./projectRevisionTriggerSql.js";
import { PROJECT_REVISION_TRIGGER_NAMES } from "./projectRevisionTriggerSql.js";

backfillChapterBody(database, logger);
enforceEntityRelationPointerConsistency(database, logger);
const hasAllRevisionTriggers = PROJECT_REVISION_TRIGGER_NAMES.every((name) =>
  sqliteTriggerExists(database, name));
database.transaction(() => {
  database.exec(PROJECT_REVISION_TRIGGER_SQL);
  if (!hasAllRevisionTriggers) {
    database.exec(`UPDATE "Project" SET "revision" = "revision" + 1;`);
  }
})();
```

- [ ] **Step 4: 서비스 이중 증가 제거**

`projectRevisionStore.ts`의 수동 bump는 timestamp touch로 교체한다.

```ts
export function touchProjectUpdatedAt(
  client: DbLike,
  projectId: string,
  nowIso: string,
): void {
  const updated = client.update(project)
    .set({ updatedAt: nowIso })
    .where(eq(project.id, projectId))
    .returning({ id: project.id })
    .get();
  if (!updated) {
    throw new ServiceError(ErrorCode.PROJECT_NOT_FOUND, "Project not found", {
      projectId,
    });
  }
}
```

character/event/faction/term service의 import와 기존 12개 호출을 `touchProjectUpdatedAt`으로 바꾼다. row trigger가 revision을, 함수가 기존 project timestamp를 담당한다.

- [ ] **Step 5: 기존 테스트를 revision delta 기준으로 정리**

`projectRevisionStore.test.ts`는 수동 bump 없이 revision을 seed해 mark 상한과 stale 목록을 검증한다. `worldEntitySaveIntegrity.test.ts`는 seed INSERT 뒤 baseline을 읽고 각 서비스 mutation마다 `after.revision === before.revision + 1`을 검증한다.

```ts
const before = await getProjectRevisionState("project-1");
await characterService.updateCharacter({
  id: "char-1",
  attributesPatch: { color: "red" },
});
const after = await getProjectRevisionState("project-1");
expect(after.revision).toBe(before.revision + 1);
```

- [ ] **Step 6: GREEN과 회귀 확인**

Run: `SKIP_DB_TEST_SETUP=1 pnpm vitest tests/main/database/projectRevisionTrigger.test.ts tests/main/database/entityRelationPointerTrigger.test.ts tests/main/services/projectRevisionStore.test.ts tests/main/services/worldEntitySaveIntegrity.test.ts --run`

Expected: 전체 PASS, relation insert revision delta 1.

- [ ] **Step 7: 정적 검증과 Task 1 커밋**

Run: `pnpm exec eslint src/main/database/main/projectRevisionTriggerSql.ts src/main/database/main/databaseSchemaBootstrap.ts src/main/services/core/project/projectRevisionStore.ts src/main/services/features/world/entities/characterService.ts src/main/services/features/world/entities/eventService.ts src/main/services/features/world/entities/factionService.ts src/main/services/features/world/entities/termService.ts tests/main/database/projectRevisionTrigger.test.ts tests/main/services/projectRevisionStore.test.ts tests/main/services/worldEntitySaveIntegrity.test.ts`

Run: `git diff --check`

Expected: PASS. 사용자 dirty UI baseline 외 신규 type error 없음.

scoped 설계 §4에 최초 trigger 설치 transaction과 기존 project 1회 dirty backfill을 기록한다.

커밋 전 사용자 승인 메시지: `feat(storage): track canonical project revisions`

---

### Task 2: queue 밖 package writer가 captured revision에 수렴한다

**Files:**

- Modify: `src/main/services/core/project/projectImportTransaction.ts`
- Modify: `src/main/services/features/snapshot/snapshotImportFromFile.ts`
- Modify: `src/main/services/features/sync/syncPackagePersistence.ts`
- Modify: `tests/main/services/projectImportTransaction.test.ts`
- Create: `tests/main/services/snapshotImportRevision.test.ts`
- Modify: `tests/main/services/syncPackagePersistence.retry.test.ts`
- Modify: `tests/main/services/projectSaveRecovery.integration.test.ts`
- Modify: `docs/superpowers/specs/2026-07-19-project-wide-revision-design.md`
- Modify: `docs/superpowers/specs/2026-07-18-save-integrity-design.md`
- Modify: `docs/superpowers/plans/2026-07-19-project-wide-revision.md`

**Interfaces:**

- Consumes: Task 1 trigger, `getProjectRevisionState(projectId)`, `markProjectExported(projectId, revision)`.
- Produces: hydration 직후 `revision === exportedRevision`; sync/snapshot 성공 시 captured mark, 실패 시 dirty 유지.

- [ ] **Step 1: checkpoint baseline RED 테스트 작성**

`projectImportTransaction.test.ts`의 최종 select row에 `revision: 7`을 넣고 다음 attachment 값을 검증한다.

```ts
expect(mocked.insertFn).toHaveBeenCalledWith(expect.objectContaining({
  projectId: "project-1",
  projectPath: "/tmp/project-1.luie",
  exportedRevision: 7,
}));
```

`syncPackagePersistence.retry.test.ts`는 revision store를 mock해 성공 mark와 실패 미-mark를 검증한다.

```ts
const revisionMocks = vi.hoisted(() => ({
  getProjectRevisionState: vi.fn(async () => ({ revision: 7, exportedRevision: 3 })),
  markProjectExported: vi.fn(async () => undefined),
}));

vi.mock(
  "../../../src/main/services/core/project/projectRevisionStore.js",
  () => revisionMocks,
);

const successInput = () => ({
  bundle: createBundle(),
  hydrateMissingWorldDocsFromPackage: vi.fn(),
  buildProjectPackagePayload: vi.fn(async () => ({} as never)),
  logger: { warn: vi.fn(), error: vi.fn() },
});

it("marks only the captured revision after a successful sync write", async () => {
  mocked.writeLuieContainer.mockResolvedValue(undefined);
  await persistBundleToLuiePackages(successInput());
  expect(revisionMocks.markProjectExported).toHaveBeenCalledWith("project-1", 7);
});

it("does not mark when sync package persistence fails", async () => {
  mocked.writeLuieContainer.mockRejectedValue(new Error("disk full"));
  await expect(persistBundleToLuiePackages(successInput()))
    .rejects.toThrow("SYNC_LUIE_PERSIST_FAILED:project-1");
  expect(revisionMocks.markProjectExported).not.toHaveBeenCalled();
});
```

`snapshotImportRevision.test.ts`는 `electron.app.getPath`, snapshot reader, package writer만 mock하고 실제 DB로 검증한다.

```ts
import { afterEach, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

const mocked = vi.hoisted(() => ({
  documentsDir: `/tmp/luie-snapshot-revision-${process.pid}`,
  writeLuieContainer: vi.fn(async () => undefined),
  readFullSnapshotArtifact: vi.fn(async () => ({
    data: {
      project: { title: "Recovered", description: "snapshot" },
      settings: { autoSave: true, autoSaveInterval: 30 },
      chapters: [{
        id: "old-chapter", title: "Chapter", content: "body",
        synopsis: null, order: 0, wordCount: 1,
      }],
      characters: [],
      terms: [],
    },
  })),
}));

vi.mock("electron", () => ({
  app: { getPath: () => mocked.documentsDir },
}));
vi.mock(
  "../../../src/main/services/features/snapshot/snapshotArtifacts.js",
  () => ({ readFullSnapshotArtifact: mocked.readFullSnapshotArtifact }),
);
vi.mock("../../../src/main/services/io/luieContainer.js", () => ({
  writeLuieContainer: mocked.writeLuieContainer,
}));

import { db } from "../../../src/main/database/index.js";
import * as schema from "../../../src/main/database/schema/index.js";
import { getProjectRevisionState } from
  "../../../src/main/services/core/project/projectRevisionStore.js";
import { importSnapshotFromFile } from
  "../../../src/main/services/features/snapshot/snapshotImportFromFile.js";

const logger = { info: vi.fn(), error: vi.fn() };
let importedProjectId = "";

afterEach(async () => {
  if (importedProjectId) {
    await db.getClient().delete(schema.project)
      .where(eq(schema.project.id, importedProjectId));
  }
  importedProjectId = "";
  vi.clearAllMocks();
});

it("marks snapshot import at its captured revision", async () => {
  const imported = await importSnapshotFromFile("/tmp/recovery.json", logger);
  importedProjectId = imported.id;
  const state = await getProjectRevisionState(imported.id);
  expect(state.revision).toBeGreaterThan(0);
  expect(state.exportedRevision).toBe(state.revision);
  expect(mocked.writeLuieContainer).toHaveBeenCalledTimes(1);
});
```

`projectSaveRecovery.integration.test.ts`는 clean baseline 뒤 raw chapter update로 stale revision을 만들고 실제 package 본문을 검증한다.

```ts
it("recovers a chapter mutation tracked only by the trigger", async () => {
  tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "luie-recovery-"));
  const projectId = "project-chapter-recovery";
  const chapterId = "chapter-recovery";
  const projectPath = path.join(tempRoot, "recovered.luie");
  const now = "2026-07-19T00:00:00.000Z";
  const later = "2026-07-19T01:00:00.000Z";
  await db.getClient().insert(schema.project).values({
    id: projectId, title: "Novel", createdAt: now, updatedAt: now,
  });
  await db.getClient().insert(schema.projectAttachment).values({
    projectId, projectPath, createdAt: now, updatedAt: now,
  });
  await db.getClient().insert(schema.chapter).values({
    id: chapterId, projectId, title: "Chapter", content: "old chapter",
    order: 0, wordCount: 2, createdAt: now, updatedAt: now,
  });
  const baseline = await getProjectRevisionState(projectId);
  await markProjectExported(projectId, baseline.revision);
  await db.getClient().update(schema.chapter)
    .set({ content: "latest chapter", updatedAt: later })
    .where(eq(schema.chapter.id, chapterId));
  const stale = await getProjectRevisionState(projectId);
  expect(stale.revision).toBe(baseline.revision + 1);
  expect(stale.exportedRevision).toBe(baseline.revision);
  await expect(projectService.scheduleStalePackageExports()).resolves.toBe(1);
  await expect(projectService.flushPendingExports()).resolves.toMatchObject({
    failed: 0, timedOut: false,
  });
  await expect(readLuieContainerEntry(
    projectPath, `manuscript/${chapterId}.md`, logger,
  )).resolves.toBe("latest chapter");
});
```

- [ ] **Step 2: RED 확인**

Run: `SKIP_DB_TEST_SETUP=1 pnpm vitest tests/main/services/projectImportTransaction.test.ts tests/main/services/snapshotImportRevision.test.ts tests/main/services/syncPackagePersistence.retry.test.ts tests/main/services/projectSaveRecovery.integration.test.ts --run`

Expected: import baseline 또는 direct writer mark가 없어 FAIL.

- [ ] **Step 3: package hydration을 clean baseline으로 기록**

`projectImportTransaction.ts`에서 모든 canonical insert 뒤 최종 project를 읽고 attachment에 같은 revision을 넣는다.

```ts
const createdProject = tx.select().from(project)
  .where(eq(project.id, resolvedProjectId)).get();
if (!createdProject) {
  throw new ServiceError(ErrorCode.PROJECT_CREATE_FAILED,
    "Failed to read imported project", { projectId: resolvedProjectId });
}
tx.insert(projectAttachment).values({
  projectId: resolvedProjectId,
  projectPath: normalizedProjectPath,
  exportedRevision: createdProject.revision,
  updatedAt: new Date().toISOString(),
}).onConflictDoUpdate({
  target: projectAttachment.projectId,
  set: {
    projectPath: normalizedProjectPath,
    exportedRevision: createdProject.revision,
    updatedAt: new Date().toISOString(),
  },
}).run();
```

초기 project select는 transaction 끝으로 옮겨 반환 row도 최종 revision과 일치시킨다.

- [ ] **Step 4: snapshot writer에 attachment와 captured mark 연결**

`snapshotImportFromFile.ts`는 legacy `Project.projectPath` 대신 같은 transaction에서 `ProjectAttachment(exportedRevision: 0)`를 만든다. 최종 revision을 `capturedRevision`으로 반환하고 package 성공 뒤에만 mark한다.

```ts
const revisionRow = tx.select({ revision: project.revision }).from(project)
  .where(eq(project.id, projectId)).get();
if (!revisionRow) throw new Error("Failed to capture imported project revision");
return { created, chapterIdMap, characterIdMap, termIdMap,
  capturedRevision: revisionRow.revision };

await writeLuieContainer({ targetPath: projectPath, payload, logger });
await markProjectExported(created.id, imported.capturedRevision);
```

write 또는 mark 실패 시 기존 project rollback을 유지한다. 생성된 `.luie`는 복구 가능한 상태로 남긴다.

- [ ] **Step 5: sync writer에 captured mark 연결**

payload build 직전에 revision을 capture하고 atomic write 성공 뒤 같은 값만 mark한다.

```ts
const { revision: capturedRevision } = await getProjectRevisionState(project.id);
const payload = await buildPayload({
  bundle,
  projectId: project.id,
  projectPath: safeProjectPath,
  localSnapshots: localProject?.snapshots ?? [],
  hydrateMissingWorldDocsFromPackage,
  logger,
});
if (!payload) continue;
try {
  await writeLuieContainer({ targetPath: safeProjectPath, payload, logger });
  await markProjectExported(project.id, capturedRevision);
  persistedProjects.push({ projectId: project.id, projectPath: safeProjectPath });
} catch (error) {
  failedProjects.push(project.id);
  projectService.schedulePackageExport(project.id, "sync:retry");
  logger.error("Failed to persist merged bundle into .luie package", {
    projectId: project.id, projectPath: safeProjectPath, error,
  });
}
```

capture 뒤 더 최신 mutation은 더 큰 revision을 만들므로 mark 후에도 dirty로 남는다.

- [ ] **Step 6: GREEN과 저장 회귀 확인**

Run: `SKIP_DB_TEST_SETUP=1 pnpm vitest tests/main/database/projectRevisionTrigger.test.ts tests/main/services/projectImportTransaction.test.ts tests/main/services/snapshotImportRevision.test.ts tests/main/services/syncPackagePersistence.retry.test.ts tests/main/services/projectSaveRecovery.integration.test.ts tests/main/services/projectExportQueue.test.ts tests/main/services/worldEntitySaveIntegrity.test.ts --run`

Run: `SKIP_DB_TEST_SETUP=1 pnpm vitest tests/main/services/projectCheckpointRecovery.test.ts tests/main/services/projectService.immediateDurability.test.ts tests/main/services/luieDbLossRecovery.test.ts tests/main/services/snapshotService.packageBehavior.unit.test.ts tests/main/services/syncBundleApplier.commitOrder.test.ts --run`

Expected: 전체 PASS.

- [ ] **Step 7: SSOT 동기화**

scoped 설계 §4에 hydration baseline, direct writer capture, 성공-only mark를 기록한다. 상위 저장 SSOT에는 project-wide revision을 완료로 옮기고 실제 테스트 수, typecheck baseline, 독립 리뷰 verdict를 기록한다. 이 계획에도 완료 checkbox와 실제 commit hash를 기록한다.

- [ ] **Step 8: 전체 검증, 독립 리뷰, Task 2 커밋**

Run: `pnpm exec eslint src/main/database/main/projectRevisionTriggerSql.ts src/main/database/main/databaseSchemaBootstrap.ts src/main/services/core/project/projectRevisionStore.ts src/main/services/core/project/projectImportTransaction.ts src/main/services/features/snapshot/snapshotImportFromFile.ts src/main/services/features/sync/syncPackagePersistence.ts src/main/services/features/world/entities/characterService.ts src/main/services/features/world/entities/eventService.ts src/main/services/features/world/entities/factionService.ts src/main/services/features/world/entities/termService.ts tests/main/database/projectRevisionTrigger.test.ts tests/main/services/projectRevisionStore.test.ts tests/main/services/worldEntitySaveIntegrity.test.ts tests/main/services/projectImportTransaction.test.ts tests/main/services/snapshotImportRevision.test.ts tests/main/services/syncPackagePersistence.retry.test.ts tests/main/services/projectSaveRecovery.integration.test.ts`

Run: `pnpm run typecheck`

Run: `git diff --check`

Expected: 대상 ESLint와 diff-check PASS. typecheck는 사용자 dirty `BinderSidebarPanelBody.tsx:102`의 기존 `TS2322` 외 신규 오류 없음.

사용자가 요청한 subagent로 코드·테스트·SSOT 일치를 독립 검증한다. Critical/Important 지적은 같은 Task에서 수정하고 회귀를 다시 실행한다.

커밋 전 사용자 승인 메시지: `fix(storage): converge package revision checkpoints`

---

## 완료 조건

- canonical table과 Project metadata mutation이 같은 transaction에서 revision을 올린다.
- rollback, project 이동, relation pointer normalization이 revision 계약을 깨지 않는다.
- 기존 entity mutation은 delta 1이고 timestamp 동작을 보존한다.
- hydration은 즉시 clean이고 sync/snapshot은 성공한 captured revision만 mark한다.
- chapter raw mutation이 startup recovery를 통해 실제 `.luie` 최신 본문으로 수렴한다.
- 파생·로컬 table은 revision을 올리지 않는다.
- 사용자 dirty UI 파일은 diff와 commit에 포함되지 않는다.
