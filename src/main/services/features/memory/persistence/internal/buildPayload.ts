import { and, eq, inArray } from "drizzle-orm";
import {
  type MemoryCanonicalPackagePayload,
  type MemoryCanonicalTableName,
} from "./types.js";
import { toPlainRows, uniqueIds } from "./valueUtils.js";
import { db } from "../../../../../infra/database/index.js";
import * as schema from "../../../../../infra/database/index.js";
import { isMemoryRowExportable } from "../../../../../../shared/constants/index.js";

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

export const createEmptyMemoryCanonicalPackagePayload =
  (): MemoryCanonicalPackagePayload => ({
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
    store.select().from(memoryFact).where(eq(memoryFact.projectId, projectId)),
    store
      .select()
      .from(memoryEvalCase)
      .where(eq(memoryEvalCase.projectId, projectId)),
  ]);

  const exportableEntities = entities.filter((row) =>
    isMemoryRowExportable({ tableName: "MemoryEntity", status: row.status }),
  );
  const exportableAliases = aliases.filter((row) =>
    isMemoryRowExportable({
      tableName: "MemoryEntityAlias",
      status: row.status,
    }),
  );
  const exportableFacts = facts.filter((row) =>
    isMemoryRowExportable({ tableName: "MemoryFact", status: row.status }),
  );
  const factIds = uniqueIds(exportableFacts.map((row) => row.id));
  const evalCaseIds = uniqueIds(evalCases.map((row) => row.id));

  const [
    factEvidence,
    factInvalidations,
    evalEvidence,
    evalEntities,
    evalRelations,
  ] = await Promise.all([
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

  const evidenceIds = uniqueIds(factEvidence.map((row) => row.evidenceId));
  const episodeEvidence =
    evidenceIds.length === 0
      ? []
      : await store
          .select()
          .from(memoryEpisodeEvidence)
          .where(
            and(
              eq(memoryEpisodeEvidence.projectId, projectId),
              inArray(memoryEpisodeEvidence.id, evidenceIds),
            ),
          );

  const episodeIds = uniqueIds(episodeEvidence.map((row) => row.episodeId));
  const episodes =
    episodeIds.length === 0
      ? []
      : await store
          .select()
          .from(memoryEpisode)
          .where(
            and(
              eq(memoryEpisode.projectId, projectId),
              inArray(memoryEpisode.id, episodeIds),
            ),
          );

  const tables: Partial<
    Record<MemoryCanonicalTableName, Array<Record<string, unknown>>>
  > = {
    MemoryEntity: toPlainRows(exportableEntities),
    MemoryEntityAlias: toPlainRows(exportableAliases),
    MemoryEpisode: toPlainRows(episodes),
    MemoryEpisodeEvidence: toPlainRows(episodeEvidence),
    MemoryFact: toPlainRows(exportableFacts),
    MemoryFactEvidence: toPlainRows(factEvidence),
    MemoryFactInvalidation: toPlainRows(factInvalidations),
    MemoryEvalCase: toPlainRows(evalCases),
    MemoryEvalEvidence: toPlainRows(evalEvidence),
    MemoryEvalEntity: toPlainRows(evalEntities),
    MemoryEvalRelation: toPlainRows(evalRelations),
  };

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    tables,
  };
};
