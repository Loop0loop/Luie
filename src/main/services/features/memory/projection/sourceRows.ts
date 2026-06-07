import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { MainDrizzleClient } from "../../../../infra/database/index.js";
import {
  chapter,
  chapterBody,
  character,
  event,
  faction,
  note,
  plot,
  scene,
  scrapMemo,
  synopsis,
} from "../../../../infra/database/index.js";
import type { memoryBuildJob } from "../../../../infra/database/index.js";
import { MEMORY_TARGET_TYPES } from "../memoryJobConstants.js";

type MemoryBuildJobRow = typeof memoryBuildJob.$inferSelect;

export type MemorySourceRow = {
  id: string;
  projectId: string;
  chapterId: string | null;
  sceneId: string | null;
  title: string | null;
  content: string | null;
  bodyContent: string | null;
  sourceType: string;
};

export async function collectMemorySourceRows(
  client: MainDrizzleClient,
  jobs: MemoryBuildJobRow[],
): Promise<MemorySourceRow[]> {
  const chapterIds = jobs
    .filter((job) => job.targetType === MEMORY_TARGET_TYPES.CHAPTER)
    .map((job) => job.targetId);
  const sceneIds = jobs
    .filter((job) => job.targetType === MEMORY_TARGET_TYPES.SCENE)
    .map((job) => job.targetId);
  const noteIds = jobs
    .filter((job) => job.targetType === MEMORY_TARGET_TYPES.NOTE)
    .map((job) => job.targetId);
  const synopsisIds = jobs
    .filter((job) => job.targetType === MEMORY_TARGET_TYPES.SYNOPSIS)
    .map((job) => job.targetId);
  const plotIds = jobs
    .filter((job) => job.targetType === MEMORY_TARGET_TYPES.PLOT)
    .map((job) => job.targetId);
  const eventIds = jobs
    .filter((job) => job.targetType === MEMORY_TARGET_TYPES.EVENT)
    .map((job) => job.targetId);
  const characterIds = jobs
    .filter((job) => job.targetType === MEMORY_TARGET_TYPES.CHARACTER)
    .map((job) => job.targetId);
  const factionIds = jobs
    .filter((job) => job.targetType === MEMORY_TARGET_TYPES.FACTION)
    .map((job) => job.targetId);
  const scrapMemoIds = jobs
    .filter((job) => job.targetType === MEMORY_TARGET_TYPES.SCRAP_MEMO)
    .map((job) => job.targetId);

  const chapterRows = chapterIds.length > 0
    ? await client
      .select({
        id: chapter.id,
        projectId: chapter.projectId,
        chapterId: chapter.id,
        sceneId: sql<string | null>`NULL`,
        title: chapter.title,
        content: chapter.content,
        bodyContent: chapterBody.content,
        sourceType: sql<string>`${MEMORY_TARGET_TYPES.CHAPTER}`,
      })
      .from(chapter)
      .leftJoin(chapterBody, eq(chapterBody.chapterId, chapter.id))
      .where(inArray(chapter.id, chapterIds))
    : [];
  const sceneRows = sceneIds.length > 0
    ? await client
      .select({
        id: scene.id,
        projectId: scene.projectId,
        chapterId: scene.chapterId,
        sceneId: scene.id,
        title: scene.title,
        content: scene.body,
        bodyContent: sql<string | null>`NULL`,
        sourceType: sql<string>`${MEMORY_TARGET_TYPES.SCENE}`,
      })
      .from(scene)
      .where(and(inArray(scene.id, sceneIds), isNull(scene.deletedAt)))
    : [];
  const noteRows = noteIds.length > 0
    ? await client
      .select({
        id: note.id,
        projectId: note.projectId,
        chapterId: note.chapterId,
        sceneId: sql<string | null>`NULL`,
        title: note.title,
        content: sql<string>`COALESCE(${note.title}, '') || char(10) || COALESCE(${note.body}, '')`,
        bodyContent: sql<string | null>`NULL`,
        sourceType: sql<string>`${MEMORY_TARGET_TYPES.NOTE}`,
      })
      .from(note)
      .where(and(inArray(note.id, noteIds), isNull(note.deletedAt)))
    : [];
  const synopsisRows = synopsisIds.length > 0
    ? await client
      .select({
        id: synopsis.id,
        projectId: synopsis.projectId,
        chapterId: synopsis.chapterId,
        sceneId: sql<string | null>`NULL`,
        title: synopsis.title,
        content: sql<string>`COALESCE(${synopsis.title}, '') || char(10) || COALESCE(${synopsis.body}, '')`,
        bodyContent: sql<string | null>`NULL`,
        sourceType: sql<string>`${MEMORY_TARGET_TYPES.SYNOPSIS}`,
      })
      .from(synopsis)
      .where(and(inArray(synopsis.id, synopsisIds), isNull(synopsis.deletedAt)))
    : [];
  const plotRows = plotIds.length > 0
    ? await client
      .select({
        id: plot.id,
        projectId: plot.projectId,
        chapterId: sql<string | null>`NULL`,
        sceneId: sql<string | null>`NULL`,
        title: plot.title,
        content: sql<string>`COALESCE(${plot.title}, '') || char(10) || COALESCE(${plot.body}, '')`,
        bodyContent: sql<string | null>`NULL`,
        sourceType: sql<string>`${MEMORY_TARGET_TYPES.PLOT}`,
      })
      .from(plot)
      .where(and(inArray(plot.id, plotIds), isNull(plot.deletedAt)))
    : [];
  const eventRows = eventIds.length > 0
    ? await client
      .select({
        id: event.id,
        projectId: event.projectId,
        chapterId: sql<string | null>`NULL`,
        sceneId: sql<string | null>`NULL`,
        title: event.name,
        content: sql<string>`COALESCE(${event.name}, '') || char(10) || COALESCE(${event.description}, '')`,
        bodyContent: sql<string | null>`NULL`,
        sourceType: sql<string>`${MEMORY_TARGET_TYPES.EVENT}`,
      })
      .from(event)
      .where(and(inArray(event.id, eventIds), isNull(event.deletedAt)))
    : [];
  const characterRows = characterIds.length > 0
    ? await client
      .select({
        id: character.id,
        projectId: character.projectId,
        chapterId: sql<string | null>`NULL`,
        sceneId: sql<string | null>`NULL`,
        title: character.name,
        content: sql<string>`COALESCE(${character.name}, '') || char(10) || COALESCE(${character.description}, '')`,
        bodyContent: sql<string | null>`NULL`,
        sourceType: sql<string>`${MEMORY_TARGET_TYPES.CHARACTER}`,
      })
      .from(character)
      .where(and(inArray(character.id, characterIds), isNull(character.deletedAt)))
    : [];
  const factionRows = factionIds.length > 0
    ? await client
      .select({
        id: faction.id,
        projectId: faction.projectId,
        chapterId: sql<string | null>`NULL`,
        sceneId: sql<string | null>`NULL`,
        title: faction.name,
        content: sql<string>`COALESCE(${faction.name}, '') || char(10) || COALESCE(${faction.description}, '')`,
        bodyContent: sql<string | null>`NULL`,
        sourceType: sql<string>`${MEMORY_TARGET_TYPES.FACTION}`,
      })
      .from(faction)
      .where(and(inArray(faction.id, factionIds), isNull(faction.deletedAt)))
    : [];
  const scrapMemoRows = scrapMemoIds.length > 0
    ? await client
      .select({
        id: scrapMemo.id,
        projectId: scrapMemo.projectId,
        chapterId: sql<string | null>`NULL`,
        sceneId: sql<string | null>`NULL`,
        title: scrapMemo.title,
        content: sql<string>`COALESCE(${scrapMemo.title}, '') || char(10) || COALESCE(${scrapMemo.content}, '')`,
        bodyContent: sql<string | null>`NULL`,
        sourceType: sql<string>`${MEMORY_TARGET_TYPES.SCRAP_MEMO}`,
      })
      .from(scrapMemo)
      .where(and(inArray(scrapMemo.id, scrapMemoIds), isNull(scrapMemo.deletedAt)))
    : [];

  return [
    ...chapterRows,
    ...sceneRows,
    ...noteRows,
    ...synopsisRows,
    ...plotRows,
    ...eventRows,
    ...characterRows,
    ...factionRows,
    ...scrapMemoRows,
  ];
}
