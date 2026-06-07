import { and, eq, inArray } from "drizzle-orm";
import {
  MEMORY_CANONICAL_EXPORTABLE_TABLES,
  isMemoryRowExportable,
} from "../../../../../shared/constants/index.js";
import { db } from "../../../../infra/database/index.js";
import * as schema from "../../../../infra/database/index.js";
import type { DbLike } from "../../../../infra/database/index.js";

export type MemoryCanonicalTableName =
  typeof MEMORY_CANONICAL_EXPORTABLE_TABLES[number];

export type MemoryCanonicalPackagePayload = {
  schemaVersion: 1;
  exportedAt: string;
  tables: Partial<Record<MemoryCanonicalTableName, Array<Record<string, unknown>>>>;
};

const {
  memoryEntity,
  memoryEntityAlias,
  memoryFact,
  memoryFactEvidence,
  memoryFactInvalidation,
  memoryEvalCase,
  memoryEvalEvidence,
  memoryEvalEntity,
  memoryEvalRelation,
} = schema;

const toPlainRows = <T extends Record<string, unknown>>(rows: T[]): Array<Record<string, unknown>> =>
  rows.map((row) => ({ ...row }));

const toStringValue = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const toNullableStringValue = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const toNumberValue = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const mapRows = <T>(
  rows: Array<Record<string, unknown>> | undefined,
  mapper: (row: Record<string, unknown>) => T | null,
): T[] => (rows ?? []).map(mapper).filter((row): row is T => row !== null);

const buildScopedMemoryId = (projectId: string, tableName: MemoryCanonicalTableName, id: string): string => {
  const prefix = `${projectId}:${tableName}:`;
  return id.startsWith(prefix) ? id : `${prefix}${id}`;
};

export const createEmptyMemoryCanonicalPackagePayload = (): MemoryCanonicalPackagePayload => ({
  schemaVersion: 1,
  exportedAt: new Date(0).toISOString(),
  tables: {},
});

