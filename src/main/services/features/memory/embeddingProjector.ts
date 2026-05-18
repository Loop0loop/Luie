import crypto from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../../database/index.js";
import { memoryBuildJob, memoryChunk, memoryEmbedding } from "../../../database/schema.js";
import { createLogger } from "../../../../shared/logger/index.js";
import { resolveModelRuntimeClient } from "../../llm/modelRuntimeFactory.js";

const logger = createLogger("EmbeddingProjector");
const MAX_ATTEMPTS = 3;
const RETRY_BASE_BACKOFF_MS = 3_000;

function canRetry(job: { status: string; attempts: number; updatedAt: string }): boolean {
  if (job.status === "pending") return true;
  if (job.status !== "failed") return false;
  if (job.attempts >= MAX_ATTEMPTS) return false;
  const updatedAtMs = Date.parse(job.updatedAt);
  if (!Number.isFinite(updatedAtMs)) return true;
  const backoffMs = RETRY_BASE_BACKOFF_MS * Math.max(1, job.attempts);
  return Date.now() - updatedAtMs >= backoffMs;
}

function vectorToBuffer(vector: Float32Array): Buffer {
  return Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);
}

export class EmbeddingProjector {
  async processPendingEmbeddingJobs(input: {
    projectId: string;
    limit?: number;
  }): Promise<{ queued: number; processed: number }> {
    const client = db.getClient();
    const limit = input.limit ?? 1;
    const candidates = await client
      .select()
      .from(memoryBuildJob)
      .where(
        and(
          eq(memoryBuildJob.projectId, input.projectId),
          eq(memoryBuildJob.jobType, "rebuild_embedding"),
          inArray(memoryBuildJob.status, ["pending", "failed"]),
          eq(memoryBuildJob.targetType, "chapter"),
        ),
      )
      .orderBy(asc(memoryBuildJob.priority), asc(memoryBuildJob.createdAt))
      .limit(Math.max(limit * 3, 10));

    const jobs = candidates.filter((job) => canRetry(job)).slice(0, limit);
    if (jobs.length === 0) return { queued: 0, processed: 0 };

    const runtime = await resolveModelRuntimeClient(input.projectId);
    const runtimeAvailable = await runtime.isAvailable();
    const now = new Date().toISOString();
    let processed = 0;

    for (const job of jobs) {
      await client
        .update(memoryBuildJob)
        .set({ status: "running", updatedAt: now })
        .where(eq(memoryBuildJob.id, job.id));

      try {
        if (!runtimeAvailable) {
          await client
            .update(memoryBuildJob)
            .set({
              status: "completed",
              attempts: job.attempts + 1,
              error: null,
              updatedAt: now,
            })
            .where(eq(memoryBuildJob.id, job.id));
          processed += 1;
          continue;
        }

        const chunkRows = await client
          .select({
            chunkId: memoryChunk.id,
            projectId: memoryChunk.projectId,
            chapterId: memoryChunk.chapterId,
            content: memoryChunk.content,
            contentHash: memoryChunk.contentHash,
          })
          .from(memoryChunk)
          .where(
            and(
              eq(memoryChunk.projectId, input.projectId),
              eq(memoryChunk.sourceType, "chapter"),
              eq(memoryChunk.sourceId, job.targetId),
            ),
          )
          .orderBy(asc(memoryChunk.chunkIndex));

        if (chunkRows.length === 0) {
          await client
            .update(memoryBuildJob)
            .set({
              status: "completed",
              attempts: job.attempts + 1,
              error: null,
              updatedAt: now,
            })
            .where(eq(memoryBuildJob.id, job.id));
          processed += 1;
          continue;
        }

        const existingRows = await client
          .select({
            chunkId: memoryEmbedding.chunkId,
            contentHash: memoryEmbedding.contentHash,
          })
          .from(memoryEmbedding)
          .where(inArray(memoryEmbedding.chunkId, chunkRows.map((c) => c.chunkId)));
        const existingHashMap = new Map(existingRows.map((row) => [row.chunkId, row.contentHash]));

        const changedChunks = chunkRows.filter((chunk) => existingHashMap.get(chunk.chunkId) !== chunk.contentHash);
        if (changedChunks.length > 0) {
          const vectors = await runtime.embed(changedChunks.map((chunk) => chunk.content));
          if (vectors && vectors.length > 0) {
            for (let i = 0; i < changedChunks.length; i += 1) {
              const chunk = changedChunks[i];
              const vector = vectors[i];
              if (!vector) continue;
              await client
                .insert(memoryEmbedding)
                .values({
                  id: crypto.randomUUID(),
                  chunkId: chunk.chunkId,
                  projectId: chunk.projectId,
                  contentHash: chunk.contentHash,
                  vec: vectorToBuffer(vector),
                  dimension: vector.length,
                  model: runtime.providerName,
                  createdAt: now,
                  updatedAt: now,
                })
                .onConflictDoUpdate({
                  target: [memoryEmbedding.chunkId],
                  set: {
                    projectId: chunk.projectId,
                    contentHash: chunk.contentHash,
                    vec: vectorToBuffer(vector),
                    dimension: vector.length,
                    model: runtime.providerName,
                    updatedAt: now,
                  },
                });
            }
          }
        }

        await client
          .update(memoryBuildJob)
          .set({
            status: "completed",
            attempts: job.attempts + 1,
            error: null,
            updatedAt: now,
          })
          .where(eq(memoryBuildJob.id, job.id));
        processed += 1;
      } catch (error) {
        const attempts = job.attempts + 1;
        await client
          .update(memoryBuildJob)
          .set({
            status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
            attempts,
            error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
            updatedAt: now,
          })
          .where(eq(memoryBuildJob.id, job.id));
      }
    }

    logger.info("Processed embedding jobs", {
      projectId: input.projectId,
      queued: jobs.length,
      processed,
    });

    return { queued: jobs.length, processed };
  }

  async getEmbeddingStatus(projectId: string): Promise<{
    projectId: string;
    pendingCount: number;
    runningCount: number;
    failedCount: number;
    completedCount: number;
  }> {
    const rows = await db.getClient()
      .select({
        status: memoryBuildJob.status,
        count: sql<number>`count(*)`,
      })
      .from(memoryBuildJob)
      .where(
        and(
          eq(memoryBuildJob.projectId, projectId),
          eq(memoryBuildJob.jobType, "rebuild_embedding"),
        ),
      )
      .groupBy(memoryBuildJob.status);
    const grouped = new Map(rows.map((row) => [row.status, Number(row.count ?? 0)]));
    return {
      projectId,
      pendingCount: grouped.get("pending") ?? 0,
      runningCount: grouped.get("running") ?? 0,
      failedCount: grouped.get("failed") ?? 0,
      completedCount: grouped.get("completed") ?? 0,
    };
  }
}

export const embeddingProjector = new EmbeddingProjector();
