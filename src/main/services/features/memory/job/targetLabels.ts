import { and, eq, inArray } from "drizzle-orm";
import {
  character,
  db,
  chapter,
  event,
  faction,
  memoryChunk,
  note,
  plot,
  scrapMemo,
  scene,
  synopsis,
} from "../../../../infra/database/index.js";

type MemoryBuildJobTarget = {
  targetType: string;
  targetId: string;
};

const targetKey = (targetType: string, targetId: string): string =>
  `${targetType}:${targetId}`;

const uniqueTargetIds = (
  targets: MemoryBuildJobTarget[],
  targetType: string,
): string[] => [
  ...new Set(
    targets
      .filter((target) => target.targetType === targetType)
      .map((target) => target.targetId),
  ),
];

export async function loadMemoryBuildJobTargetLabels(input: {
  projectId: string;
  targets: MemoryBuildJobTarget[];
}): Promise<Map<string, string>> {
  const chapterIds = uniqueTargetIds(input.targets, "chapter");
  const sceneIds = uniqueTargetIds(input.targets, "scene");
  const noteIds = uniqueTargetIds(input.targets, "note");
  const synopsisIds = uniqueTargetIds(input.targets, "synopsis");
  const plotIds = uniqueTargetIds(input.targets, "plot");
  const characterIds = uniqueTargetIds(input.targets, "character");
  const factionIds = uniqueTargetIds(input.targets, "faction");
  const eventIds = uniqueTargetIds(input.targets, "event");
  const scrapMemoIds = uniqueTargetIds(input.targets, "scrapMemo");
  const chunkIds = uniqueTargetIds(input.targets, "chunk");
  const labels = new Map<string, string>();

  if (chapterIds.length > 0) {
    const rows = await db
      .getClient()
      .select({
        id: chapter.id,
        title: chapter.title,
        order: chapter.order,
      })
      .from(chapter)
      .where(
        and(
          eq(chapter.projectId, input.projectId),
          inArray(chapter.id, chapterIds),
        ),
      );
    for (const row of rows) {
      labels.set(targetKey("chapter", row.id), `${row.order}화 · ${row.title}`);
    }
  }

  if (sceneIds.length > 0) {
    const rows = await db
      .getClient()
      .select({
        id: scene.id,
        title: scene.title,
        order: scene.order,
        chapterOrder: chapter.order,
      })
      .from(scene)
      .leftJoin(chapter, eq(chapter.id, scene.chapterId))
      .where(
        and(
          eq(scene.projectId, input.projectId),
          inArray(scene.id, sceneIds),
        ),
      );
    for (const row of rows) {
      const chapterPrefix =
        typeof row.chapterOrder === "number" ? `${row.chapterOrder}화 · ` : "";
      labels.set(
        targetKey("scene", row.id),
        `${chapterPrefix}장면 ${row.order} · ${row.title}`,
      );
    }
  }

  if (noteIds.length > 0) {
    const rows = await db
      .getClient()
      .select({
        id: note.id,
        title: note.title,
      })
      .from(note)
      .where(
        and(eq(note.projectId, input.projectId), inArray(note.id, noteIds)),
      );
    for (const row of rows) {
      labels.set(targetKey("note", row.id), `노트 · ${row.title}`);
    }
  }

  if (synopsisIds.length > 0) {
    const rows = await db
      .getClient()
      .select({
        id: synopsis.id,
        title: synopsis.title,
      })
      .from(synopsis)
      .where(
        and(
          eq(synopsis.projectId, input.projectId),
          inArray(synopsis.id, synopsisIds),
        ),
      );
    for (const row of rows) {
      labels.set(targetKey("synopsis", row.id), `시놉시스 · ${row.title}`);
    }
  }

  if (plotIds.length > 0) {
    const rows = await db
      .getClient()
      .select({
        id: plot.id,
        title: plot.title,
      })
      .from(plot)
      .where(
        and(eq(plot.projectId, input.projectId), inArray(plot.id, plotIds)),
      );
    for (const row of rows) {
      labels.set(targetKey("plot", row.id), `플롯 · ${row.title}`);
    }
  }

  if (characterIds.length > 0) {
    const rows = await db
      .getClient()
      .select({
        id: character.id,
        name: character.name,
      })
      .from(character)
      .where(
        and(
          eq(character.projectId, input.projectId),
          inArray(character.id, characterIds),
        ),
      );
    for (const row of rows) {
      labels.set(targetKey("character", row.id), `인물 · ${row.name}`);
    }
  }

  if (factionIds.length > 0) {
    const rows = await db
      .getClient()
      .select({
        id: faction.id,
        name: faction.name,
      })
      .from(faction)
      .where(
        and(
          eq(faction.projectId, input.projectId),
          inArray(faction.id, factionIds),
        ),
      );
    for (const row of rows) {
      labels.set(targetKey("faction", row.id), `세력 · ${row.name}`);
    }
  }

  if (eventIds.length > 0) {
    const rows = await db
      .getClient()
      .select({
        id: event.id,
        name: event.name,
      })
      .from(event)
      .where(
        and(eq(event.projectId, input.projectId), inArray(event.id, eventIds)),
      );
    for (const row of rows) {
      labels.set(targetKey("event", row.id), `사건 · ${row.name}`);
    }
  }

  if (scrapMemoIds.length > 0) {
    const rows = await db
      .getClient()
      .select({
        id: scrapMemo.id,
        title: scrapMemo.title,
      })
      .from(scrapMemo)
      .where(
        and(
          eq(scrapMemo.projectId, input.projectId),
          inArray(scrapMemo.id, scrapMemoIds),
        ),
      );
    for (const row of rows) {
      labels.set(targetKey("scrapMemo", row.id), `자료 메모 · ${row.title}`);
    }
  }

  if (chunkIds.length > 0) {
    const rows = await db
      .getClient()
      .select({
        id: memoryChunk.id,
        chunkIndex: memoryChunk.chunkIndex,
        contextLabel: memoryChunk.contextLabel,
        chapterTitle: chapter.title,
        chapterOrder: chapter.order,
        sceneTitle: scene.title,
        sceneOrder: scene.order,
      })
      .from(memoryChunk)
      .leftJoin(chapter, eq(chapter.id, memoryChunk.chapterId))
      .leftJoin(scene, eq(scene.id, memoryChunk.sceneId))
      .where(
        and(
          eq(memoryChunk.projectId, input.projectId),
          inArray(memoryChunk.id, chunkIds),
        ),
      );
    for (const row of rows) {
      const parts = [
        typeof row.chapterOrder === "number" ? `${row.chapterOrder}화` : null,
        row.chapterTitle,
        typeof row.sceneOrder === "number" ? `장면 ${row.sceneOrder}` : null,
        row.sceneTitle,
        `chunk ${row.chunkIndex + 1}`,
        row.contextLabel,
      ].filter(
        (part): part is string => typeof part === "string" && part.length > 0,
      );
      labels.set(targetKey("chunk", row.id), parts.join(" · "));
    }
  }

  return labels;
}