export const buildMemoryCanonicalPackagePayload = async (
  projectId: string,
): Promise<MemoryCanonicalPackagePayload> => {
  const store = db.getClient();
  const [entities, aliases, facts, evalCases] = await Promise.all([
    store
      .select()
      .from(memoryEntity)
      .where(eq(memoryEntity.projectId, projectId)),
    store
      .select()
      .from(memoryEntityAlias)
      .where(eq(memoryEntityAlias.projectId, projectId)),
    store
      .select()
      .from(memoryFact)
      .where(eq(memoryFact.projectId, projectId)),
    store
      .select()
      .from(memoryEvalCase)
      .where(eq(memoryEvalCase.projectId, projectId)),
  ]);

  const exportableEntities = entities.filter((row) =>
    isMemoryRowExportable({ tableName: "MemoryEntity", status: row.status }),
  );
  const exportableAliases = aliases.filter((row) =>
    isMemoryRowExportable({ tableName: "MemoryEntityAlias", status: row.status }),
  );
  const exportableFacts = facts.filter((row) =>
    isMemoryRowExportable({ tableName: "MemoryFact", status: row.status }),
  );
  const factIds = exportableFacts.map((row) => row.id);
  const evalCaseIds = evalCases.map((row) => row.id);

  const [factEvidence, factInvalidations, evalEvidence, evalEntities, evalRelations] =
    await Promise.all([
      factIds.length === 0
        ? Promise.resolve([])
        : store
            .select()
            .from(memoryFactEvidence)
            .where(
              and(
                eq(memoryFactEvidence.projectId, projectId),
                inArray(memoryFactEvidence.factId, factIds),
              ),
            ),
      factIds.length === 0
        ? Promise.resolve([])
        : store
            .select()
            .from(memoryFactInvalidation)
            .where(
              and(
                eq(memoryFactInvalidation.projectId, projectId),
                inArray(memoryFactInvalidation.invalidatedFactId, factIds),
                inArray(memoryFactInvalidation.invalidatingFactId, factIds),
              ),
            ),
      evalCaseIds.length === 0
        ? Promise.resolve([])
        : store
            .select()
            .from(memoryEvalEvidence)
            .where(
              and(
                eq(memoryEvalEvidence.projectId, projectId),
                inArray(memoryEvalEvidence.caseId, evalCaseIds),
              ),
            ),
      evalCaseIds.length === 0
        ? Promise.resolve([])
        : store
            .select()
            .from(memoryEvalEntity)
            .where(
              and(
                eq(memoryEvalEntity.projectId, projectId),
                inArray(memoryEvalEntity.caseId, evalCaseIds),
              ),
            ),
      evalCaseIds.length === 0
        ? Promise.resolve([])
        : store
            .select()
            .from(memoryEvalRelation)
            .where(
              and(
                eq(memoryEvalRelation.projectId, projectId),
                inArray(memoryEvalRelation.caseId, evalCaseIds),
              ),
            ),
    ]);

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    tables: {
      MemoryEntity: toPlainRows(exportableEntities),
      MemoryEntityAlias: toPlainRows(exportableAliases),
      MemoryFact: toPlainRows(exportableFacts),
      MemoryFactEvidence: toPlainRows(factEvidence),
      MemoryFactInvalidation: toPlainRows(factInvalidations),
      MemoryEvalCase: toPlainRows(evalCases),
      MemoryEvalEvidence: toPlainRows(evalEvidence),
      MemoryEvalEntity: toPlainRows(evalEntities),
      MemoryEvalRelation: toPlainRows(evalRelations),
    },
  };
};

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
    if (!sourceId || !sourceEntityId || !entityType || !alias || !normalizedAlias || !status) {
      return null;
    }
    const entityId = entityIdMap.get(sourceEntityId);
    if (!entityId) return null;
    const id = buildScopedMemoryId(input.projectId, "MemoryEntityAlias", sourceId);
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
      ? entityIdMap.get(sourceObjectEntityId) ?? null
      : null;
    if (!subjectEntityId || (sourceObjectEntityId && !objectEntityId)) return null;
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
      if (row.validToChapterId && !input.validChapterIds.has(row.validToChapterId)) {
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
          return targetFactId && factIds.has(targetFactId) ? targetFactId : null;
        })()
      : null,
  }));

  const factInvalidations = mapRows(tables.MemoryFactInvalidation, (row) => {
    const sourceId = toStringValue(row.id);
    const sourceInvalidatedFactId = toStringValue(row.invalidatedFactId);
    const sourceInvalidatingFactId = toStringValue(row.invalidatingFactId);
    const reason = toStringValue(row.reason);
    if (!sourceId || !sourceInvalidatedFactId || !sourceInvalidatingFactId || !reason) {
      return null;
    }
    const invalidatedFactId = factIdMap.get(sourceInvalidatedFactId);
    const invalidatingFactId = factIdMap.get(sourceInvalidatingFactId);
    if (!invalidatedFactId || !invalidatingFactId) return null;
    const id = buildScopedMemoryId(input.projectId, "MemoryFactInvalidation", sourceId);
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
      factIds.has(row.invalidatedFactId) &&
      factIds.has(row.invalidatingFactId),
  );

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
      temporalScopeStartChapterId: toNullableStringValue(row.temporalScopeStartChapterId),
      temporalScopeEndChapterId: toNullableStringValue(row.temporalScopeEndChapterId),
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
    const id = buildScopedMemoryId(input.projectId, "MemoryEvalEvidence", sourceId);
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
    const id = buildScopedMemoryId(input.projectId, "MemoryEvalEntity", sourceId);
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
    if (!sourceId || !sourceCaseId || !sourceName || !targetName || !relation) return null;
    const caseId = evalCaseIdMap.get(sourceCaseId);
    if (!caseId) return null;
    const id = buildScopedMemoryId(input.projectId, "MemoryEvalRelation", sourceId);
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
  if (evalCases.length > 0) tx.insert(memoryEvalCase).values(evalCases).run();
  if (facts.length > 0) tx.insert(memoryFact).values(facts).run();
  if (factInvalidations.length > 0) {
    tx.insert(memoryFactInvalidation).values(factInvalidations).run();
  }
  if (evalEvidence.length > 0) tx.insert(memoryEvalEvidence).values(evalEvidence).run();
  if (evalEntities.length > 0) tx.insert(memoryEvalEntity).values(evalEntities).run();
  if (evalRelations.length > 0) tx.insert(memoryEvalRelation).values(evalRelations).run();
};
