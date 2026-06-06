import crypto from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../../infra/database/index.js";
import { memoryBuildJob, memoryChunk, memoryEmbedding } from "../../../infra/database/index.js";
import { createLogger } from "../../../../shared/logger/index.js";
import { utilityProcessBridge } from "../utility/utilityProcessBridge.js";
import { MEMORY_JOB_TYPES } from "./memoryJobConstants.js";
import { resolveRuntimeModelConfig } from "../../llm/modelRuntimeFactory.js";
import {
  DERIVED_JOB_MAX_ATTEMPTS,
  DERIVED_JOB_RETRY_BASE_BACKOFF_MS,
} from "../../../constants/memory.js";

const logger = createLogger("EmbeddingProjector");
const RUNNING_STALE_MS = 5 * 60_000;

function canRetry(job: { status: string; attempts: number; updatedAt: string }): boolean {
  if (job.status === "pending") return true;
  if (job.status !== "failed") return false;
  if (job.attempts >= DERIVED_JOB_MAX_ATTEMPTS) return false;
  const updatedAtMs = Date.parse(job.updatedAt);
  if (!Number.isFinite(updatedAtMs)) return true;
  const backoffMs = DERIVED_JOB_RETRY_BASE_BACKOFF_MS * Math.max(1, job.attempts);
  return Date.now() - updatedAtMs >= backoffMs;
}

function vectorToBuffer(vector: Float32Array): Buffer {
  return Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);
}

function validateEmbeddingVector(vector: Float32Array): void {
  if (!Number.isFinite(vector.length) || vector.length <= 0) {
    throw new Error("INVALID_EMBEDDING_DIMENSION");
  }
  if (vector.byteLength !== vector.length * Float32Array.BYTES_PER_ELEMENT) {
    throw new Error("EMBEDDING_VECTOR_BYTE_LENGTH_MISMATCH");
  }
}

function buildEmbeddingModelSignature(input: {
  providerHint: "gemini" | "openai" | "externalapi" | "deterministic";
  embeddingModel: string | null;
}): string {
  return `${input.providerHint}:${input.embeddingModel ?? "shared-main-model"}`;
}

