import {
  LUIE_MANUSCRIPT_DIR,
  LUIE_PACKAGE_CONTAINER_DIR,
  LUIE_PACKAGE_FORMAT,
  LUIE_PACKAGE_VERSION,
  MARKDOWN_EXTENSION,
} from "../../../../shared/constants/index.js";
import type {
  ChapterExportRecord,
  CharacterExportRecord,
  ProjectExportRecord,
  SnapshotExportRecord,
  TermExportRecord,
  WorldDrawingData,
  WorldGraphData,
  WorldMindmapData,
  WorldPlotData,
  WorldScrapMemosData,
  WorldSynopsisData,
} from "../../../../shared/types/index.js";
import {
  normalizeWorldDrawingPaths,
  normalizeWorldMindmapEdges,
  normalizeWorldMindmapNodes,
  normalizeWorldScrapMemos,
} from "../../../../shared/world/worldDocumentCodec.js";

type ParseResult<T> = { success: true; data: T } | { success: false };

type ParsedSynopsisData = {
  synopsis?: string;
  status?: "draft" | "working" | "locked";
  genre?: string;
  targetAudience?: string;
  logline?: string;
  updatedAt?: string;
};

type ParsedPlotData = {
  columns?: WorldPlotData["columns"];
  updatedAt?: string;
};

type ParsedDrawingData = {
  paths?: unknown;
  tool?: WorldDrawingData["tool"];
  iconType?: WorldDrawingData["iconType"];
  color?: string;
  lineWidth?: number;
  updatedAt?: string;
};

type ParsedMindmapData = {
  nodes?: unknown;
  edges?: unknown;
  updatedAt?: string;
};

type ParsedMemosData = {
  memos?: unknown;
  updatedAt?: string;
};

const parseAttributesRecord = (raw: string | null | undefined): Record<string, unknown> | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
};

export const buildExportChapterData = (chapters: ChapterExportRecord[]) => {
  const exportChapters = chapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    order: chapter.order,
    updatedAt: chapter.updatedAt,
    content: chapter.content,
    file: `${LUIE_MANUSCRIPT_DIR}/${chapter.id}${MARKDOWN_EXTENSION}`,
  }));
  const chapterMeta = exportChapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    order: chapter.order,
    file: chapter.file,
  }));
  return { exportChapters, chapterMeta };
};

export const buildExportCharacterData = (characters: CharacterExportRecord[]) => {
  return characters.map((character) => {
    let attributes: unknown = undefined;
    if (character.attributes) {
      try {
        attributes = JSON.parse(character.attributes);
      } catch {
        attributes = character.attributes;
      }
    }
    return {
      id: character.id,
      name: character.name,
      description: character.description,
      firstAppearance: character.firstAppearance,
      attributes,
      createdAt: character.createdAt,
      updatedAt: character.updatedAt,
    };
  });
};

export const buildExportTermData = (terms: TermExportRecord[]) => {
  return terms.map((term) => ({
    id: term.id,
    term: term.term,
    definition: term.definition,
    category: term.category,
    firstAppearance: term.firstAppearance,
    createdAt: term.createdAt,
    updatedAt: term.updatedAt,
  }));
};

export const buildExportSnapshotData = (
  snapshots: SnapshotExportRecord[],
  snapshotExportLimit: number,
) => {
  const rawSnapshots = snapshots.map((snapshot) => ({
    id: snapshot.id,
    projectId: snapshot.projectId,
    chapterId: snapshot.chapterId,
    content: snapshot.content,
    description: snapshot.description,
    createdAt: snapshot.createdAt?.toISOString?.() ?? String(snapshot.createdAt),
  }));
  return snapshotExportLimit > 0
    ? rawSnapshots.slice(0, snapshotExportLimit)
    : rawSnapshots;
};

export const buildWorldSynopsis = (
  project: ProjectExportRecord,
  parsedSynopsis: ParseResult<ParsedSynopsisData>,
): WorldSynopsisData => {
  const data = parsedSynopsis.success ? parsedSynopsis.data : undefined;
  return {
    synopsis:
      project.description ??
      (typeof data?.synopsis === "string"
        ? data.synopsis
        : ""),
    status: data?.status ?? "draft",
    genre: typeof data?.genre === "string" ? data.genre : undefined,
    targetAudience:
      typeof data?.targetAudience === "string" ? data.targetAudience : undefined,
    logline: typeof data?.logline === "string" ? data.logline : undefined,
    updatedAt: typeof data?.updatedAt === "string" ? data.updatedAt : undefined,
  };
};

