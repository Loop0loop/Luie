import type { DbLike } from "../../../../../infra/database/index.js";
import * as schema from "../../../../../infra/database/index.js";
import type { MemoryCanonicalPackagePayload } from "./types.js";
import {
  buildScopedMemoryId,
  mapRows,
  toNullableStringValue,
  toNumberValue,
  toStringValue,
} from "./valueUtils.js";

const {
  memoryEntity,
  memoryEntityAlias,
  memoryEpisode,
  memoryEpisodeEvidence,
  memoryFact,
  memoryFactEvidence,
  memoryFactInvalidation,
  memoryEvalCase,
  memoryEvalEvidence,
  memoryEvalEntity,
  memoryEvalRelation,
} = schema;

export const applyMemoryCanonicalPackagePayload = (
  tx: DbLike,
  input: {
    projectId: string;
    importedAt: Date;
    validChapterIds?: Set<string>;
    payload?: MemoryCanonicalPackagePayload | null;
  },
): void => {
  const tables = input.payload?.tables ?? {};
  const now = input.importedAt.toISOString();
  const entityIdMap = new Map<string, string>();
  const episodeIdMap = new Map<string, string>();
  const episodeEvidenceIdMap = new Map<string, string>();
  const factIdMap = new Map<string, string>();
  const evalCaseIdMap = new Map<string, string>();

  const entities = mapRows(tables.MemoryEntity, (row) => {
    const sourceId = toStringValue(row.id);
    const entityType = toStringValue(row.entityType);
    const canonicalName = toStringValue(row.canonicalName);
    const status = toStringValue(row.status);
    if (!sourceId || !entityType || !canonicalName || !status) return null;
    const id = buildScopedMemoryId(input.projectId, "MemoryEntity", sourceId);
    entityIdMap.set(sourceId, id);
    return {
      id,
      projectId: input.projectId,
      entityType,
      canonicalName,
      status,
      confidence: toNumberValue(row.confidence) ?? 0,
      createdBy: toStringValue(row.createdBy) ?? "import",
      createdAt: toStringValue(row.createdAt) ?? now,
      updatedAt: toStringValue(row.updatedAt) ?? now,
      deletedAt: toNullableStringValue(row.deletedAt),
    };
  });

  const aliases = mapRows(tables.MemoryEntityAlias, (row) => {
    const sourceId = toStringValue(row.id);
    const sourceEntityId = toStringValue(row.entityId);
    const entityType = toStringValue(row.entityType);
    const alias = toStringValue(row.alias);
    const normalizedAlias = toStringValue(row.normalizedAlias);
    const status = toStringValue(row.status);
    if (
      !sourceId ||
      !sourceEntityId ||
      !entityType ||
      !alias ||
      !normalizedAlias ||
      !status
    ) {
      return null;
    }
    const entityId = entityIdMap.get(sourceEntityId);
    if (!entityId) return null;
    const id = buildScopedMemoryId(
      input.projectId,
      "MemoryEntityAlias",
      sourceId,
    );
    return {
      id,
      projectId: input.projectId,
      entityId,
      entityType,
      alias,
      normalizedAlias,
      status,
      createdAt: toStringValue(row.createdAt) ?? now,
      updatedAt: toStringValue(row.updatedAt) ?? now,
    };
  });

  const episodes = mapRows(tables.MemoryEpisode, (row) => {
    const sourceId = toStringValue(row.id);
    const sourceType = toStringValue(row.sourceType);
    const sourceIdValue = toStringValue(row.sourceId);
    const sourceContentHash = toStringValue(row.sourceContentHash);
    const extractorVersion = toStringValue(row.extractorVersion);
    const episodeType = toStringValue(row.episodeType);
    const title = toStringValue(row.title);
    const summary = toStringValue(row.summary);
    const status = toStringValue(row.status) ?? "suggested";
    if (
      !sourceId ||
      !sourceType ||
      !sourceIdValue ||
      !sourceContentHash ||
      !extractorVersion ||
      !episodeType ||
      !title ||
      !summary
    ) {
      return null;
    }
    const chapterId = toNullableStringValue(row.chapterId);
    if (
      chapterId &&
      input.validChapterIds &&
      !input.validChapterIds.has(chapterId)
    ) {
      return null;
    }
    const id = buildScopedMemoryId(input.projectId, "MemoryEpisode", sourceId);
    episodeIdMap.set(sourceId, id);
    return {
      id,
      projectId: input.projectId,
      sourceType,
      sourceId: sourceIdValue,
      chapterId,
      sceneId: toNullableStringValue(row.sceneId),
      sourceContentHash,
      extractorVersion,
      episodeType,
      title,
      summary,
      status,
      confidence: toNumberValue(row.confidence) ?? 0,
      createdAt: toStringValue(row.createdAt) ?? now,
      updatedAt: toStringValue(row.updatedAt) ?? now,
      rejectedAt: toNullableStringValue(row.rejectedAt),
      rejectionReason: toNullableStringValue(row.rejectionReason),
    };
  });

  const episodeEvidence = mapRows(tables.MemoryEpisodeEvidence, (row) => {
    const sourceId = toStringValue(row.id);
    const sourceEpisodeId = toStringValue(row.episodeId);
    const contentHash = toStringValue(row.contentHash);
    const sourceContentHash = toStringValue(row.sourceContentHash);
    const quote = toStringValue(row.quote);
    if (
      !sourceId ||
      !sourceEpisodeId ||
      !contentHash ||
      !sourceContentHash ||
      !quote
    ) {
      return null;
    }
    const episodeId = episodeIdMap.get(sourceEpisodeId);
    if (!episodeId) return null;
    const chapterId = toNullableStringValue(row.chapterId);
    if (
      chapterId &&
      input.validChapterIds &&
      !input.validChapterIds.has(chapterId)
    ) {
      return null;
    }
    const id = buildScopedMemoryId(
      input.projectId,
      "MemoryEpisodeEvidence",
      sourceId,
    );
    episodeEvidenceIdMap.set(sourceId, id);
    return {
      id,
      projectId: input.projectId,
      episodeId,
      chapterId,
      chunkId: toNullableStringValue(row.chunkId),
      contentHash,
      sourceContentHash,
      startOffset: toNumberValue(row.startOffset),
      endOffset: toNumberValue(row.endOffset),
      quote,
      createdAt: toStringValue(row.createdAt) ?? now,
      updatedAt: toStringValue(row.updatedAt) ?? now,
    };
  });

  const factCandidates = mapRows(tables.MemoryFact, (row) => {
    const sourceId = toStringValue(row.id);
    const sourceSubjectEntityId = toStringValue(row.subjectEntityId);
    const sourceObjectEntityId = toNullableStringValue(row.objectEntityId);
    const predicate = toStringValue(row.predicate);
    const valueType = toStringValue(row.valueType);
    const validFromChapterId = toStringValue(row.validFromChapterId);
    const validFromChapterOrder = toNumberValue(row.validFromChapterOrder);
    const observedAtChapterId = toStringValue(row.observedAtChapterId);
    const observedAtChapterOrder = toNumberValue(row.observedAtChapterOrder);
    const status = toStringValue(row.status);
    const extractorVersion = toStringValue(row.extractorVersion);
    const sourceContentHash = toStringValue(row.sourceContentHash);
    if (
      !sourceId ||
      !sourceSubjectEntityId ||
      !predicate ||
      !valueType ||
      !validFromChapterId ||
      validFromChapterOrder === null ||
      !observedAtChapterId ||
      observedAtChapterOrder === null ||
      !status ||
      !extractorVersion ||
      !sourceContentHash
    ) {
      return null;
    }
    const subjectEntityId = entityIdMap.get(sourceSubjectEntityId);
    const objectEntityId = sourceObjectEntityId
      ? (entityIdMap.get(sourceObjectEntityId) ?? null)
      : null;
    if (!subjectEntityId || (sourceObjectEntityId && !objectEntityId))
      return null;
    const id = buildScopedMemoryId(input.projectId, "MemoryFact", sourceId);
    factIdMap.set(sourceId, id);
    return {
      id,
      projectId: input.projectId,
      subjectEntityId,
      predicate,
      objectEntityId,
      objectValue: toNullableStringValue(row.objectValue),
      valueType,
      validFromChapterId,
      validFromChapterOrder,
      validToChapterId: toNullableStringValue(row.validToChapterId),
      validToChapterOrder: toNumberValue(row.validToChapterOrder),
      observedAtChapterId,
      observedAtChapterOrder,
      confidence: toNumberValue(row.confidence) ?? 0,
      status,
      extractorVersion,
      sourceContentHash,
      invalidatedByFactId: toNullableStringValue(row.invalidatedByFactId),
      createdAt: toStringValue(row.createdAt) ?? now,
      updatedAt: toStringValue(row.updatedAt) ?? now,
      rejectedAt: toNullableStringValue(row.rejectedAt),
      rejectionReason: toNullableStringValue(row.rejectionReason),
    };
  }).filter((row) => {
    if (input.validChapterIds) {
      if (!input.validChapterIds.has(row.validFromChapterId)) return false;
      if (!input.validChapterIds.has(row.observedAtChapterId)) return false;
      if (
        row.validToChapterId &&
        !input.validChapterIds.has(row.validToChapterId)
      ) {
        return false;
      }
    }
    return true;
  });

  const factIds = new Set(factCandidates.map((row) => row.id));
  const facts = factCandidates.map((row) => ({
    ...row,
    invalidatedByFactId: row.invalidatedByFactId
      ? (() => {
          const targetFactId = factIdMap.get(row.invalidatedByFactId);
          return targetFactId && factIds.has(targetFactId)
            ? targetFactId
            : null;
        })()
      : null,
  }));

  const factInvalidations = mapRows(tables.MemoryFactInvalidation, (row) => {
    const sourceId = toStringValue(row.id);
    const sourceInvalidatedFactId = toStringValue(row.invalidatedFactId);
    const sourceInvalidatingFactId = toStringValue(row.invalidatingFactId);
    const reason = toStringValue(row.reason);
    if (
      !sourceId ||
      !sourceInvalidatedFactId ||
      !sourceInvalidatingFactId ||
      !reason
    ) {
      return null;
    }
    const invalidatedFactId = factIdMap.get(sourceInvalidatedFactId);
    const invalidatingFactId = factIdMap.get(sourceInvalidatingFactId);
    if (!invalidatedFactId || !invalidatingFactId) return null;
    const id = buildScopedMemoryId(
      input.projectId,
      "MemoryFactInvalidation",
      sourceId,
    );
    return {
      id,
      projectId: input.projectId,
      invalidatedFactId,
      invalidatingFactId,
      reason,
      createdAt: toStringValue(row.createdAt) ?? now,
      updatedAt: toStringValue(row.updatedAt) ?? now,
    };
  }).filter(
    (row) =>
      factIds.has(row.invalidatedFactId) && factIds.has(row.invalidatingFactId),
  );

  const factEvidence = mapRows(tables.MemoryFactEvidence, (row) => {
    const sourceId = toStringValue(row.id);
    const sourceFactId = toStringValue(row.factId);
    const sourceEvidenceId = toStringValue(row.evidenceId);
    if (!sourceId || !sourceFactId || !sourceEvidenceId) return null;
    const factId = factIdMap.get(sourceFactId);
    const evidenceId = episodeEvidenceIdMap.get(sourceEvidenceId);
    if (!factId || !evidenceId || !factIds.has(factId)) return null;
    const id = buildScopedMemoryId(
      input.projectId,
      "MemoryFactEvidence",
      sourceId,
    );
    return {
      id,
      projectId: input.projectId,
      factId,
      evidenceId,
      createdAt: toStringValue(row.createdAt) ?? now,
      updatedAt: toStringValue(row.updatedAt) ?? now,
    };
  });

  const evalCases = mapRows(tables.MemoryEvalCase, (row) => {
    const sourceId = toStringValue(row.id);
    const name = toStringValue(row.name);
    const question = toStringValue(row.question);
    if (!sourceId || !name || !question) return null;
    const id = buildScopedMemoryId(input.projectId, "MemoryEvalCase", sourceId);
    evalCaseIdMap.set(sourceId, id);
    return {
      id,
      projectId: input.projectId,
      name,
      question,
      caseType: toStringValue(row.caseType) ?? "qa",
      expectedAnswer: toNullableStringValue(row.expectedAnswer),
      temporalScopeStartChapterId: toNullableStringValue(
        row.temporalScopeStartChapterId,
      ),
      temporalScopeEndChapterId: toNullableStringValue(
        row.temporalScopeEndChapterId,
      ),
      severity: toStringValue(row.severity) ?? "p1",
      createdAt: toStringValue(row.createdAt) ?? now,
      updatedAt: toStringValue(row.updatedAt) ?? now,
    };
  });
  const evalCaseIds = new Set(evalCases.map((row) => row.id));

  const evalEvidence = mapRows(tables.MemoryEvalEvidence, (row) => {
    const sourceId = toStringValue(row.id);
    const sourceCaseId = toStringValue(row.caseId);
    const quote = toStringValue(row.quote);
    if (!sourceId || !sourceCaseId || !quote) return null;
    const caseId = evalCaseIdMap.get(sourceCaseId);
    if (!caseId) return null;
    const id = buildScopedMemoryId(
      input.projectId,
      "MemoryEvalEvidence",
      sourceId,
    );
    return {
      id,
      caseId,
      projectId: input.projectId,
      chapterId: toNullableStringValue(row.chapterId),
      expectedChunkId: toNullableStringValue(row.expectedChunkId),
      startOffset: toNumberValue(row.startOffset),
      endOffset: toNumberValue(row.endOffset),
      quote,
      createdAt: toStringValue(row.createdAt) ?? now,
      updatedAt: toStringValue(row.updatedAt) ?? now,
    };
  }).filter((row) => {
    if (!evalCaseIds.has(row.caseId)) return false;
    if (row.chapterId && input.validChapterIds) {
      return input.validChapterIds.has(row.chapterId);
    }
    return true;
  });

  const evalEntities = mapRows(tables.MemoryEvalEntity, (row) => {
    const sourceId = toStringValue(row.id);
    const sourceCaseId = toStringValue(row.caseId);
    const name = toStringValue(row.name);
    const entityType = toStringValue(row.entityType);
    if (!sourceId || !sourceCaseId || !name || !entityType) return null;
    const caseId = evalCaseIdMap.get(sourceCaseId);
    if (!caseId) return null;
    const id = buildScopedMemoryId(
      input.projectId,
      "MemoryEvalEntity",
      sourceId,
    );
    return {
      id,
      caseId,
      projectId: input.projectId,
      name,
      entityType,
      expectedAttributes: toNullableStringValue(row.expectedAttributes),
      createdAt: toStringValue(row.createdAt) ?? now,
      updatedAt: toStringValue(row.updatedAt) ?? now,
    };
  }).filter((row) => evalCaseIds.has(row.caseId));

  const evalRelations = mapRows(tables.MemoryEvalRelation, (row) => {
    const sourceId = toStringValue(row.id);
    const sourceCaseId = toStringValue(row.caseId);
    const sourceName = toStringValue(row.sourceName);
    const targetName = toStringValue(row.targetName);
    const relation = toStringValue(row.relation);
    if (!sourceId || !sourceCaseId || !sourceName || !targetName || !relation)
      return null;
    const caseId = evalCaseIdMap.get(sourceCaseId);
    if (!caseId) return null;
    const id = buildScopedMemoryId(
      input.projectId,
      "MemoryEvalRelation",
      sourceId,
    );
    return {
      id,
      caseId,
      projectId: input.projectId,
      sourceName,
      targetName,
      relation,
      temporalScope: toNullableStringValue(row.temporalScope),
      expectedAttributes: toNullableStringValue(row.expectedAttributes),
      createdAt: toStringValue(row.createdAt) ?? now,
      updatedAt: toStringValue(row.updatedAt) ?? now,
    };
  }).filter((row) => evalCaseIds.has(row.caseId));

  if (entities.length > 0) tx.insert(memoryEntity).values(entities).run();
  if (aliases.length > 0) tx.insert(memoryEntityAlias).values(aliases).run();
  if (episodes.length > 0) tx.insert(memoryEpisode).values(episodes).run();
  if (episodeEvidence.length > 0)
    tx.insert(memoryEpisodeEvidence).values(episodeEvidence).run();
  if (evalCases.length > 0) tx.insert(memoryEvalCase).values(evalCases).run();
  if (facts.length > 0) tx.insert(memoryFact).values(facts).run();
  if (factEvidence.length > 0)
    tx.insert(memoryFactEvidence).values(factEvidence).run();
  if (factInvalidations.length > 0) {
    tx.insert(memoryFactInvalidation).values(factInvalidations).run();
  }
  if (evalEvidence.length > 0)
    tx.insert(memoryEvalEvidence).values(evalEvidence).run();
  if (evalEntities.length > 0)
    tx.insert(memoryEvalEntity).values(evalEntities).run();
  if (evalRelations.length > 0)
    tx.insert(memoryEvalRelation).values(evalRelations).run();
};
