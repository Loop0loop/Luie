import { and, eq, getTableColumns } from "drizzle-orm";
import type { AnySQLiteTable } from "drizzle-orm/sqlite-core";
import type { DbLike } from "../../../infra/database/index.js";
import {
  memoryEntity,
  memoryEntityAlias,
  memoryEpisode,
  memoryEpisodeEvidence,
  memoryEvalCase,
  memoryEvalEntity,
  memoryEvalEvidence,
  memoryEvalRelation,
  memoryFact,
  memoryFactEvidence,
  memoryFactInvalidation,
} from "../../../infra/database/index.js";
import { MEMORY_CANONICAL_EXPORTABLE_TABLES } from "../memory/persistence/memoryPersistencePolicy.js";
import type { SyncBundle } from "./syncMapper.js";

type MemorySyncTableName =
  (typeof MEMORY_CANONICAL_EXPORTABLE_TABLES)[number];

const MEMORY_SYNC_TABLE_BY_NAME = {
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
} satisfies Record<MemorySyncTableName, AnySQLiteTable>;

const MEMORY_SYNC_TABLES = MEMORY_CANONICAL_EXPORTABLE_TABLES.map(
  (name) => [name, MEMORY_SYNC_TABLE_BY_NAME[name]] as const,
);

const MEMORY_SYNC_DEPENDENCIES = [
  ["MemoryEntity", "MemoryEntityAlias", "entityId"],
  ["MemoryEntity", "MemoryFact", "subjectEntityId"],
  ["MemoryEntity", "MemoryFact", "objectEntityId"],
  ["MemoryEpisode", "MemoryEpisodeEvidence", "episodeId"],
  ["MemoryEpisodeEvidence", "MemoryFactEvidence", "evidenceId"],
  ["MemoryFact", "MemoryFact", "invalidatedByFactId"],
  ["MemoryFact", "MemoryFactEvidence", "factId"],
  ["MemoryFact", "MemoryFactInvalidation", "invalidatedFactId"],
  ["MemoryFact", "MemoryFactInvalidation", "invalidatingFactId"],
  ["MemoryEvalCase", "MemoryEvalEvidence", "caseId"],
  ["MemoryEvalCase", "MemoryEvalEntity", "caseId"],
  ["MemoryEvalCase", "MemoryEvalRelation", "caseId"],
] as const satisfies readonly (readonly [
  MemorySyncTableName,
  MemorySyncTableName,
  string,
])[];

type SyncTable = (typeof MEMORY_SYNC_TABLES)[number][1];
type UpsertBuilder = {
  values: (row: Record<string, unknown>) => {
    onConflictDoUpdate: (input: {
      target: unknown;
      set: Record<string, unknown>;
    }) => { run: () => unknown };
  };
};

const rowsForTable = (
  bundle: SyncBundle,
  tableName: string,
  deletedProjectIds: ReadonlySet<string>,
) =>
  (bundle.memoryCanonicalRows ?? []).filter(
    (item) =>
      item.tableName === tableName &&
      !deletedProjectIds.has(item.projectId) &&
      typeof item.row.id === "string" &&
      item.row.projectId === item.projectId,
  );

const databaseRow = (
  table: SyncTable,
  row: Record<string, unknown>,
): Record<string, unknown> => {
  const columnNames = new Set(Object.keys(getTableColumns(table)));
  return Object.fromEntries(
    Object.entries(row).filter(([name]) => columnNames.has(name)),
  );
};

const upsert = (
  tx: DbLike,
  table: SyncTable,
  row: Record<string, unknown>,
): void => {
  const columns = getTableColumns(table);
  const data = databaseRow(table, row);
  const { id: _id, ...set } = data;
  (tx.insert(table) as unknown as UpsertBuilder)
    .values(data)
    .onConflictDoUpdate({ target: columns.id, set })
    .run();
};