export const buildWorldPlot = (
  parsedPlot: ParseResult<ParsedPlotData>,
): WorldPlotData => {
  if (!parsedPlot.success || !Array.isArray(parsedPlot.data.columns)) {
    return { columns: [] };
  }
  return {
    columns: parsedPlot.data.columns,
    updatedAt:
      typeof parsedPlot.data.updatedAt === "string"
        ? parsedPlot.data.updatedAt
        : undefined,
  };
};

export const buildWorldDrawing = (
  parsedDrawing: ParseResult<ParsedDrawingData>,
): WorldDrawingData => {
  if (!parsedDrawing.success || !Array.isArray(parsedDrawing.data.paths)) {
    return { paths: [] };
  }
  return {
    paths: normalizeWorldDrawingPaths(parsedDrawing.data.paths),
    tool: parsedDrawing.data.tool,
    iconType: parsedDrawing.data.iconType,
    color:
      typeof parsedDrawing.data.color === "string"
        ? parsedDrawing.data.color
        : undefined,
    lineWidth:
      typeof parsedDrawing.data.lineWidth === "number"
        ? parsedDrawing.data.lineWidth
        : undefined,
    updatedAt:
      typeof parsedDrawing.data.updatedAt === "string"
        ? parsedDrawing.data.updatedAt
        : undefined,
  };
};

export const buildWorldMindmap = (
  parsedMindmap: ParseResult<ParsedMindmapData>,
): WorldMindmapData => {
  if (!parsedMindmap.success) {
    return { nodes: [], edges: [] };
  }
  return {
    nodes: normalizeWorldMindmapNodes(parsedMindmap.data.nodes),
    edges: normalizeWorldMindmapEdges(parsedMindmap.data.edges),
    updatedAt:
      typeof parsedMindmap.data.updatedAt === "string"
        ? parsedMindmap.data.updatedAt
        : undefined,
  };
};

export const buildWorldScrapMemos = (
  parsedMemos: ParseResult<ParsedMemosData>,
): WorldScrapMemosData => {
  if (!parsedMemos.success) {
    return { memos: [] };
  }
  return {
    memos: normalizeWorldScrapMemos(parsedMemos.data.memos),
    updatedAt:
      typeof parsedMemos.data.updatedAt === "string"
        ? parsedMemos.data.updatedAt
        : undefined,
  };
};

