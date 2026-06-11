import crypto from "node:crypto";
import {
  db,
  memoryCharacterState,
  memoryFact,
  memoryFactEvidence,
  memoryKnowledgeState,
  memoryRelationState,
} from "../../../../infra/database/index.js";

type MemoryTemporalFactProjection =
  | {
      kind: "relation";
      sourceEntityId: string;
      targetEntityId: string;
      relation: string;
    }
  | {
      kind: "character";
      entityId: string;
      stateType: string;
      stateValue: string;
    }
  | {
      kind: "knowledge";
      knowerEntityId: string;
      secretEntityId: string | null;
      knowledgeKey: string;
      knowledgeValue: string;
    };

export type MemoryTemporalFactCandidateCreateInput = {
  nowIso: string;
  projectId: string;
  subjectEntityId: string;
  predicate: string;
  objectEntityId: string | null;
  objectValue: string | null;
  valueType: string;
  validFromChapterId: string;
  validFromChapterOrder: number;
  validToChapterId: string | null;
  validToChapterOrder: number | null;
  observedAtChapterId: string;
  observedAtChapterOrder: number;
  confidence: number;
  extractorVersion: string;
  sourceContentHash: string;
  evidenceIds: string[];
  projection: MemoryTemporalFactProjection;
};

export function validateMemoryTemporalFactCandidate(
  input: MemoryTemporalFactCandidateCreateInput,
): void {
  if (input.evidenceIds.length === 0) {
    throw new Error("MEMORY_TEMPORAL_FACT_REQUIRES_EVIDENCE");
  }
  if (input.sourceContentHash.trim().length === 0) {
    throw new Error("MEMORY_TEMPORAL_FACT_REQUIRES_SOURCE_HASH");
  }
  if (input.extractorVersion.trim().length === 0) {
    throw new Error("MEMORY_TEMPORAL_FACT_REQUIRES_EXTRACTOR_VERSION");
  }
}

export function createMemoryTemporalFactCandidateRows(
  input: MemoryTemporalFactCandidateCreateInput,
): {
  fact: typeof memoryFact.$inferInsert;
  evidence: Array<typeof memoryFactEvidence.$inferInsert>;
  projection:
    | typeof memoryRelationState.$inferInsert
    | typeof memoryCharacterState.$inferInsert
    | typeof memoryKnowledgeState.$inferInsert;
} {
  validateMemoryTemporalFactCandidate(input);
  const factId = crypto.randomUUID();
  const fact = {
    id: factId,
    projectId: input.projectId,
    subjectEntityId: input.subjectEntityId,
    predicate: input.predicate,
    objectEntityId: input.objectEntityId,
    objectValue: input.objectValue,
    valueType: input.valueType,
    validFromChapterId: input.validFromChapterId,
    validFromChapterOrder: input.validFromChapterOrder,
    validToChapterId: input.validToChapterId,
    validToChapterOrder: input.validToChapterOrder,
    observedAtChapterId: input.observedAtChapterId,
    observedAtChapterOrder: input.observedAtChapterOrder,
    confidence: input.confidence,
    status: "suggested",
    provenanceKind: "canon",
    canonStatus: "canon",
    extractorVersion: input.extractorVersion,
    sourceContentHash: input.sourceContentHash,
    invalidatedByFactId: null,
    updatedAt: input.nowIso,
  } satisfies typeof memoryFact.$inferInsert;
  const evidence = input.evidenceIds.map((evidenceId) => ({
    id: crypto.randomUUID(),
    projectId: input.projectId,
    factId,
    evidenceId,
    updatedAt: input.nowIso,
  })) satisfies Array<typeof memoryFactEvidence.$inferInsert>;

  if (input.projection.kind === "relation") {
    return {
      fact,
      evidence,
      projection: {
        id: crypto.randomUUID(),
        projectId: input.projectId,
        factId,
        sourceEntityId: input.projection.sourceEntityId,
        targetEntityId: input.projection.targetEntityId,
        relation: input.projection.relation,
        updatedAt: input.nowIso,
      } satisfies typeof memoryRelationState.$inferInsert,
    };
  }

  if (input.projection.kind === "character") {
    return {
      fact,
      evidence,
      projection: {
        id: crypto.randomUUID(),
        projectId: input.projectId,
        factId,
        entityId: input.projection.entityId,
        stateType: input.projection.stateType,
        stateValue: input.projection.stateValue,
        updatedAt: input.nowIso,
      } satisfies typeof memoryCharacterState.$inferInsert,
    };
  }

  return {
    fact,
    evidence,
    projection: {
      id: crypto.randomUUID(),
      projectId: input.projectId,
      factId,
      knowerEntityId: input.projection.knowerEntityId,
      secretEntityId: input.projection.secretEntityId,
      knowledgeKey: input.projection.knowledgeKey,
      knowledgeValue: input.projection.knowledgeValue,
      updatedAt: input.nowIso,
    } satisfies typeof memoryKnowledgeState.$inferInsert,
  };
}

export async function createMemoryTemporalFactCandidate(
  input: MemoryTemporalFactCandidateCreateInput,
): Promise<ReturnType<typeof createMemoryTemporalFactCandidateRows>> {
  const rows = createMemoryTemporalFactCandidateRows(input);
  db.getClient().transaction((tx) => {
    tx.insert(memoryFact).values(rows.fact).run();
    for (const evidence of rows.evidence) {
      tx.insert(memoryFactEvidence).values(evidence).run();
    }
    if (input.projection.kind === "relation") {
      tx.insert(memoryRelationState)
        .values(rows.projection as typeof memoryRelationState.$inferInsert)
        .run();
    } else if (input.projection.kind === "character") {
      tx.insert(memoryCharacterState)
        .values(rows.projection as typeof memoryCharacterState.$inferInsert)
        .run();
    } else {
      tx.insert(memoryKnowledgeState)
        .values(rows.projection as typeof memoryKnowledgeState.$inferInsert)
        .run();
    }
  });
  return rows;
}