const assertDeletesAreExplicit = (
  tx: DbLike,
  bundle: SyncBundle,
  deletedProjectIds: ReadonlySet<string>,
): void => {
  const explicitDeletes = new Map<
    MemorySyncTableName,
    Map<string, Set<string>>
  >();
  for (const [tableName] of MEMORY_SYNC_TABLES) {
    for (const item of rowsForTable(bundle, tableName, deletedProjectIds)) {
      if (!item.deletedAt) continue;
      const projects = explicitDeletes.get(tableName) ?? new Map();
      const ids = projects.get(item.projectId) ?? new Set<string>();
      ids.add(item.row.id as string);
      projects.set(item.projectId, ids);
      explicitDeletes.set(tableName, projects);
    }
  }

  for (const [parentTableName] of MEMORY_SYNC_TABLES) {
    const dependencies = MEMORY_SYNC_DEPENDENCIES.filter(
      ([candidate]) => candidate === parentTableName,
    );
    if (dependencies.length === 0) continue;
    for (const parent of rowsForTable(
      bundle,
      parentTableName,
      deletedProjectIds,
    )) {
      if (!parent.deletedAt) continue;
      const parentTable = MEMORY_SYNC_TABLE_BY_NAME[parentTableName];
      const parentColumns = getTableColumns(
        parentTable,
      ) as unknown as Record<string, typeof memoryEntity.id>;
      const existingParent = tx
        .select({ id: parentColumns.id })
        .from(parentTable)
        .where(
          and(
            eq(parentColumns.id, parent.row.id as string),
            eq(parentColumns.projectId, parent.projectId),
          ),
        )
        .get();
      if (!existingParent) continue;
      for (const [, childTableName, foreignKey] of dependencies) {
        const childTable = MEMORY_SYNC_TABLE_BY_NAME[childTableName];
        const columns = getTableColumns(childTable) as unknown as Record<
          string,
          typeof memoryEntity.id
        >;
        const children = tx
          .select({ id: columns.id, projectId: columns.projectId })
          .from(childTable)
          .where(eq(columns[foreignKey], parent.row.id as string))
          .all();
        const unmentioned = children.find(
          (child) =>
            !(
              explicitDeletes
                .get(childTableName)
                ?.get(child.projectId) ??
              new Set<string>()
            ).has(child.id),
        );
        if (unmentioned) {
          throw new Error(
            `SYNC_MEMORY_DELETE_BLOCKED:${parent.projectId}:${parentTableName}:${String(parent.row.id)}:${unmentioned.projectId}:${childTableName}:${unmentioned.id}`,
          );
        }
      }
    }
  }
};

export function applyMemoryCanonicalSyncRows(
  tx: DbLike,
  bundle: SyncBundle,
  deletedProjectIds: ReadonlySet<string>,
): void {
  for (const [tableName, table] of MEMORY_SYNC_TABLES) {
    const rows = rowsForTable(bundle, tableName, deletedProjectIds).filter(
      (item) => !item.deletedAt,
    );
    for (const item of rows) {
      upsert(
        tx,
        table,
        tableName === "MemoryFact"
          ? { ...item.row, invalidatedByFactId: null }
          : item.row,
      );
    }
    if (tableName === "MemoryFact") {
      for (const item of rows) {
        if (typeof item.row.invalidatedByFactId !== "string") continue;
        tx.update(memoryFact)
          .set({ invalidatedByFactId: item.row.invalidatedByFactId })
          .where(
            and(
              eq(memoryFact.id, item.row.id as string),
              eq(memoryFact.projectId, item.projectId),
            ),
          )
          .run();
      }
    }
  }

  assertDeletesAreExplicit(tx, bundle, deletedProjectIds);

  for (const [tableName, table] of [...MEMORY_SYNC_TABLES].reverse()) {
    const columns = getTableColumns(table);
    for (const item of rowsForTable(bundle, tableName, deletedProjectIds)) {
      if (!item.deletedAt) continue;
      tx.delete(table)
        .where(
          and(
            eq(columns.id, item.row.id as string),
            eq(columns.projectId, item.projectId),
          ),
        )
        .run();
    }
  }
}
