import { and, eq, inArray } from "drizzle-orm";
import {
  MEMORY_CANONICAL_EXPORTABLE_TABLES,
  isMemoryRowExportable,
} from "../../../../../shared/constants/index.js";
import { db } from "../../../../infra/database/index.js";
import * as schema from "../../../../infra/database/index.js";

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
