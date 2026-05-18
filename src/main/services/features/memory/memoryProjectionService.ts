import crypto from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../../database/index.js";
import { chapter, chapterBody, memoryBuildJob, memoryChunk } from "../../../database/schema.js";
import { createLogger } from "../../../../shared/logger/index.js";

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
      targetType: "chapter",
      targetId: input.chapterId,
      jobType: "rebuild_chunks",
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
      eq(memoryBuildJob.jobType, "rebuild_chunks"),
      inArray(memoryBuildJob.status, ["pending", "failed"]),
      eq(memoryBuildJob.targetType, input.sourceType ?? "chapter"),
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

    const chapterIds = jobs.map((job) => job.targetId);
    const chapters = await client
      .select({
        id: chapter.id,
        projectId: chapter.projectId,
        content: chapter.content,
        bodyContent: chapterBody.content,
      })
      .from(chapter)
      .leftJoin(chapterBody, eq(chapterBody.chapterId, chapter.id))
      .where(inArray(chapter.id, chapterIds));
    const chapterMap = new Map(chapters.map((row) => [row.id, row]));

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
      const source = chapterMap.get(job.targetId);
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
                  WHERE "sourceType" = 'chapter' AND "sourceId" = ${job.targetId}
                );`,
          );
          tx
            .delete(memoryChunk)
            .where(
              and(
                eq(memoryChunk.sourceType, "chapter"),
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
              sourceType: "chapter",
              sourceId: job.targetId,
              chapterId: job.targetId,
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
                  VALUES (${chunkId}, ${source.projectId}, ${job.targetId}, ${chunkItem.content});`,
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
