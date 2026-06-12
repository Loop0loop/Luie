import {
  LUIE_MEMORY_CANONICAL_FILE,
  LUIE_MEMORY_DIR,
} from "../../../../../shared/constants/index.js";
import { MEMORY_CANONICAL_EXPORTABLE_TABLES } from "./memoryPersistencePolicy.js";
import { getProjectAttachmentPath } from "../../../core/project/projectAttachmentStore.js";
import { LuieMemoryCanonicalSchema } from "../../../core/project/projectLuieSchemas.js";
import { readLuieContainerEntry } from "../../../io/luieContainer.js";
import { buildMemoryCanonicalPackagePayload } from "./memoryCanonicalPackage.js";

type TableName = (typeof MEMORY_CANONICAL_EXPORTABLE_TABLES)[number];

export type MemoryCanonicalPackageSyncTable = {
  dbRows: number;
  packageRows: number;
  missingInPackage: string[];
  extraInPackage: string[];
};

export type MemoryCanonicalPackageSyncVerification = {
  projectId: string;
  projectPath: string | null;
  entryPath: string;
  packageEntryPresent: boolean;
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

export async function verifyMemoryCanonicalPackageSync(input: {
  projectId: string;
}): Promise<MemoryCanonicalPackageSyncVerification> {
  const entryPath = `${LUIE_MEMORY_DIR}/${LUIE_MEMORY_CANONICAL_FILE}`;
  const [projectPath, dbPayload] = await Promise.all([
    getProjectAttachmentPath(input.projectId),
    buildMemoryCanonicalPackagePayload(input.projectId),
  ]);

  const rawPackagePayload = projectPath
    ? await readLuieContainerEntry(projectPath, entryPath)
    : null;
  const packagePayload = rawPackagePayload
    ? LuieMemoryCanonicalSchema.parse(JSON.parse(rawPackagePayload))
    : { tables: {} };

  const tables = {} as Record<TableName, MemoryCanonicalPackageSyncTable>;
  let totalDbRows = 0;
  let totalPackageRows = 0;
  let inSync = rawPackagePayload !== null;

  for (const tableName of MEMORY_CANONICAL_EXPORTABLE_TABLES) {
    const rowIdInput = { projectId: input.projectId, tableName };
    const dbIds = rowIds(dbPayload.tables[tableName], rowIdInput);
    const packageIds = rowIds(packagePayload.tables?.[tableName], rowIdInput);
    const missingInPackage = diff(dbIds, packageIds);
    const extraInPackage = diff(packageIds, dbIds);
    tables[tableName] = {
      dbRows: dbIds.length,
      packageRows: packageIds.length,
      missingInPackage,
      extraInPackage,
    };
    totalDbRows += dbIds.length;
    totalPackageRows += packageIds.length;
    if (missingInPackage.length > 0 || extraInPackage.length > 0) {
      inSync = false;
    }
  }

  return {
    projectId: input.projectId,
    projectPath,
    entryPath,
    packageEntryPresent: rawPackagePayload !== null,
    inSync,
    totalDbRows,
    totalPackageRows,
    tables,
  };
}
