import { MEMORY_CANONICAL_EXPORTABLE_TABLES } from "../../services/features/memory/persistence/memoryPersistencePolicy.js";

const CORE_DIRECT_TABLES = [
  "Chapter",
  "Character",
  "Term",
  "Faction",
  "Event",
  "WorldEntity",
  "EntityRelation",
  "Snapshot",
  "WorldDocument",
  "ScrapMemo",
] as const;

export const PROJECT_REVISION_DIRECT_TABLES = [
  ...CORE_DIRECT_TABLES,
  ...MEMORY_CANONICAL_EXPORTABLE_TABLES,
] as const;

const directTriggerNames = PROJECT_REVISION_DIRECT_TABLES.flatMap((table) => [
  `project_revision_${table}_insert`,
  `project_revision_${table}_update`,
  `project_revision_${table}_delete`,
]);

export const PROJECT_REVISION_TRIGGER_NAMES: readonly string[] = [
  "project_revision_Project_insert",
  "project_revision_Project_update",
  ...directTriggerNames,
  "project_revision_ChapterBody_insert",
  "project_revision_ChapterBody_update",
  "project_revision_ChapterBody_delete",
];

const entityRelationSemanticColumns = [
  "projectId",
  "sourceId",
  "sourceType",
  "targetId",
  "targetType",
  "relation",
  "attributes",
  "createdAt",
  "updatedAt",
];

const directTriggerSql = PROJECT_REVISION_DIRECT_TABLES.map((table) => {
  const updateColumns =
    table === "EntityRelation"
      ? ` OF ${entityRelationSemanticColumns.map((column) => `"${column}"`).join(", ")}`
      : "";
  return `
CREATE TRIGGER IF NOT EXISTS "project_revision_${table}_insert"
AFTER INSERT ON "${table}"
BEGIN
  UPDATE "Project" SET "revision" = "revision" + 1 WHERE "id" = NEW."projectId";
END;

CREATE TRIGGER IF NOT EXISTS "project_revision_${table}_update"
AFTER UPDATE${updateColumns} ON "${table}"
BEGIN
  UPDATE "Project" SET "revision" = "revision" + 1 WHERE "id" = OLD."projectId";
  UPDATE "Project" SET "revision" = "revision" + 1
    WHERE "id" = NEW."projectId" AND NEW."projectId" IS NOT OLD."projectId";
END;

CREATE TRIGGER IF NOT EXISTS "project_revision_${table}_delete"
AFTER DELETE ON "${table}"
BEGIN
  UPDATE "Project" SET "revision" = "revision" + 1 WHERE "id" = OLD."projectId";
END;`;
}).join("\n");

export const PROJECT_REVISION_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS "project_revision_Project_insert"
AFTER INSERT ON "Project"
BEGIN
  UPDATE "Project" SET "revision" = "revision" + 1 WHERE "id" = NEW."id";
END;

CREATE TRIGGER IF NOT EXISTS "project_revision_Project_update"
AFTER UPDATE OF "title", "description", "createdAt" ON "Project"
WHEN NEW."title" IS NOT OLD."title"
  OR NEW."description" IS NOT OLD."description"
  OR NEW."createdAt" IS NOT OLD."createdAt"
BEGIN
  UPDATE "Project" SET "revision" = "revision" + 1 WHERE "id" = NEW."id";
END;

${directTriggerSql}

CREATE TRIGGER IF NOT EXISTS "project_revision_ChapterBody_insert"
AFTER INSERT ON "ChapterBody"
BEGIN
  UPDATE "Project" SET "revision" = "revision" + 1
    WHERE "id" = (SELECT "projectId" FROM "Chapter" WHERE "id" = NEW."chapterId");
END;

CREATE TRIGGER IF NOT EXISTS "project_revision_ChapterBody_update"
AFTER UPDATE ON "ChapterBody"
BEGIN
  UPDATE "Project" SET "revision" = "revision" + 1
    WHERE "id" = (SELECT "projectId" FROM "Chapter" WHERE "id" = OLD."chapterId");
  UPDATE "Project" SET "revision" = "revision" + 1
    WHERE "id" = (SELECT "projectId" FROM "Chapter" WHERE "id" = NEW."chapterId")
      AND "id" IS NOT (SELECT "projectId" FROM "Chapter" WHERE "id" = OLD."chapterId");
END;

CREATE TRIGGER IF NOT EXISTS "project_revision_ChapterBody_delete"
AFTER DELETE ON "ChapterBody"
BEGIN
  UPDATE "Project" SET "revision" = "revision" + 1
    WHERE "id" = (SELECT "projectId" FROM "Chapter" WHERE "id" = OLD."chapterId");
END;
`;
