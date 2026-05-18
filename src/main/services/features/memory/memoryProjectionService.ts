import crypto from "node:crypto";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../../../database/index.js";
import {
  chapter,
  chapterBody,
  character,
  event,
  faction,
  memoryBuildJob,
  memoryChunk,
  note,
  plot,
  scene,
  scrapMemo,
  synopsis,
} from "../../../database/schema.js";
import { createLogger } from "../../../../shared/logger/index.js";
import { MEMORY_JOB_TYPES, MEMORY_TARGET_TYPES } from "./memoryJobConstants.js";

const logger = createLogger("MemoryProjectionService");
const MAX_JOB_ATTEMPTS = 5;
const BASE_RETRY_BACKOFF_MS = 2_000;

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function estimateTokenCountFromChars(content: string): number {
  // Phase 1 uses a cheap proxy for token count. Real tokenizer integration belongs to Phase 2+.
  return content.length;
}

const DEFAULT_CHUNK_TARGET = 500;
const DEFAULT_CHUNK_OVERLAP = 50;
const DEFAULT_CHUNK_HARD_CAP = 1000;

export function chunkText(
  input: string,
  chunkTarget = DEFAULT_CHUNK_TARGET,
  overlap = DEFAULT_CHUNK_OVERLAP,
  hardCap = DEFAULT_CHUNK_HARD_CAP,
): Array<{
  content: string;
  startOffset: number;
  endOffset: number;
}> {
  const chunks: Array<{ content: string; startOffset: number; endOffset: number }> = [];
  if (input.length === 0) return chunks;

  const pushChunk = (startOffset: number, endOffset: number) => {
    if (endOffset <= startOffset) return;
    const content = input.slice(startOffset, endOffset);
    if (content.length === 0) return;
    if (content.trim().length === 0) return;
    chunks.push({ content, startOffset, endOffset });
  };

  const splitOversizedSegment = (segmentStart: number, segmentEnd: number) => {
    let cursor = segmentStart;
    while (cursor < segmentEnd) {
      const maxEnd = Math.min(segmentEnd, cursor + hardCap);
      let end = maxEnd;
      if (maxEnd < segmentEnd) {
        const preferredStart = Math.min(maxEnd, cursor + Math.floor(chunkTarget * 0.7));
        const window = input.slice(preferredStart, maxEnd);
        const breakOffset = Math.max(
          window.lastIndexOf("\n"),
          window.lastIndexOf(" "),
          window.lastIndexOf("."),
          window.lastIndexOf(","),
        );
        if (breakOffset >= 0) {
          end = preferredStart + breakOffset + 1;
        }
      }
      pushChunk(cursor, end);
      if (end >= segmentEnd) break;
      cursor = Math.max(cursor + 1, end - overlap);
    }
  };

  const paragraphBoundaries: Array<{ start: number; end: number }> = [];
  let paragraphStart = 0;
  const separator = /\n{2,}/g;
  for (const match of input.matchAll(separator)) {
    const sepStart = match.index ?? 0;
    const sepEnd = sepStart + match[0].length;
    paragraphBoundaries.push({ start: paragraphStart, end: sepEnd });
    paragraphStart = sepEnd;
  }
  if (paragraphStart < input.length) {
    paragraphBoundaries.push({ start: paragraphStart, end: input.length });
  }

  let currentStart: number | null = null;
  let currentEnd = 0;
  for (const paragraph of paragraphBoundaries) {
    const paragraphLength = paragraph.end - paragraph.start;
    if (paragraphLength > hardCap) {
      if (currentStart !== null) {
        pushChunk(currentStart, currentEnd);
        currentStart = null;
      }
      splitOversizedSegment(paragraph.start, paragraph.end);
      continue;
    }

    if (currentStart === null) {
      currentStart = paragraph.start;
      currentEnd = paragraph.end;
      continue;
    }

    const nextLength = paragraph.end - currentStart;
    if (nextLength <= chunkTarget) {
      currentEnd = paragraph.end;
      continue;
    }

    pushChunk(currentStart, currentEnd);
    const overlapStart = Math.max(currentStart, currentEnd - overlap);
    currentStart = overlapStart;
    currentEnd = paragraph.end;

    if (currentEnd - currentStart > hardCap) {
      splitOversizedSegment(currentStart, currentEnd);
      currentStart = null;
    }
  }

  if (currentStart !== null) {
    pushChunk(currentStart, currentEnd);
  }
  return chunks;
}

class MemoryProjectionService {
  private canRetry(job: {
    status: string;
    attempts: number;
    updatedAt: string;
  }): boolean {
    if (job.status === "pending") return true;
    if (job.status !== "failed") return false;
    if (job.attempts >= MAX_JOB_ATTEMPTS) return false;
    const updatedAtMs = Date.parse(job.updatedAt);
    if (!Number.isFinite(updatedAtMs)) return true;
    const backoffMs = BASE_RETRY_BACKOFF_MS * Math.max(1, job.attempts);
    return Date.now() - updatedAtMs >= backoffMs;
  }

