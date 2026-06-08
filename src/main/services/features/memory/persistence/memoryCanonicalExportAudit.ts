import { eq } from "drizzle-orm";
import {
  db,
  memoryEntity,
  memoryEntityAlias,
  memoryEvalCase,
  memoryEvalEntity,
  memoryEvalEvidence,
  memoryEvalRelation,
  memoryFact,
  memoryFactEvidence,
  memoryFactInvalidation,
  memoryEpisode,
  memoryEpisodeEvidence,
  project,
} from "../../../../infra/database/index.js";
import {
  MEMORY_CANONICAL_EXPORTABLE_TABLES,
  isMemoryRowExportable,
} from "../../../../../shared/constants/index.js";
import { getProjectAttachmentPath } from "../../../core/project/projectAttachmentStore.js";
import { buildMemoryCanonicalPackagePayload } from "./memoryCanonicalPackage.js";

type AuditTableName = (typeof MEMORY_CANONICAL_EXPORTABLE_TABLES)[number];

export type MemoryCanonicalExportTableAudit = {
  runtimeRows: number;
  exportableRows: number;
  nonExportableRows: number;
  payloadRows: number;
  byStatus: Record<string, number>;
};

export type MemoryCanonicalExportAudit = {
  projectId: string;
  projectPath: string | null;
  totalRuntimeRows: number;
  totalExportableRows: number;
  totalNonExportableRows: number;
  totalPayloadRows: number;
  tables: Record<AuditTableName, MemoryCanonicalExportTableAudit>;
};

const tableSources = {
  MemoryEntity: memoryEntity,
  MemoryEntityAlias: memoryEntityAlias,
  MemoryEpisode: memoryEpisode,
  MemoryEpisodeEvidence: memoryEpisodeEvidence,
  MemoryFact: memoryFact,
  MemoryFactEvidence: memoryFactEvidence,
  MemoryFactInvalidation: memoryFactInvalidation,
  MemoryEvalCase: memoryEvalCase,
  MemoryEvalEvidence: memoryEvalEvidence,
  MemoryEvalEntity: memoryEvalEntity,
  MemoryEvalRelation: memoryEvalRelation,
} satisfies Record<AuditTableName, { projectId: unknown }>;

export async function getMemoryCanonicalExportAudit(input: {
  projectId: string;
}): Promise<MemoryCanonicalExportAudit> {
  const client = db.getClient();
  const [projectRow] = await client
    .select({ projectPath: project.projectPath })
    .from(project)
    .where(eq(project.id, input.projectId))
    .limit(1);
  const attachmentPath = await getProjectAttachmentPath(input.projectId);

  const tables = {} as Record<AuditTableName, MemoryCanonicalExportTableAudit>;
  const payload = await buildMemoryCanonicalPackagePayload(input.projectId);
  let totalRuntimeRows = 0;
  let totalExportableRows = 0;
  let totalPayloadRows = 0;

  for (const tableName of MEMORY_CANONICAL_EXPORTABLE_TABLES) {
    const source = tableSources[tableName];
    const rows = await client
      .select()
      .from(source)
      .where(eq(source.projectId, input.projectId));
    const byStatus: Record<string, number> = {};
    let exportableRows = 0;
    for (const row of rows) {
      const status =
        "status" in row && typeof row.status === "string"
          ? row.status
          : "no_status";
      byStatus[status] = (byStatus[status] ?? 0) + 1;
      if (
        isMemoryRowExportable({
          tableName,
          status:
            "status" in row && typeof row.status === "string"
              ? row.status
              : undefined,
        })
      ) {
        exportableRows += 1;
      }
    }
    const payloadRows = payload.tables[tableName]?.length ?? 0;
    tables[tableName] = {
      runtimeRows: rows.length,
      exportableRows,
      nonExportableRows: rows.length - exportableRows,
      payloadRows,
      byStatus,
    };
    totalRuntimeRows += rows.length;
    totalExportableRows += exportableRows;
    totalPayloadRows += payloadRows;
  }

  return {
    projectId: input.projectId,
    projectPath: attachmentPath ?? projectRow?.projectPath ?? null,
    totalRuntimeRows,
    totalExportableRows,
    totalNonExportableRows: totalRuntimeRows - totalExportableRows,
    totalPayloadRows,
    tables,
  };
}
