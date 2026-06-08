import { and, eq, or } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "../../../../database/main/databaseService.js";
import {
  memoryCharacterState,
  memoryEntity,
  memoryEntityAlias,
  memoryEntityMergeAudit,
  memoryEntityMention,
  memoryEpisodeParticipant,
  memoryFact,
  memoryKnowledgeState,
  memoryRelationState,
  memoryStateChangeCandidate,
} from "../../../../database/schema/index.js";
import type {
  MemoryEntityAliasSplitInput,
  MemoryEntityAliasSplitResult,
  MemoryEntityMergeInput,
  MemoryEntityMergeResult,
} from "../../../../../shared/types/search.js";

export async function mergeMemoryEntities(
  input: MemoryEntityMergeInput & { nowIso?: string },
): Promise<MemoryEntityMergeResult> {
  if (input.sourceEntityId === input.targetEntityId) {
    return { updated: false };
  }

  const nowIso = input.nowIso ?? new Date().toISOString();
  const updated = db.getClient().transaction((tx) => {
    const rows = tx
      .select({
        id: memoryEntity.id,
        entityType: memoryEntity.entityType,
      })
      .from(memoryEntity)
      .where(
        and(
          eq(memoryEntity.projectId, input.projectId),
          or(
            eq(memoryEntity.id, input.targetEntityId),
            eq(memoryEntity.id, input.sourceEntityId),
          ),
        ),
      )
      .all();

    const target = rows.find((row) => row.id === input.targetEntityId);
    const source = rows.find((row) => row.id === input.sourceEntityId);
    if (!target || !source || target.entityType !== source.entityType) {
      return false;
    }

    tx.update(memoryEntityAlias)
      .set({
        entityId: input.targetEntityId,
        status: "confirmed",
        updatedAt: nowIso,
      })
      .where(
        and(
          eq(memoryEntityAlias.projectId, input.projectId),
          eq(memoryEntityAlias.entityId, input.sourceEntityId),
        ),
      )
      .run();
    tx.update(memoryEntityMention)
      .set({ entityId: input.targetEntityId, updatedAt: nowIso })
      .where(
        and(
          eq(memoryEntityMention.projectId, input.projectId),
          eq(memoryEntityMention.entityId, input.sourceEntityId),
        ),
      )
      .run();
    tx.update(memoryEpisodeParticipant)
      .set({ entityId: input.targetEntityId, updatedAt: nowIso })
      .where(
        and(
          eq(memoryEpisodeParticipant.projectId, input.projectId),
          eq(memoryEpisodeParticipant.entityId, input.sourceEntityId),
        ),
      )
      .run();
    tx.update(memoryStateChangeCandidate)
      .set({ subjectEntityId: input.targetEntityId, updatedAt: nowIso })
      .where(
        and(
          eq(memoryStateChangeCandidate.projectId, input.projectId),
          eq(memoryStateChangeCandidate.subjectEntityId, input.sourceEntityId),
        ),
      )
      .run();
    tx.update(memoryFact)
      .set({ subjectEntityId: input.targetEntityId, updatedAt: nowIso })
      .where(
        and(
          eq(memoryFact.projectId, input.projectId),
          eq(memoryFact.subjectEntityId, input.sourceEntityId),
        ),
      )
      .run();
    tx.update(memoryFact)
      .set({ objectEntityId: input.targetEntityId, updatedAt: nowIso })
      .where(
        and(
          eq(memoryFact.projectId, input.projectId),
          eq(memoryFact.objectEntityId, input.sourceEntityId),
        ),
      )
      .run();
    tx.update(memoryRelationState)
      .set({ sourceEntityId: input.targetEntityId, updatedAt: nowIso })
      .where(
        and(
          eq(memoryRelationState.projectId, input.projectId),
          eq(memoryRelationState.sourceEntityId, input.sourceEntityId),
        ),
      )
      .run();
    tx.update(memoryRelationState)
      .set({ targetEntityId: input.targetEntityId, updatedAt: nowIso })
      .where(
        and(
          eq(memoryRelationState.projectId, input.projectId),
          eq(memoryRelationState.targetEntityId, input.sourceEntityId),
        ),
      )
      .run();
    tx.update(memoryCharacterState)
      .set({ entityId: input.targetEntityId, updatedAt: nowIso })
      .where(
        and(
          eq(memoryCharacterState.projectId, input.projectId),
          eq(memoryCharacterState.entityId, input.sourceEntityId),
        ),
      )
      .run();
    tx.update(memoryKnowledgeState)
      .set({ knowerEntityId: input.targetEntityId, updatedAt: nowIso })
      .where(
        and(
          eq(memoryKnowledgeState.projectId, input.projectId),
          eq(memoryKnowledgeState.knowerEntityId, input.sourceEntityId),
        ),
      )
      .run();
    tx.update(memoryKnowledgeState)
      .set({ secretEntityId: input.targetEntityId, updatedAt: nowIso })
      .where(
        and(
          eq(memoryKnowledgeState.projectId, input.projectId),
          eq(memoryKnowledgeState.secretEntityId, input.sourceEntityId),
        ),
      )
      .run();
    tx.update(memoryEntity)
      .set({
        status: "deprecated",
        deletedAt: nowIso,
        updatedAt: nowIso,
      })
      .where(
        and(
          eq(memoryEntity.projectId, input.projectId),
          eq(memoryEntity.id, input.sourceEntityId),
        ),
      )
      .run();
    tx.update(memoryEntity)
      .set({
        status: "confirmed",
        updatedAt: nowIso,
      })
      .where(
        and(
          eq(memoryEntity.projectId, input.projectId),
          eq(memoryEntity.id, input.targetEntityId),
        ),
      )
      .run();
    tx.insert(memoryEntityMergeAudit)
      .values({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        sourceEntityId: input.sourceEntityId,
        targetEntityId: input.targetEntityId,
        aliasId: null,
        action: "merge",
        reason: null,
        createdBy: "user",
        updatedAt: nowIso,
      })
      .run();

    return true;
  });

  return { updated };
}

