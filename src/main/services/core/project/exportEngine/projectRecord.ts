import { and, asc, desc, eq, isNull } from "drizzle-orm";
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

const { project, chapter, character, term, faction, event, worldEntity, entityRelation, snapshot } = schema;

export const getProjectForExport = async (
  projectId: string,
): Promise<ProjectExportRecord | null> => {
  const store = db.getClient();

  const projectRows = await store
    .select()
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);

  if (projectRows.length === 0) return null;
  const proj = projectRows[0];

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
      .select()
      .from(chapter)
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
    store
      .select()
      .from(snapshot)
      .where(eq(snapshot.projectId, projectId))
      .orderBy(desc(snapshot.createdAt)),
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
