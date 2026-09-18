import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../../../infra/database/index.js";
import * as schema from "../../../../infra/database/index.js";
import type { ProjectExportRecord } from "../../../../../shared/types/index.js";
import {
  toChapterExportDto,
  toCharacterExportDto,
  toEntityRelationExportDto,
  toEventExportDto,
  toFactionExportDto,
  toSnapshotExportDto,
  toTermExportDto,
  toWorldEntityExportDto,
} from "../projectExportMapper.js";

const { project, chapter, chapterBody, character, term, faction, event, worldEntity, entityRelation, snapshot } = schema;

export const getProjectForExport = async (
  projectId: string,
  snapshotExportLimit: number,
): Promise<ProjectExportRecord | null> => {
  const store = db.getClient();

  const projectRows = await store
    .select()
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);

  if (projectRows.length === 0) return null;
  const proj = projectRows[0];
  const snapshotsQuery = store
    .select()
    .from(snapshot)
    .where(eq(snapshot.projectId, projectId))
    .orderBy(desc(snapshot.createdAt));
  const limitedSnapshotsQuery =
    snapshotExportLimit > 0
      ? snapshotsQuery.limit(snapshotExportLimit)
      : snapshotsQuery;

  const [
    chapters,
    characters,
    terms,
    factionsRows,
    eventsRows,
    worldEntitiesRows,
    entityRelationsRows,
    snapshotsRows,
  ] = await Promise.all([
    store
      .select({
        id: chapter.id,
        title: chapter.title,
        order: chapter.order,
        updatedAt: chapter.updatedAt,
        content: sql<string>`COALESCE(${chapterBody.content}, ${chapter.content})`,
      })
      .from(chapter)
      .leftJoin(chapterBody, eq(chapterBody.chapterId, chapter.id))
      .where(and(eq(chapter.projectId, projectId), isNull(chapter.deletedAt)))
      .orderBy(asc(chapter.order)),
    store
      .select()
      .from(character)
      .where(and(eq(character.projectId, projectId), isNull(character.deletedAt))),
    store
      .select()
      .from(term)
      .where(and(eq(term.projectId, projectId), isNull(term.deletedAt))),
    store
      .select()
      .from(faction)
      .where(and(eq(faction.projectId, projectId), isNull(faction.deletedAt))),
    store
      .select()
      .from(event)
      .where(and(eq(event.projectId, projectId), isNull(event.deletedAt))),
    store
      .select()
      .from(worldEntity)
      .where(and(eq(worldEntity.projectId, projectId), isNull(worldEntity.deletedAt))),
    store
      .select()
      .from(entityRelation)
      .where(eq(entityRelation.projectId, projectId)),
    limitedSnapshotsQuery,
  ]);

  return {
    id: proj.id,
    title: proj.title,
    description: proj.description,
    createdAt: new Date(proj.createdAt),
    updatedAt: new Date(proj.updatedAt),
    projectPath: proj.projectPath ?? null,
    chapters: chapters.map(toChapterExportDto),
    characters: characters.map(toCharacterExportDto),
    terms: terms.map(toTermExportDto),
    events: eventsRows.map(toEventExportDto),
    factions: factionsRows.map(toFactionExportDto),
    worldEntities: worldEntitiesRows.map(toWorldEntityExportDto),
    entityRelations: entityRelationsRows.map(toEntityRelationExportDto),
    snapshots: snapshotsRows.map(toSnapshotExportDto),
  };
};
