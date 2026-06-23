import {
  LUIE_MEMORY_CANONICAL_FILE,
  LUIE_MEMORY_DIR,
} from "../../../../../shared/constants/index.js";
import { MEMORY_CANONICAL_EXPORTABLE_TABLES } from "./memoryPersistencePolicy.js";
import { getProjectAttachmentPath } from "../../../core/project/projectAttachmentStore.js";
import { LuieMemoryCanonicalSchema } from "../../../core/project/projectLuieSchemas.js";
import {
  readLuieContainerEntry,
  writeLuieContainerEntry,
} from "../../../io/luieContainer.js";
import type { LoggerLike } from "../../../io/luiePackageTypes.js";
import {
  buildMemoryCanonicalPackagePayload,
  type MemoryCanonicalPackagePayload,
} from "./memoryCanonicalPackage.js";

type TableName = (typeof MEMORY_CANONICAL_EXPORTABLE_TABLES)[number];

export type MemoryCanonicalPackageSyncSourceIdMismatch = {
  rowId: string;
  field: string;
  dbValue: string | null;
  packageValue: string | null;
};

export type MemoryCanonicalPackageSyncTable = {
  dbRows: number;
  packageRows: number;
  missingInPackage: string[];
  extraInPackage: string[];
  sourceIdMismatches: MemoryCanonicalPackageSyncSourceIdMismatch[];
};

export type MemoryCanonicalPackageSyncVerification = {
  projectId: string;
  projectPath: string | null;
  entryPath: string;
  packageEntryPresent: boolean;
  repair?: {
    sourceIdMismatches: number;
  };
  inSync: boolean;
  totalDbRows: number;
  totalPackageRows: number;
  tables: Record<TableName, MemoryCanonicalPackageSyncTable>;
};

export type MemoryCanonicalPackageSyncComparison = {
  inSync: boolean;
  totalDbRows: number;
  totalPackageRows: number;
  tables: Record<TableName, MemoryCanonicalPackageSyncTable>;
};

const normalizeCanonicalRowId = (
  projectId: string,
  tableName: TableName,
  id: string,
): string => {
  const scopedPrefix = `${projectId}:${tableName}:`;
  return id.startsWith(scopedPrefix) ? id.slice(scopedPrefix.length) : id;
};

const rowIds = (
  rows: Array<Record<string, unknown>> | undefined,
  input: {
    projectId: string;
    tableName: TableName;
  },
): string[] =>
  (rows ?? [])
    .map((row) =>
      typeof row.id === "string"
        ? normalizeCanonicalRowId(input.projectId, input.tableName, row.id)
        : "",
    )
    .filter((id) => id.length > 0)
    .sort();

const diff = (left: string[], right: string[]): string[] => {
  const rightSet = new Set(right);
  return left.filter((id) => !rightSet.has(id));
};

const SOURCE_ID_FIELDS_BY_TABLE: Partial<
  Record<TableName, Partial<Record<string, TableName | null>>>
> = {
  MemoryEntityAlias: {
    entityId: "MemoryEntity",
  },
  MemoryEpisode: {
    sourceId: null,
  },
  MemoryEpisodeEvidence: {
    episodeId: "MemoryEpisode",
  },
  MemoryFact: {
    subjectEntityId: "MemoryEntity",
    objectEntityId: "MemoryEntity",
    invalidatedByFactId: "MemoryFact",
  },
  MemoryFactEvidence: {
    factId: "MemoryFact",
    evidenceId: "MemoryEpisodeEvidence",
  },
  MemoryFactInvalidation: {
    invalidatedFactId: "MemoryFact",
    invalidatingFactId: "MemoryFact",
  },
  MemoryEvalEvidence: {
    caseId: "MemoryEvalCase",
  },
  MemoryEvalEntity: {
    caseId: "MemoryEvalCase",
  },
  MemoryEvalRelation: {
    caseId: "MemoryEvalCase",
  },
};

const rowMapById = (
  rows: Array<Record<string, unknown>> | undefined,
  input: {
    projectId: string;
    tableName: TableName;
  },
): Map<string, Record<string, unknown>> => {
  const map = new Map<string, Record<string, unknown>>();
  for (const row of rows ?? []) {
    if (typeof row.id !== "string") continue;
    const id = normalizeCanonicalRowId(input.projectId, input.tableName, row.id);
    if (id.length > 0) {
      map.set(id, row);
    }
  }
  return map;
};

const normalizeSourceIdValue = (
  projectId: string,
  tableName: TableName | null,
  value: unknown,
): string | null => {
  if (typeof value !== "string" || value.length === 0) return null;
  return tableName ? normalizeCanonicalRowId(projectId, tableName, value) : value;
};