  async enqueueChapterChunkRebuild(input: {
    projectId: string;
    chapterId: string;
    reason: string;
    priority?: number;
  }): Promise<void> {
    const client = db.getClient();
    const now = new Date().toISOString();
    await client.insert(memoryBuildJob).values({
      id: crypto.randomUUID(),
      projectId: input.projectId,
      targetType: MEMORY_TARGET_TYPES.CHAPTER,
      targetId: input.chapterId,
      jobType: MEMORY_JOB_TYPES.REBUILD_CHUNKS,
      status: "pending",
      priority: input.priority ?? 100,
      attempts: 0,
      error: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  async processPendingChunkJobs(input: {
    projectId: string;
    limit?: number;
    sourceType?: string;
    sourceId?: string;
  }): Promise<{ queued: number; processed: number }> {
    const client = db.getClient();
    const limit = input.limit ?? 20;
    const jobFilters = [
      eq(memoryBuildJob.projectId, input.projectId),
      eq(memoryBuildJob.jobType, MEMORY_JOB_TYPES.REBUILD_CHUNKS),
      inArray(memoryBuildJob.status, ["pending", "failed"]),
      eq(memoryBuildJob.targetType, input.sourceType ?? MEMORY_TARGET_TYPES.CHAPTER),
    ];
    if (input.sourceId) {
      jobFilters.push(eq(memoryBuildJob.targetId, input.sourceId));
    }
    const candidates = await client
      .select()
      .from(memoryBuildJob)
      .where(and(...jobFilters))
      .orderBy(asc(memoryBuildJob.priority), asc(memoryBuildJob.createdAt))
      .limit(Math.max(limit * 3, 30));
    const jobs = candidates
      .filter((job) => this.canRetry(job))
      .slice(0, limit);

    if (jobs.length === 0) {
      return { queued: 0, processed: 0 };
    }

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
          content: sql<string>`COALESCE(${scrapMemo.title}, '') || char(10) || COALESCE(${scrapMemo.content}, '')`,
          bodyContent: sql<string | null>`NULL`,
          sourceType: sql<string>`${MEMORY_TARGET_TYPES.SCRAP_MEMO}`,
        })
        .from(scrapMemo)
        .where(and(inArray(scrapMemo.id, scrapMemoIds), isNull(scrapMemo.deletedAt)))
      : [];

    const sourceRows = [
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
    const sourceMap = new Map(
      sourceRows.map((row) => [`${row.sourceType}:${row.id}`, row]),
    );

    let processed = 0;
    await jobs.reduce<Promise<void>>(async (prev, job) => {
      await prev;
      // Keep each job atomic, but yield between jobs to avoid long sync stretches.
      await yieldToEventLoop();
      const now = new Date().toISOString();
      await client
        .update(memoryBuildJob)
        .set({
          status: "running",
          updatedAt: now,
        })
        .where(eq(memoryBuildJob.id, job.id));
      const source = sourceMap.get(`${job.targetType}:${job.targetId}`);
      if (!source) {
        const attempts = job.attempts + 1;
        const nextStatus = attempts >= MAX_JOB_ATTEMPTS ? "failed" : "pending";
        await client
          .update(memoryBuildJob)
          .set({
            status: nextStatus,
            attempts,
            error: "SOURCE_NOT_FOUND",
            updatedAt: now,
          })
          .where(eq(memoryBuildJob.id, job.id));
        return;
      }

      try {
        const sourceContent = String(source.bodyContent ?? source.content ?? "");
        const chunks = chunkText(sourceContent);

        client.transaction((tx) => {
          tx.run(
            sql`DELETE FROM "MemoryChunkFts"
                WHERE "chunkId" IN (
                  SELECT "id" FROM "MemoryChunk"
                  WHERE "sourceType" = ${job.targetType} AND "sourceId" = ${job.targetId}
                );`,
          );
          tx
            .delete(memoryChunk)
            .where(
              and(
                eq(memoryChunk.sourceType, job.targetType),
                eq(memoryChunk.sourceId, job.targetId),
              ),
            )
            .run();

          for (let index = 0; index < chunks.length; index += 1) {
            const chunkItem = chunks[index];
            const chunkId = crypto.randomUUID();
            tx.insert(memoryChunk).values({
              id: chunkId,
              projectId: source.projectId,
              sourceType: job.targetType,
              sourceId: job.targetId,
              chapterId: source.chapterId ?? null,
              sceneId: source.sceneId ?? null,
              chunkIndex: index,
              content: chunkItem.content,
              contentHash: sha256(chunkItem.content),
              startOffset: chunkItem.startOffset,
              endOffset: chunkItem.endOffset,
              tokenCount: estimateTokenCountFromChars(chunkItem.content),
              createdAt: now,
              updatedAt: now,
            }).run();
            tx.run(
              sql`INSERT INTO "MemoryChunkFts" ("chunkId","projectId","chapterId","content")
                  VALUES (${chunkId}, ${source.projectId}, ${source.chapterId ?? null}, ${chunkItem.content});`,
            );
          }

          tx
            .update(memoryBuildJob)
            .set({
              status: "completed",
              attempts: job.attempts + 1,
              error: null,
              updatedAt: now,
            })
            .where(eq(memoryBuildJob.id, job.id))
            .run();
        });
        processed += 1;
      } catch (error) {
        const attempts = job.attempts + 1;
        const nextStatus = attempts >= MAX_JOB_ATTEMPTS ? "failed" : "pending";
        await client
          .update(memoryBuildJob)
          .set({
            status: nextStatus,
            attempts,
            error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
            updatedAt: now,
          })
          .where(eq(memoryBuildJob.id, job.id));
        logger.warn("Memory chunk job failed", {
          jobId: job.id,
          targetId: job.targetId,
          attempts,
          nextStatus,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, Promise.resolve());

    logger.info("Processed memory chunk jobs", {
      projectId: input.projectId,
      queued: jobs.length,
      processed,
    });

    return { queued: jobs.length, processed };
  }
}

export const memoryProjectionService = new MemoryProjectionService();
