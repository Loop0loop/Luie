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
  MemoryTemporalFactConflictResolveInput,
  MemoryTemporalFactRejectInput,
  MemoryTemporalFactReviewMutationResult,
  MemoryTemporalFactReviewQueueInput,
  MemoryTemporalFactReviewQueueResult,
} from "../../../../../shared/types/search.js";

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
  const [candidate] = await db
    .getClient()
    .select({
      provenanceKind: memoryFact.provenanceKind,
      canonStatus: memoryFact.canonStatus,
    })
    .from(memoryFact)
    .where(
      and(
        eq(memoryFact.projectId, input.projectId),
        eq(memoryFact.id, input.factId),
        eq(memoryFact.status, "suggested"),
      ),
    )
    .limit(1);
  if (
    candidate &&
    (candidate.provenanceKind !== "canon" || candidate.canonStatus !== "canon")
  ) {
    throw new Error("MEMORY_FACT_CANON_STATUS_REQUIRED");
  }
  const updated = await db
    .getClient()
    .update(memoryFact)
    .set({
      status: "confirmed",
      rejectedAt: null,
      rejectionReason: null,
      updatedAt: input.nowIso ?? new Date().toISOString(),
    })
    .where(
      and(
        eq(memoryFact.projectId, input.projectId),
        eq(memoryFact.id, input.factId),
        eq(memoryFact.status, "suggested"),
      ),
    );

  return {
    updated: updated.changes > 0,
    status: updated.changes > 0 ? "confirmed" : undefined,
    canonicalExportable: updated.changes > 0,
  };
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

    updated = winnerUpdate.changes > 0 && loserUpdate.changes > 0;
  });

  return { updated };
}
