import crypto from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../../infra/database/index.js";
import {
  memoryBuildJob,
  memoryChunk,
} from "../../../infra/database/index.js";
import { createLogger } from "../../../../shared/logger/index.js";
import { MEMORY_JOB_TYPES, MEMORY_TARGET_TYPES } from "./memoryJobConstants.js";
import {
  canRetryMemoryBuildJob,
  buildMemoryChunkIndexText,
  buildMemoryContextLabel,
  chunkText,
  collectMemorySourceRows,
  estimateTokenCountFromChars,
  MAX_JOB_ATTEMPTS,
  sha256,
  yieldToEventLoop,
} from "./projection/index.js";

const logger = createLogger("MemoryProjectionService");
export { chunkText };

const EPISODE_EXTRACTOR_VERSION = "episode-v1";
const EPISODE_EXTRACTION_PRIORITY = 120;

class MemoryProjectionService {
  async enqueueChapterChunkRebuild(input: {
    projectId: string;
    chapterId: string;
    reason: string;
    priority?: number;
  }): Promise<void> {
    const client = db.getClient();
    const now = new Date().toISOString();
    const existingJobs = await client
      .select({ id: memoryBuildJob.id })
      .from(memoryBuildJob)
      .where(
        and(
          eq(memoryBuildJob.projectId, input.projectId),
          eq(memoryBuildJob.targetType, MEMORY_TARGET_TYPES.CHAPTER),
          eq(memoryBuildJob.targetId, input.chapterId),
          eq(memoryBuildJob.jobType, MEMORY_JOB_TYPES.REBUILD_CHUNKS),
          inArray(memoryBuildJob.status, ["pending", "running"]),
        ),
      )
      .limit(1);
    if (existingJobs.length > 0) {
      return;
    }

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
    ];
    if (input.sourceType) {
      jobFilters.push(eq(memoryBuildJob.targetType, input.sourceType));
    }
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
      .filter((job) => canRetryMemoryBuildJob(job))
      .slice(0, limit);

    if (jobs.length === 0) {
      return { queued: 0, processed: 0 };
    }

    const sourceRows = await collectMemorySourceRows(client, jobs);
    const sourceMap = new Map(
      sourceRows.map((row) => [`${row.sourceType}:${row.id}`, row]),
    );

    let processed = 0;
    await jobs.reduce<Promise<void>>(async (prev, job) => {
      await prev;
      // Keep each job atomic, but yield between jobs to avoid long sync stretches.
      await yieldToEventLoop();
      const now = new Date().toISOString();
      const claimed = await client
        .update(memoryBuildJob)
        .set({
          status: "running",
          updatedAt: now,
        })
        .where(
          and(
            eq(memoryBuildJob.id, job.id),
            inArray(memoryBuildJob.status, ["pending", "failed"]),
          ),
        )
        .returning({ id: memoryBuildJob.id });
      if (claimed.length === 0) {
        return;
      }
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
        const sourceContentHash = sha256(sourceContent);
        const contextLabel = buildMemoryContextLabel({
          sourceType: job.targetType,
          title: source.title,
        });
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
            const indexText = buildMemoryChunkIndexText({
              contextLabel,
              content: chunkItem.content,
            });
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
              indexText,
              indexTextHash: sha256(indexText),
              contextLabel,
              sourceContentHash,
              startOffset: chunkItem.startOffset,
              endOffset: chunkItem.endOffset,
              paragraphStartIndex: chunkItem.paragraphStartIndex,
              paragraphEndIndex: chunkItem.paragraphEndIndex,
              tokenCount: estimateTokenCountFromChars(chunkItem.content),
              createdAt: now,
              updatedAt: now,
            }).run();
            tx.run(
              sql`INSERT INTO "MemoryChunkFts" ("chunkId","projectId","chapterId","content")
                  VALUES (${chunkId}, ${source.projectId}, ${source.chapterId ?? null}, ${indexText});`,
            );
          }

          if (chunks.length > 0) {
            tx.run(
              sql`INSERT OR IGNORE INTO "MemoryEpisodeExtractionJob"
                  ("id","projectId","sourceType","sourceId","sourceContentHash","extractorVersion","status","priority","attempts","createdAt","updatedAt")
                  VALUES (
                    ${crypto.randomUUID()},
                    ${source.projectId},
                    ${job.targetType},
                    ${job.targetId},
                    ${sourceContentHash},
                    ${EPISODE_EXTRACTOR_VERSION},
                    'pending',
                    ${EPISODE_EXTRACTION_PRIORITY},
                    0,
                    ${now},
                    ${now}
                  );`,
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
