import { eq } from "drizzle-orm";
import {
  chapter,
  db,
  memoryChunk,
  project,
} from "../../../../infra/database/index.js";
import type { MemoryLongformBenchmarkManifest } from "./memoryLongformBenchmarkSeed.js";

export type MemoryLongformBenchmarkMaterializeResult = {
  projectId: string;
  profileName: string;
  chapters: number;
  chunks: number;
  inserted: boolean;
};

const CHUNK_INSERT_BATCH_SIZE = 500;

function buildChunkContent(input: {
  chapterTitle: string;
  chunkIndex: number;
  characterCount: number;
  aliases: string[];
  containsRewriteMarker: boolean;
  containsStateChange: boolean;
}): string {
  const markers = [
    input.chapterTitle,
    `chunk ${input.chunkIndex}`,
    `aliases ${input.aliases.join(", ")}`,
    input.containsRewriteMarker ? "rewrite-marker" : "stable-draft",
    input.containsStateChange ? "state-change" : "state-hold",
  ];
  const base = `${markers.join(" / ")}. `;
  return base.repeat(Math.ceil(input.characterCount / base.length)).slice(
    0,
    input.characterCount,
  );
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function materializeMemoryLongformBenchmark(input: {
  manifest: MemoryLongformBenchmarkManifest;
  projectId: string;
  nowIso?: string;
}): Promise<MemoryLongformBenchmarkMaterializeResult> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const existing = await db
    .getClient()
    .select({ id: project.id })
    .from(project)
    .where(eq(project.id, input.projectId))
    .limit(1);

  if (existing.length > 0) {
    const chapterRows = await db
      .getClient()
      .select({ id: chapter.id })
      .from(chapter)
      .where(eq(chapter.projectId, input.projectId));
    const chunkRows = await db
      .getClient()
      .select({ id: memoryChunk.id })
      .from(memoryChunk)
      .where(eq(memoryChunk.projectId, input.projectId));
    return {
      projectId: input.projectId,
      profileName: input.manifest.profile.name,
      chapters: chapterRows.length,
      chunks: chunkRows.length,
      inserted: false,
    };
  }

  db.getClient().transaction((tx) => {
    tx.insert(project)
      .values({
        id: input.projectId,
        title: `Memory Benchmark ${input.manifest.profile.name}`,
        description: input.manifest.profile.description,
        projectPath: null,
        updatedAt: nowIso,
      })
      .run();

    const chapterRows = input.manifest.chapters.map((item) => ({
      id: `${input.projectId}:${item.id}`,
      projectId: input.projectId,
      title: item.title,
      content: "",
      synopsis: `${item.arc} / ${item.focusCharacters.join(", ")}`,
      order: item.order,
      wordCount: Math.round(
        (item.targetChunkCount *
          input.manifest.summary.averageChunkCharacters) /
          2,
      ),
      updatedAt: nowIso,
    }));
    tx.insert(chapter).values(chapterRows).run();

    const chapterByManifestId = new Map(
      input.manifest.chapters.map((item) => [
        item.id,
        `${input.projectId}:${item.id}`,
      ]),
    );
    const titleByManifestId = new Map(
      input.manifest.chapters.map((item) => [item.id, item.title]),
    );

    const chunkRows = input.manifest.chunks.map((item) => {
      const chapterId = chapterByManifestId.get(item.chapterId);
      if (!chapterId) {
        throw new Error(`Unknown benchmark chapter: ${item.chapterId}`);
      }
      const content = buildChunkContent({
        chapterTitle: titleByManifestId.get(item.chapterId) ?? item.chapterId,
        chunkIndex: item.chunkIndex,
        characterCount: item.characterCount,
        aliases: item.aliases,
        containsRewriteMarker: item.containsRewriteMarker,
        containsStateChange: item.containsStateChange,
      });
      return {
        id: `${input.projectId}:${item.id}`,
        projectId: input.projectId,
        sourceType: "benchmark",
        sourceId: `${input.projectId}:${item.chapterId}`,
        chapterId,
        sceneId: null,
        chunkIndex: item.chunkIndex,
        content,
        contentHash: `${input.projectId}:${item.id}:content`,
        indexText: content,
        indexTextHash: `${input.projectId}:${item.id}:index`,
        contextLabel: input.manifest.profile.name,
        sourceContentHash: `${input.projectId}:${item.chapterId}`,
        startOffset: item.chunkIndex * item.characterCount,
        endOffset: item.chunkIndex * item.characterCount + item.characterCount,
        paragraphStartIndex: item.chunkIndex,
        paragraphEndIndex: item.chunkIndex,
        tokenCount: Math.ceil(item.characterCount / 4),
        updatedAt: nowIso,
      };
    });
    for (const chunkBatch of chunkArray(chunkRows, CHUNK_INSERT_BATCH_SIZE)) {
      tx.insert(memoryChunk).values(chunkBatch).run();
    }
  });

  return {
    projectId: input.projectId,
    profileName: input.manifest.profile.name,
    chapters: input.manifest.chapters.length,
    chunks: input.manifest.chunks.length,
    inserted: true,
  };
}
