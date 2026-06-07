import { MEMORY_CANONICAL_EXPORTABLE_TABLES } from "../../../../../../shared/constants/index.js";

const _memoryCanonicalExportableTables = MEMORY_CANONICAL_EXPORTABLE_TABLES;

export type MemoryCanonicalTableName =
  (typeof _memoryCanonicalExportableTables)[number];

export type MemoryCanonicalPackagePayload = {
  schemaVersion: 1;
  exportedAt: string;
  tables: Partial<Record<MemoryCanonicalTableName, Array<Record<string, unknown>>>>;
};
