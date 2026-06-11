import { alias } from "drizzle-orm/sqlite-core";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  memoryEntity,
  memoryFact,
  memoryFactEvidence,
  memoryFactInvalidation,
} from "../../../../infra/database/index.js";
import type {
  MemoryTemporalFactConfirmInput,
  MemoryTemporalFactConflictReviewInput,
  MemoryTemporalFactConflictResolveInput,
  MemoryTemporalFactRejectInput,
  MemoryTemporalFactReviewMutationResult,
  MemoryTemporalFactReviewQueueInput,
  MemoryTemporalFactReviewQueueResult,
} from "../../../../../shared/types/search.js";

type TemporalFactConfirmationState = {
  provenanceKind: string;
  canonStatus: string;
  hasEvidence: number;
};

function assertTemporalFactCanBecomeCanonical(
  state: TemporalFactConfirmationState,
): void {
  if (state.provenanceKind !== "canon" || state.canonStatus !== "canon") {
    throw new Error("MEMORY_FACT_CANON_STATUS_REQUIRED");
  }
  if (Number(state.hasEvidence) !== 1) {
    throw new Error("MEMORY_FACT_EVIDENCE_REQUIRED");
  }
}

export async function listSuggestedMemoryTemporalFacts(
  input: MemoryTemporalFactReviewQueueInput,
): Promise<MemoryTemporalFactReviewQueueResult> {
  const limit = Math.max(1, Math.min(input.limit ?? 50, 200));
  const subjectEntity = alias(memoryEntity, "subjectEntity");
  const objectEntity = alias(memoryEntity, "objectEntity");
  const rows = await db
    .getClient()
    .select({
      id: memoryFact.id,
      projectId: memoryFact.projectId,
      subjectEntityId: memoryFact.subjectEntityId,
      subjectEntityName: subjectEntity.canonicalName,
      predicate: memoryFact.predicate,
      objectEntityId: memoryFact.objectEntityId,
      objectEntityName: objectEntity.canonicalName,
      objectValue: memoryFact.objectValue,
      valueType: memoryFact.valueType,
      validFromChapterOrder: memoryFact.validFromChapterOrder,
      validToChapterOrder: memoryFact.validToChapterOrder,
      observedAtChapterOrder: memoryFact.observedAtChapterOrder,
      confidence: memoryFact.confidence,
      status: memoryFact.status,
      provenanceKind: memoryFact.provenanceKind,
      canonStatus: memoryFact.canonStatus,
      createdAt: memoryFact.createdAt,
      updatedAt: memoryFact.updatedAt,
      evidenceCount: sql<number>`count(${memoryFactEvidence.id})`,
    })
    .from(memoryFact)
    .leftJoin(
      subjectEntity,
      and(
        eq(subjectEntity.id, memoryFact.subjectEntityId),
        eq(subjectEntity.projectId, memoryFact.projectId),
      ),
    )
    .leftJoin(
      objectEntity,
      and(
        eq(objectEntity.id, memoryFact.objectEntityId),
        eq(objectEntity.projectId, memoryFact.projectId),
      ),
    )
    .leftJoin(memoryFactEvidence, eq(memoryFactEvidence.factId, memoryFact.id))
    .where(
      and(
        eq(memoryFact.projectId, input.projectId),
        eq(memoryFact.status, "suggested"),
      ),
    )
    .groupBy(memoryFact.id)
    .orderBy(desc(memoryFact.updatedAt))
    .limit(limit);

  return {
    items: rows.map((row) => ({
      ...row,
      evidenceCount: Number(row.evidenceCount ?? 0),
    })),
  };
}