const toTimestamp = (value: Date | string | undefined | null): number | null => {
  if (!value) return null;
  const parsed =
    value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const collectLatestTimestamp = (
  current: number,
  value: Date | string | undefined | null,
): number => {
  const candidate = toTimestamp(value);
  if (candidate === null) return current;
  return Math.max(current, candidate);
};

export const resolveProjectPackageUpdatedAt = (
  project: ProjectExportRecord,
  world: {
    synopsis: WorldSynopsisData;
    plot: WorldPlotData;
    drawing: WorldDrawingData;
    mindmap: WorldMindmapData;
    memos: WorldScrapMemosData;
    graphUpdatedAt?: string;
  },
): string => {
  let latestTimestamp =
    toTimestamp(project.updatedAt) ??
    toTimestamp(project.createdAt) ??
    Date.now();

  for (const chapter of project.chapters) {
    latestTimestamp = collectLatestTimestamp(latestTimestamp, chapter.updatedAt);
  }
  for (const character of project.characters) {
    latestTimestamp = collectLatestTimestamp(latestTimestamp, character.updatedAt);
  }
  for (const term of project.terms) {
    latestTimestamp = collectLatestTimestamp(latestTimestamp, term.updatedAt);
  }
  for (const faction of project.factions) {
    latestTimestamp = collectLatestTimestamp(latestTimestamp, faction.updatedAt);
  }
  for (const event of project.events) {
    latestTimestamp = collectLatestTimestamp(latestTimestamp, event.updatedAt);
  }
  for (const worldEntity of project.worldEntities) {
    latestTimestamp = collectLatestTimestamp(latestTimestamp, worldEntity.updatedAt);
  }
  for (const relation of project.entityRelations) {
    latestTimestamp = collectLatestTimestamp(latestTimestamp, relation.updatedAt);
  }
  for (const snapshot of project.snapshots) {
    latestTimestamp = collectLatestTimestamp(latestTimestamp, snapshot.createdAt);
  }

  latestTimestamp = collectLatestTimestamp(latestTimestamp, world.synopsis.updatedAt);
  latestTimestamp = collectLatestTimestamp(latestTimestamp, world.plot.updatedAt);
  latestTimestamp = collectLatestTimestamp(latestTimestamp, world.drawing.updatedAt);
  latestTimestamp = collectLatestTimestamp(latestTimestamp, world.mindmap.updatedAt);
  latestTimestamp = collectLatestTimestamp(latestTimestamp, world.memos.updatedAt);
  latestTimestamp = collectLatestTimestamp(latestTimestamp, world.graphUpdatedAt);
  for (const memo of world.memos.memos) {
    latestTimestamp = collectLatestTimestamp(latestTimestamp, memo.updatedAt);
  }

  return new Date(latestTimestamp).toISOString();
};

// `graph` is a transport/view payload built from canonical world models.
// It must not become an independent source-of-truth.
export const buildWorldGraph = (project: ProjectExportRecord): WorldGraphData => {
  const nodes: WorldGraphData["nodes"] = [
    ...project.characters.map((character) => ({
      id: character.id,
      entityType: "Character" as const,
      name: character.name,
      description: character.description ?? null,
      firstAppearance: character.firstAppearance ?? null,
      attributes: parseAttributesRecord(character.attributes),
      positionX: 0,
      positionY: 0,
    })),
    ...project.factions.map((faction) => ({
      id: faction.id,
      entityType: "Faction" as const,
      name: faction.name,
      description: faction.description ?? null,
      firstAppearance: faction.firstAppearance ?? null,
      attributes: parseAttributesRecord(faction.attributes),
      positionX: 0,
      positionY: 0,
    })),
    ...project.events.map((event) => ({
      id: event.id,
      entityType: "Event" as const,
      name: event.name,
      description: event.description ?? null,
      firstAppearance: event.firstAppearance ?? null,
      attributes: parseAttributesRecord(event.attributes),
      positionX: 0,
      positionY: 0,
    })),
    ...project.terms.map((term) => ({
      id: term.id,
      entityType: "Term" as const,
      name: term.term,
      description: term.definition ?? null,
      firstAppearance: term.firstAppearance ?? null,
      attributes: term.category ? ({ tags: [term.category] } as Record<string, unknown>) : null,
      positionX: 0,
      positionY: 0,
    })),
    ...project.worldEntities.map((entity) => ({
      id: entity.id,
      entityType: entity.type,
      subType: entity.type,
      name: entity.name,
      description: entity.description ?? null,
      firstAppearance: entity.firstAppearance ?? null,
      attributes:
        typeof entity.attributes === "string"
          ? parseAttributesRecord(entity.attributes)
          : (entity.attributes as Record<string, unknown> | null | undefined) ?? null,
      positionX: entity.positionX,
      positionY: entity.positionY,
    })),
  ];

  const edges: WorldGraphData["edges"] = project.entityRelations.map((edge) => ({
    id: edge.id,
    projectId: edge.projectId,
    sourceId: edge.sourceId,
    sourceType: edge.sourceType,
    targetId: edge.targetId,
    targetType: edge.targetType,
    relation: edge.relation,
    attributes:
      typeof edge.attributes === "string"
        ? parseAttributesRecord(edge.attributes)
        : (edge.attributes as Record<string, unknown> | null | undefined) ?? null,
    sourceWorldEntityId: edge.sourceWorldEntityId ?? null,
    targetWorldEntityId: edge.targetWorldEntityId ?? null,
    createdAt: edge.createdAt,
    updatedAt: edge.updatedAt,
  }));

  return {
    nodes,
    edges,
  };
};

export const buildProjectPackageMeta = (
  project: ProjectExportRecord,
  chapterMeta: Array<{ id: string; title: string; order: number; file: string }>,
  updatedAt?: string,
) => {
  return {
    format: LUIE_PACKAGE_FORMAT,
    container: LUIE_PACKAGE_CONTAINER_DIR,
    version: LUIE_PACKAGE_VERSION,
    projectId: project.id,
    title: project.title,
    description: project.description,
    createdAt: project.createdAt?.toISOString?.() ?? String(project.createdAt),
    updatedAt:
      typeof updatedAt === "string" && updatedAt.length > 0
        ? updatedAt
        : project.updatedAt?.toISOString?.() ?? String(project.updatedAt),
    chapters: chapterMeta,
  };
};