const findSourceIdMismatches = (input: {
  projectId: string;
  tableName: TableName;
  dbRows: Array<Record<string, unknown>> | undefined;
  packageRows: Array<Record<string, unknown>> | undefined;
}): MemoryCanonicalPackageSyncSourceIdMismatch[] => {
  const fields = SOURCE_ID_FIELDS_BY_TABLE[input.tableName];
  if (!fields) return [];

  const packageRowsById = rowMapById(input.packageRows, {
    projectId: input.projectId,
    tableName: input.tableName,
  });
  const mismatches: MemoryCanonicalPackageSyncSourceIdMismatch[] = [];

  for (const dbRow of input.dbRows ?? []) {
    if (typeof dbRow.id !== "string") continue;
    const rowId = normalizeCanonicalRowId(
      input.projectId,
      input.tableName,
      dbRow.id,
    );
    const packageRow = packageRowsById.get(rowId);
    if (!packageRow) continue;

    for (const [field, linkedTable] of Object.entries(fields)) {
      const dbValue = normalizeSourceIdValue(
        input.projectId,
        linkedTable ?? null,
        dbRow[field],
      );
      const packageValue = normalizeSourceIdValue(
        input.projectId,
        linkedTable ?? null,
        packageRow[field],
      );
      if (dbValue === packageValue) continue;
      mismatches.push({
        rowId,
        field,
        dbValue,
        packageValue,
      });
    }
  }

  return mismatches;
};

export async function verifyMemoryCanonicalPackageSync(input: {
  projectId: string;
  repairSourceIdMismatches?: boolean;
  logger?: LoggerLike;
}): Promise<MemoryCanonicalPackageSyncVerification> {
  const entryPath = `${LUIE_MEMORY_DIR}/${LUIE_MEMORY_CANONICAL_FILE}`;
  const [projectPath, dbPayload] = await Promise.all([
    getProjectAttachmentPath(input.projectId),
    buildMemoryCanonicalPackagePayload(input.projectId),
  ]);

  const rawPackagePayload = projectPath
    ? await readLuieContainerEntry(projectPath, entryPath)
    : null;
  const packagePayload: Pick<MemoryCanonicalPackagePayload, "tables"> =
    rawPackagePayload
      ? {
          tables: (LuieMemoryCanonicalSchema.parse(
            JSON.parse(rawPackagePayload),
          ).tables ?? {}) as MemoryCanonicalPackagePayload["tables"],
        }
      : { tables: {} };
  const comparison = compareMemoryCanonicalPackagePayloads({
    projectId: input.projectId,
    dbPayload,
    packagePayload,
    packageEntryPresent: rawPackagePayload !== null,
  });
  const sourceIdMismatchCount = Object.values(comparison.tables).reduce(
    (total, table) => total + table.sourceIdMismatches.length,
    0,
  );
  if (
    input.repairSourceIdMismatches &&
    projectPath &&
    rawPackagePayload !== null &&
    sourceIdMismatchCount > 0
  ) {
    const logger = input.logger ?? {
      error: () => undefined,
    };
    await writeLuieContainerEntry({
      targetPath: projectPath,
      entryPath,
      content: JSON.stringify(dbPayload, null, 2),
      logger,
    });
    const repairedComparison = compareMemoryCanonicalPackagePayloads({
      projectId: input.projectId,
      dbPayload,
      packagePayload: dbPayload,
      packageEntryPresent: true,
    });

    return {
      projectId: input.projectId,
      projectPath,
      entryPath,
      packageEntryPresent: true,
      repair: {
        sourceIdMismatches: sourceIdMismatchCount,
      },
      ...repairedComparison,
    };
  }

  return {
    projectId: input.projectId,
    projectPath,
    entryPath,
    packageEntryPresent: rawPackagePayload !== null,
    ...comparison,
  };
}

export function compareMemoryCanonicalPackagePayloads(input: {
  projectId: string;
  dbPayload: MemoryCanonicalPackagePayload;
  packagePayload: Pick<MemoryCanonicalPackagePayload, "tables">;
  packageEntryPresent?: boolean;
}): MemoryCanonicalPackageSyncComparison {
  const tables = {} as Record<TableName, MemoryCanonicalPackageSyncTable>;
  let totalDbRows = 0;
  let totalPackageRows = 0;
  let inSync = input.packageEntryPresent !== false;

  for (const tableName of MEMORY_CANONICAL_EXPORTABLE_TABLES) {
    const rowIdInput = { projectId: input.projectId, tableName };
    const dbRows = input.dbPayload.tables[tableName];
    const packageRows = input.packagePayload.tables?.[tableName];
    const dbIds = rowIds(dbRows, rowIdInput);
    const packageIds = rowIds(packageRows, rowIdInput);
    const missingInPackage = diff(dbIds, packageIds);
    const extraInPackage = diff(packageIds, dbIds);
    const sourceIdMismatches = findSourceIdMismatches({
      projectId: input.projectId,
      tableName,
      dbRows,
      packageRows,
    });
    tables[tableName] = {
      dbRows: dbIds.length,
      packageRows: packageIds.length,
      missingInPackage,
      extraInPackage,
      sourceIdMismatches,
    };
    totalDbRows += dbIds.length;
    totalPackageRows += packageIds.length;
    if (
      missingInPackage.length > 0 ||
      extraInPackage.length > 0 ||
      sourceIdMismatches.length > 0
    ) {
      inSync = false;
    }
  }

  return {
    inSync,
    totalDbRows,
    totalPackageRows,
    tables,
  };
}
