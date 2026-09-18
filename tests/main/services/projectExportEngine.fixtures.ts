import { vi } from "vitest";

const getTableName = (table: unknown): string => {
  if (typeof table === "string") return table;
  const tableRecord = table as Record<string | symbol, unknown>;
  const nameSymbol = Object.getOwnPropertySymbols(tableRecord).find(
    (symbol) => String(symbol) === "Symbol(drizzle:Name)",
  );
  return nameSymbol ? String(tableRecord[nameSymbol]) : "";
};

const getRowsForTable = (
  tableName: string,
  projectRecord: Record<string, unknown>,
): unknown[] => {
  const projectId = String(projectRecord.id ?? "");
  const filterActiveRows = (rows: unknown[]): unknown[] =>
    rows.filter((row) => {
      const record = row as {
        projectId?: string;
        deletedAt?: string | null;
      };
      if (record.projectId && record.projectId !== projectId) return false;
      return !record.deletedAt;
    });
  switch (tableName) {
    case "Chapter":
      return filterActiveRows(
        Array.isArray(projectRecord.chapters) ? projectRecord.chapters : [],
      ).sort(
        (left, right) =>
          ((left as { order?: number }).order ?? 0) -
          ((right as { order?: number }).order ?? 0),
      );
    case "ChapterBody":
      return Array.isArray(projectRecord.chapterBodies)
        ? projectRecord.chapterBodies
        : [];
    case "Character":
      return filterActiveRows(
        Array.isArray(projectRecord.characters) ? projectRecord.characters : [],
      );
    case "Term":
      return filterActiveRows(
        Array.isArray(projectRecord.terms) ? projectRecord.terms : [],
      );
    case "Faction":
      return filterActiveRows(
        Array.isArray(projectRecord.factions) ? projectRecord.factions : [],
      );
    case "Event":
      return filterActiveRows(
        Array.isArray(projectRecord.events) ? projectRecord.events : [],
      );
    case "WorldEntity":
      return filterActiveRows(
        Array.isArray(projectRecord.worldEntities)
          ? projectRecord.worldEntities
          : [],
      );
    case "EntityRelation":
      return filterActiveRows(
        Array.isArray(projectRecord.entityRelations)
          ? projectRecord.entityRelations
          : [],
      );
    case "Snapshot":
      return filterActiveRows(
        Array.isArray(projectRecord.snapshots) ? projectRecord.snapshots : [],
      ).sort(
        (left, right) =>
          Date.parse((right as { createdAt?: string }).createdAt ?? "") -
          Date.parse((left as { createdAt?: string }).createdAt ?? ""),
      );
    default:
      return [];
  }
};

const makeTerminal = (result: unknown) =>
  Object.assign(Promise.resolve(result), {
    select: vi.fn(() => makeTerminal([])),
    from: vi.fn(() => makeTerminal([])),
    where: vi.fn(() => makeTerminal([])),
    orderBy: vi.fn(() => makeTerminal(result)),
    limit: vi.fn(() => makeTerminal(result)),
  });

const makeAsyncTerminal = (dataPromise: Promise<unknown>) => {
  const terminal = Object.assign(dataPromise, {
    select: vi.fn(() => makeTerminal([])),
    from: vi.fn(() => makeTerminal([])),
    where: vi.fn(() => makeTerminal([])),
    orderBy: vi.fn(() => terminal),
    limit: vi.fn((limit: number) =>
      makeAsyncTerminal(
        dataPromise.then((data) =>
          Array.isArray(data) ? data.slice(0, limit) : data,
        ),
      ),
    ),
  });
  return terminal;
};

export const createProjectExportDbClient = (
  projectFindUnique: () => Promise<unknown>,
) => {
  const projectRecordPromise = projectFindUnique();
  return {
    delete: vi.fn(() => ({
      where: vi.fn(async () => undefined),
    })),
    select: vi.fn(() => ({
      from: vi.fn((table: unknown) => {
        const tableName = getTableName(table);
        if (tableName === "Project") {
          return {
            where: vi.fn(() =>
              makeAsyncTerminal(
                projectRecordPromise.then((resolved) => [resolved]),
              ),
            ),
          };
        }
        return {
          where: vi.fn(() =>
            makeAsyncTerminal(
              projectRecordPromise.then((resolved) =>
                getRowsForTable(tableName, resolved as Record<string, unknown>),
              ),
            ),
          ),
          leftJoin: vi.fn(() => ({
            where: vi.fn(() =>
              makeAsyncTerminal(
                projectRecordPromise.then((resolved) => {
                  const projectRecord = resolved as Record<string, unknown>;
                  const rows = getRowsForTable(tableName, projectRecord);
                  const bodies = getRowsForTable("ChapterBody", projectRecord);
                  return rows.map((row) => ({
                    ...(row as Record<string, unknown>),
                    content:
                      (
                        bodies.find(
                          (body) =>
                            (body as { chapterId?: string }).chapterId ===
                            (row as { id?: string }).id,
                        ) as { content?: string } | undefined
                      )?.content ??
                      (row as { content?: string }).content ??
                      "",
                  }));
                }),
              ),
            ),
          })),
        };
      }),
    })),
  };
};
