import crypto from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../../../database/index.js";
import { chapter, chapterBody, memoryBuildJob, memoryChunk } from "../../../database/schema.js";
import { createLogger } from "../../../../shared/logger/index.js";

const logger = createLogger("MemoryProjectionService");

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function chunkText(input: string, chunkSize = 1000): Array<{
  content: string;
  startOffset: number;
  endOffset: number;
}> {
  const chunks: Array<{ content: string; startOffset: number; endOffset: number }> = [];
  let start = 0;
  while (start < input.length) {
    const end = Math.min(input.length, start + chunkSize);
    const content = input.slice(start, end);
    chunks.push({ content, startOffset: start, endOffset: end });
    start = end;
  }
  return chunks;
}

class MemoryProjectionService {
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
    const jobs = await client
      .select()
      .from(memoryBuildJob)
      .where(
        and(
          eq(memoryBuildJob.projectId, input.projectId),
          eq(memoryBuildJob.status, "pending"),
          eq(memoryBuildJob.jobType, "rebuild_chunks"),
          eq(memoryBuildJob.targetType, input.sourceType ?? "chapter"),
          input.sourceId
            ? eq(memoryBuildJob.targetId, input.sourceId)
            : eq(memoryBuildJob.targetType, "chapter"),
        ),
      )
      .orderBy(asc(memoryBuildJob.priority), asc(memoryBuildJob.createdAt))
      .limit(limit);

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
    for (const job of jobs) {
      const now = new Date().toISOString();
      const source = chapterMap.get(job.targetId);
      if (!source) {
        await client
          .update(memoryBuildJob)
          .set({
            status: "failed",
            attempts: job.attempts + 1,
            error: "SOURCE_NOT_FOUND",
            updatedAt: now,
          })
          .where(eq(memoryBuildJob.id, job.id));
        continue;
      }

      const sourceContent = String(source.bodyContent ?? source.content ?? "");
      const chunks = chunkText(sourceContent, 1000);

      await client.transaction(async (tx) => {
        await tx
          .delete(memoryChunk)
          .where(
            and(
              eq(memoryChunk.sourceType, "chapter"),
              eq(memoryChunk.sourceId, job.targetId),
            ),
          );

        for (let index = 0; index < chunks.length; index++) {
          const chunkItem = chunks[index];
          await tx.insert(memoryChunk).values({
            id: crypto.randomUUID(),
            projectId: source.projectId,
            sourceType: "chapter",
            sourceId: job.targetId,
            chapterId: job.targetId,
            chunkIndex: index,
            content: chunkItem.content,
            contentHash: sha256(chunkItem.content),
            startOffset: chunkItem.startOffset,
            endOffset: chunkItem.endOffset,
            tokenCount: chunkItem.content.length,
            createdAt: now,
            updatedAt: now,
          });
        }

        await tx
          .update(memoryBuildJob)
          .set({
            status: "completed",
            attempts: job.attempts + 1,
            error: null,
            updatedAt: now,
          })
          .where(eq(memoryBuildJob.id, job.id));
      });
      processed += 1;
    }

    logger.info("Processed memory chunk jobs", {
      projectId: input.projectId,
      queued: jobs.length,
      processed,
    });

    return { queued: jobs.length, processed };
  }
}

export const memoryProjectionService = new MemoryProjectionService();
