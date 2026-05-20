import crypto from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../../database/index.js";
import { chapter, chapterBody, chapterSummary, memoryBuildJob } from "../../../database/schema.js";
import { createLogger } from "../../../../shared/logger/index.js";
import { resolveModelRuntimeClient } from "../../llm/modelRuntimeFactory.js";
import { MEMORY_JOB_TYPES, MEMORY_TARGET_TYPES } from "./memoryJobConstants.js";
import {
  DERIVED_JOB_MAX_ATTEMPTS,
  DERIVED_JOB_RETRY_BASE_BACKOFF_MS,
} from "../../../constants/memory.js";

const logger = createLogger("ChapterSummaryProjector");

function canRetry(job: { status: string; attempts: number; updatedAt: string }): boolean {
  if (job.status === "pending") return true;
  if (job.status !== "failed") return false;
  if (job.attempts >= DERIVED_JOB_MAX_ATTEMPTS) return false;
  const updatedAtMs = Date.parse(job.updatedAt);
  if (!Number.isFinite(updatedAtMs)) return true;
  const backoffMs = DERIVED_JOB_RETRY_BASE_BACKOFF_MS * Math.max(1, job.attempts);
  return Date.now() - updatedAtMs >= backoffMs;
}

function trimTo200Chars(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length <= 200 ? normalized : `${normalized.slice(0, 200)}...`;
}

function buildSummaryPrompt(content: string): string {
  return [
    "다음 소설 텍스트를 200자 이내로 요약하세요.",
    "등장인물, 사건, 감정 변화를 중심으로 간결하게 작성하세요.",
    "",
    "텍스트:",
    content.slice(0, 2000),
    "",
    "요약:",
  ].join("\n");
}

function computeContentHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export class ChapterSummaryProjector {
  async processPendingSummaryJobs(input: {
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
          eq(memoryBuildJob.jobType, MEMORY_JOB_TYPES.REBUILD_SUMMARY),
          inArray(memoryBuildJob.status, ["pending", "failed"]),
          eq(memoryBuildJob.targetType, MEMORY_TARGET_TYPES.CHAPTER),
        ),
      )
      .orderBy(asc(memoryBuildJob.priority), asc(memoryBuildJob.createdAt))
      .limit(Math.max(limit * 3, 10));

    const jobs = candidates.filter((job) => canRetry(job)).slice(0, limit);
    if (jobs.length === 0) return { queued: 0, processed: 0 };

    const chapterIds = jobs.map((job) => job.targetId);
    const sourceRows = await client
      .select({
        chapterId: chapter.id,
        projectId: chapter.projectId,
        chapterNumber: chapter.order,
        chapterContent: chapter.content,
        bodyContent: chapterBody.content,
      })
      .from(chapter)
      .leftJoin(chapterBody, eq(chapterBody.chapterId, chapter.id))
      .where(inArray(chapter.id, chapterIds));
    const sourceMap = new Map(sourceRows.map((row) => [row.chapterId, row]));
    const existingSummaries = await client
      .select({
        chapterId: chapterSummary.chapterId,
        contentHash: chapterSummary.contentHash,
      })
      .from(chapterSummary)
      .where(inArray(chapterSummary.chapterId, chapterIds));
    const existingSummaryHashMap = new Map(
      existingSummaries.map((row) => [row.chapterId, row.contentHash ?? ""]),
    );
    const runtime = await resolveModelRuntimeClient(input.projectId);
    const runtimeAvailable = await runtime.isAvailable();
    // For llamacpp: skip if model not yet in RAM — cold load from background
    // would silently consume gigabytes of RAM.
    // For llamaserver/deterministic: always process (use fallback if unavailable).
    if (runtime.providerName === "llamacpp" && !runtime.isModelLoaded()) {
      return { queued: jobs.length, processed: 0 };
    }

    let processed = 0;
    for (const job of jobs) {
      const now = new Date().toISOString();
      await client
        .update(memoryBuildJob)
        .set({ status: "running", updatedAt: now })
        .where(eq(memoryBuildJob.id, job.id));

      const source = sourceMap.get(job.targetId);
      if (!source) {
        const attempts = job.attempts + 1;
        await client
          .update(memoryBuildJob)
          .set({
            status: attempts >= DERIVED_JOB_MAX_ATTEMPTS ? "failed" : "pending",
            attempts,
            error: "SOURCE_NOT_FOUND",
            updatedAt: now,
          })
          .where(eq(memoryBuildJob.id, job.id));
        continue;
      }

      try {
        const content = String(source.bodyContent ?? source.chapterContent ?? "");
        const contentHash = computeContentHash(content);
        const existingContentHash = existingSummaryHashMap.get(source.chapterId);
        if (existingContentHash && existingContentHash === contentHash) {
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
        let summary: string;
        let modelName: string | null = null;
        let isFallback = false;

        if (runtimeAvailable && runtime.providerName !== "deterministic") {
          summary = trimTo200Chars(await runtime.generate(buildSummaryPrompt(content), {
            maxTokens: 256,
            temperature: 0.2,
          }));
          modelName = runtime.providerName;
          isFallback = false;
        } else {
          summary = trimTo200Chars(content.slice(0, 500));
          isFallback = true;
          modelName = null;
        }

        await client
          .insert(chapterSummary)
          .values({
            id: crypto.randomUUID(),
            projectId: source.projectId,
            chapterId: source.chapterId,
            chapterNumber: source.chapterNumber,
            summary,
            contentHash,
            isFallback,
            model: modelName,
            generatedAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [chapterSummary.chapterId],
            set: {
              projectId: source.projectId,
              chapterNumber: source.chapterNumber,
              summary,
              contentHash,
              isFallback,
              model: modelName,
              generatedAt: now,
              updatedAt: now,
            },
          });

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
            status: attempts >= DERIVED_JOB_MAX_ATTEMPTS ? "failed" : "pending",
            attempts,
            error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
            updatedAt: now,
          })
          .where(eq(memoryBuildJob.id, job.id));
      }
    }
    logger.info("Processed chapter summary jobs", {
      projectId: input.projectId,
      queued: jobs.length,
      processed,
    });
    return { queued: jobs.length, processed };
  }

  async getChapterSummary(chapterId: string): Promise<{
    chapterId: string;
    summary: string;
    isFallback: boolean;
    model: string | null;
    generatedAt: string;
  } | null> {
    const rows = await db.getClient()
      .select({
        chapterId: chapterSummary.chapterId,
        summary: chapterSummary.summary,
        isFallback: chapterSummary.isFallback,
        model: chapterSummary.model,
        generatedAt: chapterSummary.generatedAt,
      })
      .from(chapterSummary)
      .where(eq(chapterSummary.chapterId, chapterId))
      .limit(1);
    if (rows.length === 0) return null;
    return rows[0];
  }

  async getSummaryStatus(projectId: string): Promise<{
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
          eq(memoryBuildJob.jobType, MEMORY_JOB_TYPES.REBUILD_SUMMARY),
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

export const chapterSummaryProjector = new ChapterSummaryProjector();