export async function splitMemoryEntityAlias(
  input: MemoryEntityAliasSplitInput & { nowIso?: string },
): Promise<MemoryEntityAliasSplitResult> {
  const canonicalName = input.canonicalName.trim();
  if (!canonicalName) {
    return { updated: false, entityId: null };
  }

  const nowIso = input.nowIso ?? new Date().toISOString();
  const entityId = crypto.randomUUID();
  const updated = db.getClient().transaction((tx) => {
    const [aliasRow] = tx
      .select({
        id: memoryEntityAlias.id,
        entityId: memoryEntityAlias.entityId,
        entityType: memoryEntityAlias.entityType,
        alias: memoryEntityAlias.alias,
        normalizedAlias: memoryEntityAlias.normalizedAlias,
      })
      .from(memoryEntityAlias)
      .where(
        and(
          eq(memoryEntityAlias.projectId, input.projectId),
          eq(memoryEntityAlias.id, input.aliasId),
        ),
      )
      .limit(1)
      .all();

    if (!aliasRow) return false;

    tx.insert(memoryEntity)
      .values({
        id: entityId,
        projectId: input.projectId,
        entityType: aliasRow.entityType,
        canonicalName,
        status: "confirmed",
        confidence: 100,
        createdBy: "user",
        updatedAt: nowIso,
      })
      .run();
    tx.update(memoryEntityAlias)
      .set({
        entityId,
        alias: aliasRow.alias,
        normalizedAlias: aliasRow.normalizedAlias,
        status: "confirmed",
        updatedAt: nowIso,
      })
      .where(eq(memoryEntityAlias.id, aliasRow.id))
      .run();
    tx.update(memoryEntityMention)
      .set({ entityId, updatedAt: nowIso })
      .where(
        and(
          eq(memoryEntityMention.projectId, input.projectId),
          eq(memoryEntityMention.aliasId, aliasRow.id),
        ),
      )
      .run();
    tx.insert(memoryEntityMergeAudit)
      .values({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        sourceEntityId: aliasRow.entityId,
        targetEntityId: entityId,
        aliasId: aliasRow.id,
        action: "split",
        reason: null,
        createdBy: "user",
        updatedAt: nowIso,
      })
      .run();

    return true;
  });

  return { updated, entityId: updated ? entityId : null };
}