export async function confirmMemoryTemporalFact(
  input: MemoryTemporalFactConfirmInput & { nowIso?: string },
): Promise<MemoryTemporalFactReviewMutationResult> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const updated = db.getClient().transaction((tx) => {
    const [candidate] = tx
      .all<TemporalFactConfirmationState>(sql`
        SELECT
          fact."provenanceKind" AS "provenanceKind",
          fact."canonStatus" AS "canonStatus",
          EXISTS (
            SELECT 1
            FROM "MemoryFactEvidence" factEvidence
            INNER JOIN "MemoryEpisodeEvidence" episodeEvidence
              ON episodeEvidence."id" = factEvidence."evidenceId"
              AND episodeEvidence."projectId" = factEvidence."projectId"
            WHERE factEvidence."projectId" = fact."projectId"
              AND factEvidence."factId" = fact."id"
              AND trim(fact."sourceContentHash") <> ''
              AND trim(episodeEvidence."sourceContentHash") <> ''
              AND trim(episodeEvidence."quote") <> ''
          ) AS "hasEvidence"
        FROM "MemoryFact" fact
        WHERE fact."projectId" = ${input.projectId}
          AND fact."id" = ${input.factId}
          AND fact."status" = 'suggested'
        LIMIT 1;
      `);
    if (!candidate) return false;
    assertTemporalFactCanBecomeCanonical(candidate);
    const result = tx
      .update(memoryFact)
      .set({
        status: "confirmed",
        rejectedAt: null,
        rejectionReason: null,
        updatedAt: nowIso,
      })
      .where(
        and(
          eq(memoryFact.projectId, input.projectId),
          eq(memoryFact.id, input.factId),
          eq(memoryFact.status, "suggested"),
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

export async function backfillLegacyConfirmedMemoryFactCanonStatus(input: {
  projectId: string;
  nowIso?: string;
}): Promise<{ updated: number }> {
  const result = await db.getClient().run(sql`
    UPDATE "MemoryFact"
    SET
      "provenanceKind" = 'canon',
      "canonStatus" = 'canon',
      "updatedAt" = ${input.nowIso ?? new Date().toISOString()}
    WHERE "projectId" = ${input.projectId}
      AND "status" = 'confirmed'
      AND "provenanceKind" = 'unknown'
      AND "canonStatus" = 'unknown'
      AND trim("sourceContentHash") <> ''
      AND EXISTS (
        SELECT 1
        FROM "MemoryFactEvidence" factEvidence
        INNER JOIN "MemoryEpisodeEvidence" episodeEvidence
          ON episodeEvidence."id" = factEvidence."evidenceId"
          AND episodeEvidence."projectId" = factEvidence."projectId"
        INNER JOIN "MemoryEpisode" episode
          ON episode."id" = episodeEvidence."episodeId"
          AND episode."projectId" = episodeEvidence."projectId"
        WHERE factEvidence."projectId" = "MemoryFact"."projectId"
          AND factEvidence."factId" = "MemoryFact"."id"
          AND episode."sourceType" IN ('chapter', 'scene')
          AND episode."status" IN ('suggested', 'confirmed')
          AND trim(episodeEvidence."sourceContentHash") <> ''
          AND trim(episodeEvidence."quote") <> ''
      );
  `);
  return { updated: result.changes };
}

export async function rejectMemoryTemporalFact(
  input: MemoryTemporalFactRejectInput & { nowIso?: string },
): Promise<MemoryTemporalFactReviewMutationResult> {
  const reason = input.reason.trim();
  if (reason.length === 0) {
    throw new Error("MEMORY_TEMPORAL_FACT_REJECTION_REASON_REQUIRED");
  }
  const updated = await db
    .getClient()
    .update(memoryFact)
    .set({
      status: "rejected",
      rejectedAt: input.nowIso ?? new Date().toISOString(),
      rejectionReason: reason,
      updatedAt: input.nowIso ?? new Date().toISOString(),
    })
    .where(
      and(
        eq(memoryFact.projectId, input.projectId),
        eq(memoryFact.id, input.factId),
        eq(memoryFact.status, "suggested"),
      ),
    );

  return { updated: updated.changes > 0 };
}

export async function resolveMemoryTemporalFactConflict(
  input: MemoryTemporalFactConflictResolveInput & { nowIso?: string },
): Promise<MemoryTemporalFactReviewMutationResult> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const reason = input.reason?.trim() || "충돌 해결";
  let updated = false;

  db.getClient().transaction((tx) => {
    const [conflict] = tx
      .select({
        invalidatedFactId: memoryFactInvalidation.invalidatedFactId,
        invalidatingFactId: memoryFactInvalidation.invalidatingFactId,
      })
      .from(memoryFactInvalidation)
      .where(
        and(
          eq(memoryFactInvalidation.projectId, input.projectId),
          eq(memoryFactInvalidation.id, input.conflictId),
        ),
      )
      .limit(1)
      .all();
    if (!conflict) {
      return;
    }

    const winnerFactId = input.winnerFactId;
    const isInvalidatedWinner = winnerFactId === conflict.invalidatedFactId;
    const isInvalidatingWinner = winnerFactId === conflict.invalidatingFactId;
    if (!isInvalidatedWinner && !isInvalidatingWinner) {
      return;
    }
    const loserFactId = isInvalidatedWinner
      ? conflict.invalidatingFactId
      : conflict.invalidatedFactId;
    const [winnerState] = tx.all<TemporalFactConfirmationState>(sql`
      SELECT
        fact."provenanceKind" AS "provenanceKind",
        fact."canonStatus" AS "canonStatus",
        EXISTS (
          SELECT 1
          FROM "MemoryFactEvidence" factEvidence
          INNER JOIN "MemoryEpisodeEvidence" episodeEvidence
            ON episodeEvidence."id" = factEvidence."evidenceId"
            AND episodeEvidence."projectId" = factEvidence."projectId"
          WHERE factEvidence."projectId" = fact."projectId"
            AND factEvidence."factId" = fact."id"
            AND trim(fact."sourceContentHash") <> ''
            AND trim(episodeEvidence."sourceContentHash") <> ''
            AND trim(episodeEvidence."quote") <> ''
        ) AS "hasEvidence"
      FROM "MemoryFact" fact
      WHERE fact."projectId" = ${input.projectId}
        AND fact."id" = ${winnerFactId}
      LIMIT 1;
    `);
    if (!winnerState) {
      return;
    }
    assertTemporalFactCanBecomeCanonical(winnerState);

    const winnerUpdate = tx
      .update(memoryFact)
      .set({
        status: "confirmed",
        invalidatedByFactId: null,
        rejectedAt: null,
        rejectionReason: null,
        updatedAt: nowIso,
      })
      .where(
        and(
          eq(memoryFact.projectId, input.projectId),
          eq(memoryFact.id, winnerFactId),
        ),
      )
      .run();
    const loserUpdate = tx
      .update(memoryFact)
      .set({
        status: "rejected",
        invalidatedByFactId: winnerFactId,
        rejectedAt: nowIso,
        rejectionReason: reason,
        updatedAt: nowIso,
      })
      .where(
        and(
          eq(memoryFact.projectId, input.projectId),
          eq(memoryFact.id, loserFactId),
        ),
      )
      .run();

    const conflictUpdate = tx
      .update(memoryFactInvalidation)
      .set({
        reviewStatus: "resolved",
        reviewerNote: reason,
        reviewedAt: nowIso,
        updatedAt: nowIso,
      })
      .where(
        and(
          eq(memoryFactInvalidation.projectId, input.projectId),
          eq(memoryFactInvalidation.id, input.conflictId),
        ),
      )
      .run();

    updated =
      winnerUpdate.changes > 0 &&
      loserUpdate.changes > 0 &&
      conflictUpdate.changes > 0;
  });

  return { updated };
}

export async function reviewMemoryTemporalFactConflict(
  input: MemoryTemporalFactConflictReviewInput & { nowIso?: string },
): Promise<MemoryTemporalFactReviewMutationResult> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const reviewStatus =
    input.action === "defer"
      ? "deferred"
      : input.action === "review"
        ? "reviewing"
        : "resolved";
  const updated = await db
    .getClient()
    .update(memoryFactInvalidation)
    .set({
      reviewStatus,
      reviewerNote: input.reviewerNote?.trim() || null,
      reviewedAt: nowIso,
      updatedAt: nowIso,
    })
    .where(
      and(
        eq(memoryFactInvalidation.projectId, input.projectId),
        eq(memoryFactInvalidation.id, input.conflictId),
      ),
    );

  return { updated: updated.changes > 0 };
}
