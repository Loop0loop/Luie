import { and, desc, eq, sql } from "drizzle-orm";
import { db, memoryEpisode, memoryEpisodeEvidence } from "../../../../infra/database/index.js";
import type {
  MemoryEpisodeRejectInput,
  MemoryEpisodeRejectResult,
  MemoryEpisodeReviewQueueInput,
  MemoryEpisodeReviewQueueResult,
} from "../../../../../shared/types/search.js";

export async function listSuggestedMemoryEpisodes(
  input: MemoryEpisodeReviewQueueInput,
): Promise<MemoryEpisodeReviewQueueResult> {
  const limit = Math.max(1, Math.min(input.limit ?? 50, 200));
  const rows = await db
    .getClient()
    .select({
      id: memoryEpisode.id,
      projectId: memoryEpisode.projectId,
      sourceType: memoryEpisode.sourceType,
      sourceId: memoryEpisode.sourceId,
      chapterId: memoryEpisode.chapterId,
      sceneId: memoryEpisode.sceneId,
      episodeType: memoryEpisode.episodeType,
      title: memoryEpisode.title,
      summary: memoryEpisode.summary,
      status: memoryEpisode.status,
      confidence: memoryEpisode.confidence,
      createdAt: memoryEpisode.createdAt,
      updatedAt: memoryEpisode.updatedAt,
      evidenceCount: sql<number>`count(${memoryEpisodeEvidence.id})`,
    })
    .from(memoryEpisode)
    .leftJoin(memoryEpisodeEvidence, eq(memoryEpisodeEvidence.episodeId, memoryEpisode.id))
    .where(and(eq(memoryEpisode.projectId, input.projectId), eq(memoryEpisode.status, "suggested")))
    .groupBy(memoryEpisode.id)
    .orderBy(desc(memoryEpisode.updatedAt))
    .limit(limit);

  return {
    items: rows.map((row) => ({
      ...row,
      evidenceCount: Number(row.evidenceCount ?? 0),
    })),
  };
}

export async function rejectMemoryEpisode(
  input: MemoryEpisodeRejectInput & { nowIso?: string },
): Promise<MemoryEpisodeRejectResult> {
  const reason = input.reason.trim();
  if (reason.length === 0) {
    throw new Error("MEMORY_EPISODE_REJECTION_REASON_REQUIRED");
  }
  const updated = await db
    .getClient()
    .update(memoryEpisode)
    .set({
      status: "rejected",
      rejectedAt: input.nowIso ?? new Date().toISOString(),
      rejectionReason: reason,
      updatedAt: input.nowIso ?? new Date().toISOString(),
    })
    .where(
      and(
        eq(memoryEpisode.projectId, input.projectId),
        eq(memoryEpisode.id, input.episodeId),
        eq(memoryEpisode.status, "suggested"),
      ),
    );

  return { updated: updated.changes > 0 };
}