export class EmbeddingProjector {
  async processPendingEmbeddingJobs(input: {
    projectId: string;
    limit?: number;
  }): Promise<{ queued: number; processed: number }> {
    const client = db.getClient();
    const staleRunningCutoffIso = new Date(Date.now() - RUNNING_STALE_MS).toISOString();
    await client
      .update(memoryBuildJob)
      .set({
        status: "pending",
        error: "RECOVERED_STALE_RUNNING_JOB",
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(memoryBuildJob.projectId, input.projectId),
          eq(memoryBuildJob.jobType, MEMORY_JOB_TYPES.REBUILD_EMBEDDING),
          eq(memoryBuildJob.status, "running"),
          sql`${memoryBuildJob.updatedAt} <= ${staleRunningCutoffIso}`,
        ),
      );

    const limit = input.limit ?? 1;
    const candidates = await client
      .select()
      .from(memoryBuildJob)
      .where(
        and(
          eq(memoryBuildJob.projectId, input.projectId),
          eq(memoryBuildJob.jobType, MEMORY_JOB_TYPES.REBUILD_EMBEDDING),
          inArray(memoryBuildJob.status, ["pending", "failed"]),
        ),
      )
      .orderBy(asc(memoryBuildJob.priority), asc(memoryBuildJob.createdAt))
      .limit(Math.max(limit * 3, 10));

    const jobs = candidates.filter((job) => canRetry(job)).slice(0, limit);
    if (jobs.length === 0) return { queued: 0, processed: 0 };

    const runtimeConfig = await resolveRuntimeModelConfig(input.projectId);
    const expectedModelSignature = buildEmbeddingModelSignature({
      providerHint: runtimeConfig.providerHint,
      embeddingModel: runtimeConfig.embeddingModel,
    });
    let processed = 0;
    const claimedJobs: typeof jobs = [];
    const now = new Date().toISOString();

    /* eslint-disable no-await-in-loop -- jobs are claimed sequentially to preserve retry/status ordering. */
    for (const job of jobs) {
      const claimed = await client
        .update(memoryBuildJob)
        .set({ status: "running", updatedAt: now })
        .where(
          and(
            eq(memoryBuildJob.id, job.id),
            inArray(memoryBuildJob.status, ["pending", "failed"]),
          ),
        )
        .returning({ id: memoryBuildJob.id });
      if (claimed.length === 0) {
        continue;
      }
      claimedJobs.push(job);
    }
    /* eslint-enable no-await-in-loop */

    if (claimedJobs.length === 0) {
      return { queued: jobs.length, processed: 0 };
    }

    const chunkRowsByJobId = new Map<
      string,
      Array<{
        chunkId: string;
        projectId: string;
        chapterId: string | null;
        content: string;
        contentHash: string;
      }>
    >();
    for (const job of claimedJobs) {
      chunkRowsByJobId.set(job.id, []);
    }

    /* eslint-disable no-await-in-loop -- chunk reads are sequenced per claimed job to keep job/chunk attribution explicit. */
    for (const job of claimedJobs) {
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
            eq(memoryChunk.sourceType, job.targetType),
            eq(memoryChunk.sourceId, job.targetId),
          ),
        )
        .orderBy(asc(memoryChunk.chunkIndex));
      chunkRowsByJobId.set(job.id, chunkRows);
    }
    /* eslint-enable no-await-in-loop */

    const jobsWithoutChunks = claimedJobs.filter(
      (job) => (chunkRowsByJobId.get(job.id)?.length ?? 0) === 0,
    );
    if (jobsWithoutChunks.length > 0) {
      await client
        .update(memoryBuildJob)
        .set({
          status: "pending",
          updatedAt: now,
        })
        .where(inArray(memoryBuildJob.id, jobsWithoutChunks.map((job) => job.id)));
    }

    const readyJobs = claimedJobs.filter(
      (job) => (chunkRowsByJobId.get(job.id)?.length ?? 0) > 0,
    );
    if (readyJobs.length === 0) {
      return { queued: jobs.length, processed: 0 };
    }

    const allChunkRows = readyJobs.flatMap((job) => chunkRowsByJobId.get(job.id) ?? []);
    const existingRows = await client
      .select({
        chunkId: memoryEmbedding.chunkId,
        contentHash: memoryEmbedding.contentHash,
        model: memoryEmbedding.model,
      })
      .from(memoryEmbedding)
      .where(inArray(memoryEmbedding.chunkId, allChunkRows.map((c) => c.chunkId)));
    const existingHashMap = new Map(existingRows.map((row) => [row.chunkId, row.contentHash]));
    const existingModelMap = new Map(existingRows.map((row) => [row.chunkId, row.model ?? ""]));

    const changedChunksByJobId = new Map<string, typeof allChunkRows>();
    for (const job of readyJobs) {
      const changedChunks = (chunkRowsByJobId.get(job.id) ?? []).filter((chunk) => {
        const hashChanged = existingHashMap.get(chunk.chunkId) !== chunk.contentHash;
        const modelChanged = existingModelMap.get(chunk.chunkId) !== expectedModelSignature;
        return hashChanged || modelChanged;
      });
      changedChunksByJobId.set(job.id, changedChunks);
    }

    const changedChunks = readyJobs.flatMap(
      (job) => changedChunksByJobId.get(job.id) ?? [],
    );

    try {
      if (changedChunks.length > 0) {
        const vectorsRaw = await utilityProcessBridge.embed(
          input.projectId,
          changedChunks.map((chunk) => chunk.content),
        );
        if (!vectorsRaw) {
          logger.info("Embedding skipped: provider does not support embeddings", {
            projectId: input.projectId,
            jobCount: readyJobs.length,
            changedChunkCount: changedChunks.length,
            provider: runtimeConfig.providerHint,
          });
          await client
            .update(memoryBuildJob)
            .set({
              status: "skipped",
              attempts: sql`${memoryBuildJob.attempts} + 1`,
              error: null,
              updatedAt: now,
            })
            .where(inArray(memoryBuildJob.id, readyJobs.map((job) => job.id)));
          return { queued: jobs.length, processed: readyJobs.length };
        }
        const vectors = vectorsRaw.map((row) => Float32Array.from(row));
        if (vectors.length === 0) {
          logger.warn("Embedding returned empty vectors; skipping this batch", {
            projectId: input.projectId,
            jobCount: readyJobs.length,
            changedChunkCount: changedChunks.length,
            provider: runtimeConfig.providerHint,
          });
          await client
            .update(memoryBuildJob)
            .set({
              status: "skipped",
              attempts: sql`${memoryBuildJob.attempts} + 1`,
              error: null,
              updatedAt: now,
            })
            .where(inArray(memoryBuildJob.id, readyJobs.map((job) => job.id)));
          return { queued: jobs.length, processed: readyJobs.length };
        }
        if (vectors.length !== changedChunks.length) {
          throw new Error(
            `EMBEDDING_VECTOR_COUNT_MISMATCH:${vectors.length}/${changedChunks.length}`,
          );
        }
        /* eslint-disable no-await-in-loop -- embedding upserts are sequenced to preserve chunk/vector pairing. */
        for (let i = 0; i < changedChunks.length; i += 1) {
          const chunk = changedChunks[i];
          const vector = vectors[i];
          validateEmbeddingVector(vector);
          await client
            .insert(memoryEmbedding)
            .values({
              id: crypto.randomUUID(),
              chunkId: chunk.chunkId,
              projectId: chunk.projectId,
              contentHash: chunk.contentHash,
              vec: vectorToBuffer(vector),
              dimension: vector.length,
              model: expectedModelSignature,
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
                model: expectedModelSignature,
                updatedAt: now,
              },
            });
        }
        /* eslint-enable no-await-in-loop */
      }

      const completedJobIds = readyJobs.map((job) => job.id);
      await client
        .update(memoryBuildJob)
        .set({
          status: "completed",
          attempts: sql`${memoryBuildJob.attempts} + 1`,
          error: null,
          updatedAt: now,
        })
        .where(inArray(memoryBuildJob.id, completedJobIds));
      processed = completedJobIds.length;
    } catch (error) {
      /* eslint-disable no-await-in-loop -- failed job status updates are sequenced for deterministic retry accounting. */
      for (const job of readyJobs) {
        const attempts = job.attempts + 1;
        await client
          .update(memoryBuildJob)
          .set({
            status: attempts >= DERIVED_JOB_MAX_ATTEMPTS ? "failed" : "pending",
            attempts,
            error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
            updatedAt: now,
          })
          .where(eq(memoryBuildJob.id, job.id));
      }
      /* eslint-enable no-await-in-loop */
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
    skippedCount: number;
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
          eq(memoryBuildJob.jobType, MEMORY_JOB_TYPES.REBUILD_EMBEDDING),
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
      skippedCount: grouped.get("skipped") ?? 0,
    };
  }
}

export const embeddingProjector = new EmbeddingProjector();
