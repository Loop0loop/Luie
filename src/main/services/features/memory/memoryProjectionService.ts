import crypto from "node:crypto";
import { and, asc, eq, notInArray, sql } from "drizzle-orm";
import { db } from "../../../infra/database/index.js";
import { memoryBuildJob, memoryChunk } from "../../../infra/database/index.js";
import { createLogger } from "../../../../shared/logger/index.js";
import { MEMORY_JOB_TYPES, MEMORY_TARGET_TYPES } from "./memoryJobConstants.js";
import { upsertMemoryBuildJob } from "./memoryBuildJobEnqueue.js";
import { claimMemoryBuildJob } from "./jobControl.js";
import { chunkText, sha256 } from "./projection/chunking.js";
import {
  MAX_JOB_ATTEMPTS,
  retryableMemoryBuildJobCondition,
} from "./projection/jobPolicy.js";
import { collectMemorySourceRows } from "./projection/sourceRows.js";

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
    upsertMemoryBuildJob({
      client,
      projectId: input.projectId,
      targetType: MEMORY_TARGET_TYPES.CHAPTER,
      targetId: input.chapterId,
      jobType: MEMORY_JOB_TYPES.REBUILD_CHUNKS,
      priority: input.priority ?? 100,
      now,
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
      retryableMemoryBuildJobCondition(),
    ];
    if (input.sourceType) {
      jobFilters.push(eq(memoryBuildJob.targetType, input.sourceType));
    }
    if (input.sourceId) {
      jobFilters.push(eq(memoryBuildJob.targetId, input.sourceId));
    }
    const jobs = await client
      .select()
      .from(memoryBuildJob)
      .where(and(...jobFilters))
      .orderBy(asc(memoryBuildJob.priority), asc(memoryBuildJob.createdAt))
      .limit(limit);

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
      // NOTE: 각 job의 원자성은 유지하되 event loop 독점을 피하려고 job 사이에 양보한다.
      await new Promise<void>((resolve) => setImmediate(resolve));
      const now = new Date().toISOString();
      const claimed = await claimMemoryBuildJob({ jobId: job.id, nowIso: now });
      if (!claimed.claimed) {
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
        const sourceContent = String(
          source.bodyContent ?? source.content ?? "",
        );
        const sourceContentHash = sha256(sourceContent);
        const title = source.title?.trim();
        const contextLabel = title ? `${job.targetType}: ${title}` : null;
        const chunks = chunkText(sourceContent);
        const existingChunks = await client
          .select()
          .from(memoryChunk)
          .where(
            and(
              eq(memoryChunk.sourceType, job.targetType),
              eq(memoryChunk.sourceId, job.targetId),
            ),
          )
          .orderBy(asc(memoryChunk.chunkIndex));
        const reusableByHash = new Map<string, typeof existingChunks>();
        for (const existing of existingChunks) {
          const key = `${existing.contentHash}:${existing.indexTextHash}`;
          const matches = reusableByHash.get(key);
          if (matches) matches.push(existing);
          else reusableByHash.set(key, [existing]);
        }
        const nextChunks = chunks.map((chunkItem, index) => {
          const indexText = contextLabel
            ? `[${contextLabel}]\n${chunkItem.content}`
            : chunkItem.content;
          const contentHash = sha256(chunkItem.content);
          const indexTextHash = sha256(indexText);
          const reusable = reusableByHash
            .get(`${contentHash}:${indexTextHash}`)
            ?.shift();
          return {
            ...chunkItem,
            id: reusable?.id ?? crypto.randomUUID(),
            createdAt: reusable?.createdAt ?? now,
            index,
            indexText,
            contentHash,
            indexTextHash,
          };
        });
        const retainedIds = nextChunks.map((chunkItem) => chunkItem.id);

        client.transaction((tx) => {
          tx.run(
            sql`DELETE FROM "MemoryChunkFts"
                WHERE "chunkId" IN (
                  SELECT "id" FROM "MemoryChunk"
                  WHERE "sourceType" = ${job.targetType} AND "sourceId" = ${job.targetId}
                );`,
          );
          if (existingChunks.length > 0) {
            tx.update(memoryChunk)
              .set({ chunkIndex: sql`-${memoryChunk.chunkIndex} - 1` })
              .where(
                and(
                  eq(memoryChunk.sourceType, job.targetType),
                  eq(memoryChunk.sourceId, job.targetId),
                ),
              )
              .run();
            const obsoleteFilter = and(
              eq(memoryChunk.sourceType, job.targetType),
              eq(memoryChunk.sourceId, job.targetId),
              ...(retainedIds.length > 0
                ? [notInArray(memoryChunk.id, retainedIds)]
                : []),
            );
            tx.delete(memoryChunk).where(obsoleteFilter).run();
          }

          for (const chunkItem of nextChunks) {
            tx.insert(memoryChunk)
              .values({
                id: chunkItem.id,
                projectId: source.projectId,
                sourceType: job.targetType,
                sourceId: job.targetId,
                chapterId: source.chapterId ?? null,
                sceneId: source.sceneId ?? null,
                chunkIndex: chunkItem.index,
                content: chunkItem.content,
                contentHash: chunkItem.contentHash,
                indexText: chunkItem.indexText,
                indexTextHash: chunkItem.indexTextHash,
                contextLabel,
                sourceContentHash,
                startOffset: chunkItem.startOffset,
                endOffset: chunkItem.endOffset,
                paragraphStartIndex: chunkItem.paragraphStartIndex,
                paragraphEndIndex: chunkItem.paragraphEndIndex,
                tokenCount: chunkItem.content.length,
                createdAt: chunkItem.createdAt,
                updatedAt: now,
              })
              .onConflictDoUpdate({
                target: memoryChunk.id,
                set: {
                  projectId: source.projectId,
                  sourceType: job.targetType,
                  sourceId: job.targetId,
                  chapterId: source.chapterId ?? null,
                  sceneId: source.sceneId ?? null,
                  chunkIndex: chunkItem.index,
                  content: chunkItem.content,
                  contentHash: chunkItem.contentHash,
                  indexText: chunkItem.indexText,
                  indexTextHash: chunkItem.indexTextHash,
                  contextLabel,
                  sourceContentHash,
                  startOffset: chunkItem.startOffset,
                  endOffset: chunkItem.endOffset,
                  paragraphStartIndex: chunkItem.paragraphStartIndex,
                  paragraphEndIndex: chunkItem.paragraphEndIndex,
                  tokenCount: chunkItem.content.length,
                  updatedAt: now,
                },
              })
              .run();
            tx.run(
              sql`INSERT INTO "MemoryChunkFts" ("chunkId","projectId","chapterId","content")
                  VALUES (${chunkItem.id}, ${source.projectId}, ${source.chapterId ?? null}, ${chunkItem.indexText});`,
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

          tx.update(memoryBuildJob)
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
