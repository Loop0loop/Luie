import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  memoryEpisode,
  memoryEpisodeEvidence,
} from "../../../../infra/database/index.js";
import type {
  MemoryEpisodeConfirmInput,
  MemoryEpisodeRejectInput,
  MemoryEpisodeRejectResult,
  MemoryEpisodeReviewQueueInput,
  MemoryEpisodeReviewMutationResult,
  MemoryEpisodeReviewQueueResult,
} from "../../../../../shared/types/search.js";

type EpisodeEvidenceState = {
  hasEvidence: number;
};

function assertMemoryEpisodeHasEvidence(state: EpisodeEvidenceState): void {
  if (Number(state.hasEvidence) !== 1) {
    throw new Error("MEMORY_EPISODE_EVIDENCE_REQUIRED");
  }
}

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
      provenanceKind: memoryEpisode.provenanceKind,
      canonStatus: memoryEpisode.canonStatus,
      confidence: memoryEpisode.confidence,
      createdAt: memoryEpisode.createdAt,
      updatedAt: memoryEpisode.updatedAt,
      evidenceCount: sql<number>`count(${memoryEpisodeEvidence.id})`,
    })
    .from(memoryEpisode)
    .leftJoin(
      memoryEpisodeEvidence,
      eq(memoryEpisodeEvidence.episodeId, memoryEpisode.id),
    )
    .where(
      and(
        eq(memoryEpisode.projectId, input.projectId),
        eq(memoryEpisode.status, "suggested"),
      ),
    )
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

export async function confirmMemoryEpisode(
  input: MemoryEpisodeConfirmInput & { nowIso?: string },
): Promise<MemoryEpisodeReviewMutationResult> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const updated = db.getClient().transaction((tx) => {
    const [candidate] = tx.all<EpisodeEvidenceState>(sql`
      SELECT EXISTS (
        SELECT 1
        FROM "MemoryEpisodeEvidence" evidence
        WHERE evidence."projectId" = episode."projectId"
          AND evidence."episodeId" = episode."id"
          AND trim(episode."sourceContentHash") <> ''
          AND trim(evidence."contentHash") <> ''
          AND trim(evidence."sourceContentHash") <> ''
          AND trim(evidence."quote") <> ''
      ) AS "hasEvidence"
      FROM "MemoryEpisode" episode
      WHERE episode."projectId" = ${input.projectId}
        AND episode."id" = ${input.episodeId}
        AND episode."status" = 'suggested'
      LIMIT 1;
    `);
    if (!candidate) return false;
    assertMemoryEpisodeHasEvidence(candidate);
    const result = tx
      .update(memoryEpisode)
      .set({
        status: "confirmed",
        rejectedAt: null,
        rejectionReason: null,
        updatedAt: nowIso,
      })
      .where(
        and(
          eq(memoryEpisode.projectId, input.projectId),
          eq(memoryEpisode.id, input.episodeId),
          eq(memoryEpisode.status, "suggested"),
        ),
      )
      .run();
    return result.changes > 0;
  });

  return {
    updated,
    status: updated ? "confirmed" : undefined,
    canonicalExportable: updated,
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
