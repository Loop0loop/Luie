/**
 * Project service - 프로젝트 관리 비즈니스 로직
 */

import { db } from "../../database/index.js";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createLogger } from "../../../shared/logger/index.js";
import {
  ErrorCode,
  DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
  LUIE_PACKAGE_EXTENSION,
  LUIE_SNAPSHOTS_DIR,
  LUIE_PACKAGE_FORMAT,
  LUIE_PACKAGE_CONTAINER_DIR,
  LUIE_PACKAGE_VERSION,
  PACKAGE_EXPORT_DEBOUNCE_MS,
  LUIE_MANUSCRIPT_DIR,
  MARKDOWN_EXTENSION,
  SNAPSHOT_FILE_KEEP_COUNT,
  LUIE_PACKAGE_META_FILENAME,
  LUIE_WORLD_DIR,
  LUIE_WORLD_CHARACTERS_FILE,
  LUIE_WORLD_TERMS_FILE,
  LUIE_WORLD_SYNOPSIS_FILE,
  LUIE_WORLD_PLOT_FILE,
  LUIE_WORLD_DRAWING_FILE,
  LUIE_WORLD_MINDMAP_FILE,
  LUIE_WORLD_SCRAP_MEMOS_FILE,
  LUIE_WORLD_GRAPH_FILE,
} from "../../../shared/constants/index.js";
import { sanitizeName } from "../../../shared/utils/sanitize.js";
import { isWorldEntityBackedType } from "../../../shared/constants/worldRelationRules.js";
import type {
  ProjectCreateInput,
  ProjectUpdateInput,
  ProjectExportRecord,
  ChapterExportRecord,
  CharacterExportRecord,
  TermExportRecord,
  SnapshotExportRecord,
  WorldDrawingData,
  WorldMindmapData,
  WorldPlotData,
  WorldScrapMemosData,
  WorldSynopsisData,
  WorldGraphData,
  WorldEntityType,
  WorldEntitySourceType,
  RelationKind,
} from "../../../shared/types/index.js";
import {
  normalizeWorldDrawingPaths,
  normalizeWorldMindmapEdges,
  normalizeWorldMindmapNodes,
  normalizeWorldScrapMemos,
  parseWorldJsonSafely,
} from "../../../shared/world/worldDocumentCodec.js";
import { writeLuiePackage } from "../../handler/system/ipcFsHandlers.js";
import { ServiceError } from "../../utils/serviceError.js";
import { ensureLuieExtension, readLuieEntry } from "../../utils/luiePackage.js";
import { settingsManager } from "../../manager/settingsManager.js";

const logger = createLogger("ProjectService");

const LuieMetaSchema = z
  .object({
    format: z.string().optional(),
    version: z.number().optional(),
    projectId: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional().nullable(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    chapters: z
      .array(
        z.object({
          id: z.string().optional(),
          title: z.string().optional(),
          order: z.number().optional(),
          file: z.string().optional(),
          content: z.string().optional(),
          updatedAt: z.string().optional(),
        }),
      )
      .optional(),
  })
  .passthrough();

const LuieCharactersSchema = z
  .object({
    characters: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

const LuieTermsSchema = z
  .object({
    terms: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

const LuieWorldSynopsisSchema = z
  .object({
    synopsis: z.string().optional(),
    status: z.enum(["draft", "working", "locked"]).optional(),
    genre: z.string().optional(),
    targetAudience: z.string().optional(),
    logline: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const LuieWorldPlotSchema = z
  .object({
    columns: z
      .array(
        z.object({
          id: z.string(),
          title: z.string(),
          cards: z.array(
            z.object({
              id: z.string(),
              content: z.string(),
            }),
          ),
        }),
      )
      .optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const LuieWorldDrawingSchema = z
  .object({
    paths: z.array(z.record(z.string(), z.unknown())).optional(),
    tool: z.enum(["pen", "text", "eraser", "icon"]).optional(),
    iconType: z.enum(["mountain", "castle", "village"]).optional(),
    color: z.string().optional(),
    lineWidth: z.number().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const LuieWorldMindmapSchema = z
  .object({
    nodes: z.array(z.record(z.string(), z.unknown())).optional(),
    edges: z.array(z.record(z.string(), z.unknown())).optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const LuieWorldScrapMemosSchema = z
  .object({
    memos: z.array(z.record(z.string(), z.unknown())).optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const LuieWorldGraphNodeSchema = z
  .object({
    id: z.string(),
    entityType: z.string(),
    subType: z.string().optional(),
    name: z.string(),
    description: z.string().optional().nullable(),
    firstAppearance: z.string().optional().nullable(),
    attributes: z.record(z.string(), z.unknown()).optional().nullable(),
    positionX: z.number().optional(),
    positionY: z.number().optional(),
  })
  .passthrough();

const LuieWorldGraphEdgeSchema = z
  .object({
    id: z.string(),
    sourceId: z.string(),
    sourceType: z.string(),
    targetId: z.string(),
    targetType: z.string(),
    relation: z.string(),
    attributes: z.record(z.string(), z.unknown()).optional().nullable(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const LuieWorldGraphSchema = z
  .object({
    nodes: z.array(LuieWorldGraphNodeSchema).optional(),
    edges: z.array(LuieWorldGraphEdgeSchema).optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const LuieSnapshotSchema = z
  .object({
    id: z.string(),
    projectId: z.string().optional(),
    chapterId: z.string().optional().nullable(),
    content: z.string().optional(),
    description: z.string().optional().nullable(),
    createdAt: z.string().optional(),
  })
  .passthrough();

const LuieSnapshotsSchema = z
  .object({
    snapshots: z.array(LuieSnapshotSchema).optional(),
  })
  .passthrough();

const parseJsonSafely = parseWorldJsonSafely;

type LuieMeta = z.infer<typeof LuieMetaSchema>;
type ExistingProjectLookup = { id: string; updatedAt: Date } | null;
type LuieMetaReadResult = {
  meta: LuieMeta | null;
  luieCorrupted: boolean;
  recoveryReason?: "missing" | "corrupt";
};
type ChapterCreateRow = {
  id: string;
  projectId: string;
  title: string;
  content: string;
  synopsis?: string | null;
  order: number;
  wordCount: number;
};
type CharacterCreateRow = {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  firstAppearance: string | null;
  attributes: string | null;
};
type TermCreateRow = {
  id: string;
  projectId: string;
  term: string;
  definition: string | null;
  category: string | null;
  firstAppearance: string | null;
};
type SnapshotCreateRow = {
  id: string;
  projectId: string;
  chapterId: string | null;
  content: string;
  contentLength: number;
  description: string | null;
  createdAt: Date;
};
type FactionCreateRow = {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  firstAppearance: string | null;
  attributes: string | null;
};
type EventCreateRow = {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  firstAppearance: string | null;
  attributes: string | null;
};
type WorldEntityCreateRow = {
  id: string;
  projectId: string;
  type: WorldEntityType;
  name: string;
  description: string | null;
  firstAppearance: string | null;
  attributes: string | null;
  positionX: number;
  positionY: number;
};
type EntityRelationCreateRow = {
  id: string;
  projectId: string;
  sourceId: string;
  sourceType: WorldEntitySourceType;
  targetId: string;
  targetType: WorldEntitySourceType;
  relation: RelationKind;
  attributes: string | null;
  sourceWorldEntityId: string | null;
  targetWorldEntityId: string | null;
};
type LuieImportCollections = {
  characters: Array<Record<string, unknown>>;
  terms: Array<Record<string, unknown>>;
  snapshots: Array<z.infer<typeof LuieSnapshotSchema>>;
  worldSynopsis?: string;
  graph?: z.infer<typeof LuieWorldGraphSchema>;
};

type GraphImportRows = {
  charactersForCreate: CharacterCreateRow[];
  termsForCreate: TermCreateRow[];
  factionsForCreate: FactionCreateRow[];
  eventsForCreate: EventCreateRow[];
  worldEntitiesForCreate: WorldEntityCreateRow[];
  relationsForCreate: EntityRelationCreateRow[];
};

type GraphImportState = GraphImportRows & {
  characterIds: Set<string>;
  termIds: Set<string>;
  factionIds: Set<string>;
  eventIds: Set<string>;
  worldEntityIds: Set<string>;
};

const WORLD_ENTITY_SOURCE_TYPES = [
  "Character",
  "Faction",
  "Event",
  "Place",
  "Concept",
  "Rule",
  "Item",
  "Term",
  "WorldEntity",
] as const satisfies readonly WorldEntitySourceType[];

const WORLD_ENTITY_TYPES = ["Place", "Concept", "Rule", "Item"] as const satisfies readonly WorldEntityType[];

const RELATION_KINDS = [
  "belongs_to",
  "enemy_of",
  "causes",
  "controls",
  "located_in",
  "violates",
] as const satisfies readonly RelationKind[];

const isWorldEntitySourceType = (value: unknown): value is WorldEntitySourceType =>
  typeof value === "string" &&
  WORLD_ENTITY_SOURCE_TYPES.includes(value as WorldEntitySourceType);

const isWorldEntityType = (value: unknown): value is WorldEntityType =>
  typeof value === "string" &&
  WORLD_ENTITY_TYPES.includes(value as WorldEntityType);

const isRelationKind = (value: unknown): value is RelationKind =>
  typeof value === "string" &&
  RELATION_KINDS.includes(value as RelationKind);

export class ProjectService {
  private exportTimers = new Map<string, NodeJS.Timeout>();
  private exportInFlight = new Map<string, Promise<void>>();

  async createProject(input: ProjectCreateInput) {
    try {
      logger.info("Creating project", input);

      const project = await db.getClient().project.create({
        data: {
          title: input.title,
          description: input.description,
          projectPath: input.projectPath,
          settings: {
            create: {
              autoSave: true,
              autoSaveInterval: DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
            },
          },
        },
        include: {
          settings: true,
        },
      });

      const projectId = String(project.id);
      logger.info("Project created successfully", { projectId });
      this.schedulePackageExport(projectId, "project:create");
      return project;
    } catch (error) {
      logger.error("Failed to create project", error);
      throw new ServiceError(
        ErrorCode.PROJECT_CREATE_FAILED,
        "Failed to create project",
        { input },
        error,
      );
    }
  }

  private async readMetaOrMarkCorrupt(
    resolvedPath: string,
  ): Promise<LuieMetaReadResult> {
    try {
      await fs.access(resolvedPath);
    } catch {
      return {
        meta: null,
        luieCorrupted: true,
        recoveryReason: "missing",
      };
    }

    try {
      const metaRaw = await readLuieEntry(resolvedPath, LUIE_PACKAGE_META_FILENAME, logger);
      if (!metaRaw) {
        throw new Error("MISSING_META");
      }
      const parsedMeta = LuieMetaSchema.safeParse(JSON.parse(metaRaw));
      if (!parsedMeta.success) {
        throw new Error("INVALID_META");
      }
      return { meta: parsedMeta.data, luieCorrupted: false };
    } catch (error) {
      logger.warn("Failed to read .luie meta; treating as corrupted", {
        packagePath: resolvedPath,
        error,
      });
      return { meta: null, luieCorrupted: true, recoveryReason: "corrupt" };
    }
  }

  private async findProjectByPath(resolvedPath: string): Promise<ExistingProjectLookup> {
    return (await db.getClient().project.findFirst({
      where: { projectPath: resolvedPath },
      select: { id: true, updatedAt: true },
    })) as ExistingProjectLookup;
  }

  private resolveImportIdentity(
    meta: LuieMeta,
    existingByPath: ExistingProjectLookup,
  ): { resolvedProjectId: string; legacyProjectId: string | null } {
    const metaProjectId = typeof meta.projectId === "string" ? meta.projectId : undefined;
    const resolvedProjectId = metaProjectId ?? existingByPath?.id ?? randomUUID();
    const legacyProjectId =
      existingByPath && existingByPath.id !== resolvedProjectId
        ? existingByPath.id
        : null;
    return { resolvedProjectId, legacyProjectId };
  }

  private buildRecoveryTimestamp(date = new Date()): string {
    const pad = (value: number) => String(value).padStart(2, "0");
    return (
      `${date.getFullYear()}` +
      `${pad(date.getMonth() + 1)}` +
      `${pad(date.getDate())}` +
      `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
    );
  }

  private async resolveRecoveredPackagePath(resolvedPath: string): Promise<string> {
    const normalized = ensureLuieExtension(resolvedPath);
    const ext = LUIE_PACKAGE_EXTENSION;
    const lower = normalized.toLowerCase();
    const base = lower.endsWith(ext)
      ? normalized.slice(0, normalized.length - ext.length)
      : normalized;
    const timestamp = this.buildRecoveryTimestamp();
    let candidate = `${base}.recovered-${timestamp}${ext}`;
    let suffix = 1;

    for (;;) {
      try {
        await fs.access(candidate);
        candidate = `${base}.recovered-${timestamp}-${suffix}${ext}`;
        suffix += 1;
      } catch {
        return candidate;
      }
    }
  }

  private async readLuieImportCollections(
    resolvedPath: string,
  ): Promise<LuieImportCollections> {
    const [charactersRaw, termsRaw, snapshotsRaw, worldSynopsisRaw, worldGraphRaw] = await Promise.all([
      readLuieEntry(resolvedPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_CHARACTERS_FILE}`, logger),
      readLuieEntry(resolvedPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_TERMS_FILE}`, logger),
      readLuieEntry(resolvedPath, `${LUIE_SNAPSHOTS_DIR}/index.json`, logger),
      readLuieEntry(resolvedPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_SYNOPSIS_FILE}`, logger),
      readLuieEntry(resolvedPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_GRAPH_FILE}`, logger),
    ]);

    const parsedCharacters = LuieCharactersSchema.safeParse(parseJsonSafely(charactersRaw));
    const parsedTerms = LuieTermsSchema.safeParse(parseJsonSafely(termsRaw));
    const parsedSnapshots = LuieSnapshotsSchema.safeParse(parseJsonSafely(snapshotsRaw));
    const parsedWorldSynopsis = LuieWorldSynopsisSchema.safeParse(
      parseJsonSafely(worldSynopsisRaw),
    );
    const parsedGraph = LuieWorldGraphSchema.safeParse(parseJsonSafely(worldGraphRaw));

    return {
      characters: parsedCharacters.success ? parsedCharacters.data.characters ?? [] : [],
      terms: parsedTerms.success ? parsedTerms.data.terms ?? [] : [],
      snapshots: parsedSnapshots.success ? parsedSnapshots.data.snapshots ?? [] : [],
      worldSynopsis:
        parsedWorldSynopsis.success &&
        typeof parsedWorldSynopsis.data.synopsis === "string"
          ? parsedWorldSynopsis.data.synopsis
          : undefined,
      graph: parsedGraph.success
        ? {
            nodes: parsedGraph.data.nodes ?? [],
            edges: parsedGraph.data.edges ?? [],
            updatedAt: parsedGraph.data.updatedAt,
          }
        : undefined,
    };
  }

  private async buildChapterCreateRows(
    resolvedPath: string,
    resolvedProjectId: string,
    chaptersMeta: NonNullable<LuieMeta["chapters"]>,
  ): Promise<ChapterCreateRow[]> {
    const chaptersForCreate: ChapterCreateRow[] = [];
    for (let index = 0; index < chaptersMeta.length; index += 1) {
      const chapter = chaptersMeta[index];
      const chapterId = chapter.id ?? randomUUID();
      const entryPath =
        chapter.file ?? `${LUIE_MANUSCRIPT_DIR}/${chapterId}${MARKDOWN_EXTENSION}`;
      const contentRaw =
        typeof chapter.content === "string"
          ? chapter.content
          : await readLuieEntry(resolvedPath, entryPath, logger);
      const content = contentRaw ?? "";

      chaptersForCreate.push({
        id: chapterId,
        projectId: resolvedProjectId,
        title: chapter.title ?? `Chapter ${index + 1}`,
        content,
        synopsis: null,
        order: typeof chapter.order === "number" ? chapter.order : index,
        wordCount: content.length,
      });
    }
    return chaptersForCreate;
  }

  private buildCharacterCreateRows(
    resolvedProjectId: string,
    characters: Array<Record<string, unknown>>,
  ): CharacterCreateRow[] {
    return characters.map((character, index) => {
      const name =
        typeof character.name === "string" && character.name.trim().length > 0
          ? character.name
          : `Character ${index + 1}`;
      const attributes =
        typeof character.attributes === "string"
          ? character.attributes
          : character.attributes
            ? JSON.stringify(character.attributes)
            : null;
      return {
        id: typeof character.id === "string" ? character.id : randomUUID(),
        projectId: resolvedProjectId,
        name,
        description:
          typeof character.description === "string" ? character.description : null,
        firstAppearance:
          typeof character.firstAppearance === "string" ? character.firstAppearance : null,
        attributes,
      };
    });
  }

  private buildTermCreateRows(
    resolvedProjectId: string,
    terms: Array<Record<string, unknown>>,
  ): TermCreateRow[] {
    return terms.map((term, index) => {
      const termLabel =
        typeof term.term === "string" && term.term.trim().length > 0
          ? term.term
          : `Term ${index + 1}`;
      return {
        id: typeof term.id === "string" ? term.id : randomUUID(),
        projectId: resolvedProjectId,
        term: termLabel,
        definition: typeof term.definition === "string" ? term.definition : null,
        category: typeof term.category === "string" ? term.category : null,
        firstAppearance:
          typeof term.firstAppearance === "string" ? term.firstAppearance : null,
      };
    });
  }

  private buildSnapshotCreateRows(
    resolvedProjectId: string,
    snapshots: Array<z.infer<typeof LuieSnapshotSchema>>,
  ): SnapshotCreateRow[] {
    return snapshots
      .filter((snapshot) => typeof snapshot.id === "string")
      .map((snapshot) => {
        const content = snapshot.content ?? "";
        return {
          id: snapshot.id,
          projectId: snapshot.projectId ?? resolvedProjectId,
          chapterId:
            typeof snapshot.chapterId === "string" ? snapshot.chapterId : null,
          content,
          contentLength: content.length,
          description:
            typeof snapshot.description === "string" ? snapshot.description : null,
          createdAt: snapshot.createdAt ? new Date(snapshot.createdAt) : new Date(),
        };
      });
  }

  private serializeAttributes(input: unknown): string | null {
    if (input === undefined || input === null) {
      return null;
    }
    if (typeof input === "string") {
      return input;
    }
    try {
      return JSON.stringify(input);
    } catch {
      return null;
    }
  }

  private getWorldEntityType(
    entityType: WorldEntitySourceType,
    subType: unknown,
  ): WorldEntityType | null {
    if (isWorldEntityType(entityType)) {
      return entityType;
    }
    if (entityType === "WorldEntity" && isWorldEntityType(subType)) {
      return subType;
    }
    return null;
  }

  private createGraphImportState(baseCharacters: CharacterCreateRow[], baseTerms: TermCreateRow[]): GraphImportState {
    return {
      charactersForCreate: [...baseCharacters],
      termsForCreate: [...baseTerms],
      factionsForCreate: [],
      eventsForCreate: [],
      worldEntitiesForCreate: [],
      relationsForCreate: [],
      characterIds: new Set(baseCharacters.map((row) => row.id)),
      termIds: new Set(baseTerms.map((row) => row.id)),
      factionIds: new Set<string>(),
      eventIds: new Set<string>(),
      worldEntityIds: new Set<string>(),
    };
  }

  private resolveGraphNodeType(node: z.infer<typeof LuieWorldGraphNodeSchema>): WorldEntitySourceType | null {
    if (isWorldEntitySourceType(node.entityType)) {
      return node.entityType;
    }
    if (isWorldEntityType(node.subType)) {
      return node.subType;
    }
    return null;
  }

  private addCharacterNode(state: GraphImportState, projectId: string, node: z.infer<typeof LuieWorldGraphNodeSchema>): void {
    if (state.characterIds.has(node.id)) return;
    state.characterIds.add(node.id);
    state.charactersForCreate.push({
      id: node.id,
      projectId,
      name: node.name,
      description: typeof node.description === "string" ? node.description : null,
      firstAppearance: typeof node.firstAppearance === "string" ? node.firstAppearance : null,
      attributes: this.serializeAttributes(node.attributes),
    });
  }

  private addTermNode(state: GraphImportState, projectId: string, node: z.infer<typeof LuieWorldGraphNodeSchema>): void {
    if (state.termIds.has(node.id)) return;
    state.termIds.add(node.id);
    const tagCandidate = Array.isArray(node.attributes?.tags)
      ? node.attributes.tags.find((tag): tag is string => typeof tag === "string")
      : null;
    state.termsForCreate.push({
      id: node.id,
      projectId,
      term: node.name,
      definition: typeof node.description === "string" ? node.description : null,
      category: tagCandidate ?? null,
      firstAppearance: typeof node.firstAppearance === "string" ? node.firstAppearance : null,
    });
  }

  private addFactionNode(state: GraphImportState, projectId: string, node: z.infer<typeof LuieWorldGraphNodeSchema>): void {
    if (state.factionIds.has(node.id)) return;
    state.factionIds.add(node.id);
    state.factionsForCreate.push({
      id: node.id,
      projectId,
      name: node.name,
      description: typeof node.description === "string" ? node.description : null,
      firstAppearance: typeof node.firstAppearance === "string" ? node.firstAppearance : null,
      attributes: this.serializeAttributes(node.attributes),
    });
  }

  private addEventNode(state: GraphImportState, projectId: string, node: z.infer<typeof LuieWorldGraphNodeSchema>): void {
    if (state.eventIds.has(node.id)) return;
    state.eventIds.add(node.id);
    state.eventsForCreate.push({
      id: node.id,
      projectId,
      name: node.name,
      description: typeof node.description === "string" ? node.description : null,
      firstAppearance: typeof node.firstAppearance === "string" ? node.firstAppearance : null,
      attributes: this.serializeAttributes(node.attributes),
    });
  }

  private addWorldEntityNode(
    state: GraphImportState,
    projectId: string,
    entityType: WorldEntitySourceType,
    node: z.infer<typeof LuieWorldGraphNodeSchema>,
  ): void {
    const worldEntityType = this.getWorldEntityType(entityType, node.subType);
    if (!worldEntityType || state.worldEntityIds.has(node.id)) {
      return;
    }
    state.worldEntityIds.add(node.id);
    state.worldEntitiesForCreate.push({
      id: node.id,
      projectId,
      type: worldEntityType,
      name: node.name,
      description: typeof node.description === "string" ? node.description : null,
      firstAppearance: typeof node.firstAppearance === "string" ? node.firstAppearance : null,
      attributes: this.serializeAttributes(node.attributes),
      positionX: typeof node.positionX === "number" ? node.positionX : 0,
      positionY: typeof node.positionY === "number" ? node.positionY : 0,
    });
  }

  private hasGraphEntity(state: GraphImportState, entityType: WorldEntitySourceType, entityId: string): boolean {
    switch (entityType) {
      case "Character":
        return state.characterIds.has(entityId);
      case "Term":
        return state.termIds.has(entityId);
      case "Faction":
        return state.factionIds.has(entityId);
      case "Event":
        return state.eventIds.has(entityId);
      case "Place":
      case "Concept":
      case "Rule":
      case "Item":
      case "WorldEntity":
        return state.worldEntityIds.has(entityId);
      default:
        return false;
    }
  }

  private addGraphNodeToState(
    state: GraphImportState,
    projectId: string,
    node: z.infer<typeof LuieWorldGraphNodeSchema>,
  ): void {
    if (!node.id || !node.name) {
      return;
    }
    const entityType = this.resolveGraphNodeType(node);
    if (!entityType) {
      return;
    }

    if (entityType === "Character") {
      this.addCharacterNode(state, projectId, node);
      return;
    }
    if (entityType === "Term") {
      this.addTermNode(state, projectId, node);
      return;
    }
    if (entityType === "Faction") {
      this.addFactionNode(state, projectId, node);
      return;
    }
    if (entityType === "Event") {
      this.addEventNode(state, projectId, node);
      return;
    }
    this.addWorldEntityNode(state, projectId, entityType, node);
  }

  private addGraphEdgeToState(
    state: GraphImportState,
    projectId: string,
    edge: z.infer<typeof LuieWorldGraphEdgeSchema>,
  ): void {
    if (!edge.sourceId || !edge.targetId) {
      return;
    }
    if (!isWorldEntitySourceType(edge.sourceType) || !isWorldEntitySourceType(edge.targetType)) {
      return;
    }
    if (!isRelationKind(edge.relation)) {
      return;
    }
    if (
      !this.hasGraphEntity(state, edge.sourceType, edge.sourceId) ||
      !this.hasGraphEntity(state, edge.targetType, edge.targetId)
    ) {
      return;
    }

    state.relationsForCreate.push({
      id: edge.id || randomUUID(),
      projectId,
      sourceId: edge.sourceId,
      sourceType: edge.sourceType,
      targetId: edge.targetId,
      targetType: edge.targetType,
      relation: edge.relation,
      attributes: this.serializeAttributes(edge.attributes),
      sourceWorldEntityId:
        isWorldEntityBackedType(edge.sourceType) && state.worldEntityIds.has(edge.sourceId)
          ? edge.sourceId
          : null,
      targetWorldEntityId:
        isWorldEntityBackedType(edge.targetType) && state.worldEntityIds.has(edge.targetId)
          ? edge.targetId
          : null,
    });
  }

  private buildGraphCreateRows(input: {
    projectId: string;
    graph?: z.infer<typeof LuieWorldGraphSchema>;
    baseCharacters: CharacterCreateRow[];
    baseTerms: TermCreateRow[];
  }): GraphImportRows {
    const state = this.createGraphImportState(input.baseCharacters, input.baseTerms);

    if (!input.graph) {
      return state;
    }

    for (const node of input.graph.nodes ?? []) {
      this.addGraphNodeToState(state, input.projectId, node);
    }
    for (const edge of input.graph.edges ?? []) {
      this.addGraphEdgeToState(state, input.projectId, edge);
    }

    return state;
  }

  private async applyImportTransaction(input: {
    resolvedProjectId: string;
    legacyProjectId: string | null;
    existing: ExistingProjectLookup;
    meta: LuieMeta;
    worldSynopsis?: string;
    resolvedPath: string;
    chaptersForCreate: ChapterCreateRow[];
    charactersForCreate: CharacterCreateRow[];
    termsForCreate: TermCreateRow[];
    factionsForCreate: FactionCreateRow[];
    eventsForCreate: EventCreateRow[];
    worldEntitiesForCreate: WorldEntityCreateRow[];
    relationsForCreate: EntityRelationCreateRow[];
    snapshotsForCreate: SnapshotCreateRow[];
  }) {
    const {
      resolvedProjectId,
      legacyProjectId,
      existing,
      meta,
      worldSynopsis,
      resolvedPath,
      chaptersForCreate,
      charactersForCreate,
      termsForCreate,
      factionsForCreate,
      eventsForCreate,
      worldEntitiesForCreate,
      relationsForCreate,
      snapshotsForCreate,
    } = input;

    return (await db.getClient().$transaction(async (
      tx: ReturnType<(typeof db)["getClient"]>,
    ) => {
      if (legacyProjectId) {
        await tx.project.delete({ where: { id: legacyProjectId } });
      }

      if (existing) {
        await tx.project.delete({ where: { id: resolvedProjectId } });
      }

      const project = await tx.project.create({
        data: {
          id: resolvedProjectId,
          title: meta.title ?? "Recovered Project",
          description:
            (typeof meta.description === "string" ? meta.description : undefined) ??
            worldSynopsis ??
            undefined,
          projectPath: resolvedPath,
          createdAt: meta.createdAt ? new Date(meta.createdAt) : undefined,
          updatedAt: meta.updatedAt ? new Date(meta.updatedAt) : undefined,
          settings: {
            create: {
              autoSave: true,
              autoSaveInterval: DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
            },
          },
        },
        include: { settings: true },
      });

      if (chaptersForCreate.length > 0) {
        await tx.chapter.createMany({ data: chaptersForCreate });
      }
      if (charactersForCreate.length > 0) {
        await tx.character.createMany({ data: charactersForCreate });
      }
      if (termsForCreate.length > 0) {
        await tx.term.createMany({ data: termsForCreate });
      }
      if (factionsForCreate.length > 0) {
        await tx.faction.createMany({ data: factionsForCreate });
      }
      if (eventsForCreate.length > 0) {
        await tx.event.createMany({ data: eventsForCreate });
      }
      if (worldEntitiesForCreate.length > 0) {
        await tx.worldEntity.createMany({ data: worldEntitiesForCreate });
      }
      if (relationsForCreate.length > 0) {
        await tx.entityRelation.createMany({ data: relationsForCreate });
      }
      if (snapshotsForCreate.length > 0) {
        await tx.snapshot.createMany({ data: snapshotsForCreate });
      }
      return project;
    })) as {
      id: string;
      title: string;
      description?: string | null;
      projectPath?: string | null;
      createdAt: Date;
      updatedAt: Date;
      settings?: unknown;
    };
  }

  async openLuieProject(packagePath: string) {
    try {
      const resolvedPath = ensureLuieExtension(packagePath);
      const { meta, luieCorrupted, recoveryReason } = await this.readMetaOrMarkCorrupt(
        resolvedPath,
      );
      const existingByPath = await this.findProjectByPath(resolvedPath);

      if (luieCorrupted) {
        if (!existingByPath) {
          throw new ServiceError(
            ErrorCode.FS_READ_FAILED,
            "Failed to read .luie meta",
            { packagePath: resolvedPath },
          );
        }
        const recoveryPath = await this.resolveRecoveredPackagePath(resolvedPath);
        const exported = await this.exportProjectPackageWithOptions(existingByPath.id, {
          targetPath: recoveryPath,
          worldSourcePath: null,
        });
        if (!exported) {
          throw new ServiceError(
            ErrorCode.FS_WRITE_FAILED,
            "Failed to write recovered .luie package",
            { packagePath: resolvedPath, recoveryPath },
          );
        }
        await db.getClient().project.update({
          where: { id: existingByPath.id },
          data: { projectPath: recoveryPath },
        });
        const project = await this.getProject(existingByPath.id);
        return {
          project,
          recovery: true,
          recoveryPath,
          recoveryReason: recoveryReason ?? "corrupt",
        };
      }

      if (!meta) {
        throw new ServiceError(
          ErrorCode.VALIDATION_FAILED,
          "Invalid .luie meta format",
          { packagePath: resolvedPath },
        );
      }

      const { resolvedProjectId, legacyProjectId } = this.resolveImportIdentity(meta, existingByPath);
      const existing = (await db.getClient().project.findUnique({
        where: { id: resolvedProjectId },
        select: { id: true, updatedAt: true },
      })) as ExistingProjectLookup;

      const chaptersMeta = meta.chapters ?? [];
      const collections = await this.readLuieImportCollections(resolvedPath);
      const chaptersForCreate = await this.buildChapterCreateRows(
        resolvedPath,
        resolvedProjectId,
        chaptersMeta,
      );
      const charactersForCreate = this.buildCharacterCreateRows(
        resolvedProjectId,
        collections.characters,
      );
      const termsForCreate = this.buildTermCreateRows(resolvedProjectId, collections.terms);
      const graphRows = this.buildGraphCreateRows({
        projectId: resolvedProjectId,
        graph: collections.graph,
        baseCharacters: charactersForCreate,
        baseTerms: termsForCreate,
      });
      const snapshotsForCreate = this.buildSnapshotCreateRows(
        resolvedProjectId,
        collections.snapshots,
      );

      const created = await this.applyImportTransaction({
        resolvedProjectId,
        legacyProjectId,
        existing,
        meta,
        worldSynopsis: collections.worldSynopsis,
        resolvedPath,
        chaptersForCreate,
        charactersForCreate: graphRows.charactersForCreate,
        termsForCreate: graphRows.termsForCreate,
        factionsForCreate: graphRows.factionsForCreate,
        eventsForCreate: graphRows.eventsForCreate,
        worldEntitiesForCreate: graphRows.worldEntitiesForCreate,
        relationsForCreate: graphRows.relationsForCreate,
        snapshotsForCreate,
      });

      logger.info(".luie package hydrated", {
        projectId: created.id,
        chapterCount: chaptersForCreate.length,
        characterCount: graphRows.charactersForCreate.length,
        termCount: graphRows.termsForCreate.length,
        factionCount: graphRows.factionsForCreate.length,
        eventCount: graphRows.eventsForCreate.length,
        worldEntityCount: graphRows.worldEntitiesForCreate.length,
        relationCount: graphRows.relationsForCreate.length,
        snapshotCount: snapshotsForCreate.length,
      });

      return { project: created, conflict: "luie-newer" };
    } catch (error) {
      logger.error("Failed to open .luie package", { packagePath, error });
      if (error instanceof ServiceError) {
        throw error;
      }
      throw new ServiceError(
        ErrorCode.PROJECT_CREATE_FAILED,
        "Failed to open .luie package",
        { packagePath },
        error,
      );
    }
  }

  async getProject(id: string) {
    try {
      const project = await db.getClient().project.findUnique({
        where: { id },
        include: {
          settings: true,
          chapters: {
            where: { deletedAt: null },
            orderBy: { order: "asc" },
          },
          characters: true,
          terms: true,
        },
      });

      if (!project) {
        throw new ServiceError(
          ErrorCode.PROJECT_NOT_FOUND,
          "Project not found",
          { id },
        );
      }

      return project;
    } catch (error) {
      logger.error("Failed to get project", error);
      throw error;
    }
  }

  async getAllProjects() {
    try {
      const projects = await db.getClient().project.findMany({
        include: {
          settings: true,
          _count: {
            select: {
              chapters: true,
              characters: true,
              terms: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      const withPathStatus = await Promise.all(
        projects.map(async (project) => {
          const projectPath =
            typeof project.projectPath === "string" ? project.projectPath : null;
          const isLuiePath = Boolean(
            projectPath && projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION),
          );
          if (!isLuiePath || !projectPath) {
            return {
              ...project,
              pathMissing: false,
            };
          }

          try {
            await fs.access(projectPath);
            return {
              ...project,
              pathMissing: false,
            };
          } catch {
            return {
              ...project,
              pathMissing: true,
            };
          }
        }),
      );

      return withPathStatus;
    } catch (error) {
      logger.error("Failed to get all projects", error);
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to get all projects",
        undefined,
        error,
      );
    }
  }

  async updateProject(input: ProjectUpdateInput) {
    try {
      const current = await db.getClient().project.findUnique({
        where: { id: input.id },
        select: { title: true, projectPath: true },
      });

      const project = await db.getClient().project.update({
        where: { id: input.id },
        data: {
          title: input.title,
          description: input.description,
          projectPath: input.projectPath,
        },
      });

      const prevTitle = typeof current?.title === "string" ? current.title : "";
      const nextTitle = typeof project.title === "string" ? project.title : "";
      const projectPath = typeof project.projectPath === "string" ? project.projectPath : null;

      if (
        projectPath &&
        projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION) &&
        prevTitle &&
        nextTitle &&
        prevTitle !== nextTitle
      ) {
        const sepIndex = Math.max(projectPath.lastIndexOf("/"), projectPath.lastIndexOf("\\"));
        const baseDir = sepIndex >= 0 ? projectPath.slice(0, sepIndex) : projectPath;
        const snapshotsBase = `${baseDir}${path.sep}.luie${path.sep}${LUIE_SNAPSHOTS_DIR}`;
        const prevName = sanitizeName(prevTitle, "");
        const nextName = sanitizeName(nextTitle, "");
        if (prevName && nextName && prevName !== nextName) {
          const prevDir = `${snapshotsBase}${path.sep}${prevName}`;
          const nextDir = `${snapshotsBase}${path.sep}${nextName}`;
          try {
            const stat = await fs.stat(prevDir);
            if (stat.isDirectory()) {
              await fs.mkdir(snapshotsBase, { recursive: true });
              await fs.rename(prevDir, nextDir);
            }
          } catch {
            // ignore if missing or rename fails
          }
        }
      }

      const projectId = String(project.id);
      logger.info("Project updated successfully", { projectId });
      this.schedulePackageExport(projectId, "project:update");
      return project;
    } catch (error) {
      logger.error("Failed to update project", error);
      throw new ServiceError(
        ErrorCode.PROJECT_UPDATE_FAILED,
        "Failed to update project",
        { input },
        error,
      );
    }
  }

  private clearSyncBaselineForProject(projectId: string): void {
    const syncSettings = settingsManager.getSyncSettings();
    const existingBaselines = syncSettings.entityBaselinesByProjectId;
    if (!existingBaselines || !(projectId in existingBaselines)) return;
    const nextBaselines = { ...existingBaselines };
    delete nextBaselines[projectId];
    settingsManager.setSyncSettings({
      entityBaselinesByProjectId:
        Object.keys(nextBaselines).length > 0 ? nextBaselines : undefined,
    });
  }

  async deleteProject(id: string) {
    let queuedProjectDelete = false;

    try {
      const existing = await db.getClient().project.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing?.id) {
        throw new ServiceError(
          ErrorCode.PROJECT_NOT_FOUND,
          "Project not found",
          { id },
        );
      }

      settingsManager.addPendingProjectDelete({
        projectId: id,
        deletedAt: new Date().toISOString(),
      });
      queuedProjectDelete = true;

      await db.getClient().project.delete({
        where: { id },
      });

      this.clearSyncBaselineForProject(id);

      logger.info("Project deleted successfully", { projectId: id });
      return { success: true };
    } catch (error) {
      if (queuedProjectDelete) {
        settingsManager.removePendingProjectDeletes([id]);
      }
      logger.error("Failed to delete project", error);
      if (error instanceof ServiceError) {
        throw error;
      }
      throw new ServiceError(
        ErrorCode.PROJECT_DELETE_FAILED,
        "Failed to delete project",
        { id },
        error,
      );
    }
  }

  async removeProjectFromList(id: string) {
    try {
      const existing = await db.getClient().project.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing?.id) {
        throw new ServiceError(
          ErrorCode.PROJECT_NOT_FOUND,
          "Project not found",
          { id },
        );
      }

      await db.getClient().project.delete({
        where: { id },
      });

      this.clearSyncBaselineForProject(id);

      logger.info("Project removed from list", { projectId: id });
      return { success: true };
    } catch (error) {
      logger.error("Failed to remove project from list", error);
      if (error instanceof ServiceError) {
        throw error;
      }
      throw new ServiceError(
        ErrorCode.PROJECT_DELETE_FAILED,
        "Failed to remove project from list",
        { id },
        error,
      );
    }
  }

  schedulePackageExport(projectId: string, reason?: string) {
    const existing = this.exportTimers.get(projectId);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(async () => {
      this.exportTimers.delete(projectId);
      try {
        await this.runPackageExport(projectId);
      } catch (error) {
        logger.error("Failed to export project package", { projectId, reason, error });
      }
    }, PACKAGE_EXPORT_DEBOUNCE_MS);

    this.exportTimers.set(projectId, timer);
  }

  private runPackageExport(projectId: string): Promise<void> {
    const current = this.exportInFlight.get(projectId);
    if (current) {
      return current;
    }

    const task = this.exportProjectPackage(projectId)
      .catch((error) => {
        logger.error("Failed to run package export", { projectId, error });
        throw error;
      })
      .finally(() => {
        this.exportInFlight.delete(projectId);
      });

    this.exportInFlight.set(projectId, task);
    return task;
  }

  async flushPendingExports(timeoutMs = 8_000): Promise<{
    total: number;
    flushed: number;
    failed: number;
    timedOut: boolean;
  }> {
    const pendingProjectIds = new Set<string>([
      ...this.exportTimers.keys(),
      ...this.exportInFlight.keys(),
    ]);

    for (const [projectId, timer] of this.exportTimers.entries()) {
      clearTimeout(timer);
      this.exportTimers.delete(projectId);
    }

    if (pendingProjectIds.size === 0) {
      return { total: 0, flushed: 0, failed: 0, timedOut: false };
    }

    let flushed = 0;
    let failed = 0;
    const jobs = Array.from(pendingProjectIds).map(async (projectId) => {
      try {
        await this.runPackageExport(projectId);
        flushed += 1;
      } catch {
        failed += 1;
      }
    });

    const completion = Promise.all(jobs).then(() => true);
    const timedOut = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(true), timeoutMs);
      void completion.then(() => {
        clearTimeout(timer);
        resolve(false);
      });
    });

    return {
      total: pendingProjectIds.size,
      flushed,
      failed,
      timedOut,
    };
  }

  private async getProjectForExport(projectId: string): Promise<ProjectExportRecord | null> {
    return (await db.getClient().project.findUnique({
      where: { id: projectId },
      include: {
        chapters: { where: { deletedAt: null }, orderBy: { order: "asc" } },
        characters: true,
        terms: true,
        factions: true,
        events: true,
        worldEntities: true,
        entityRelations: true,
        snapshots: { orderBy: { createdAt: "desc" } },
      },
    })) as ProjectExportRecord | null;
  }

  private resolveExportPath(
    projectId: string,
    projectPath?: string | null,
  ): string | null {
    if (!projectPath) {
      logger.info("Skipping package export (missing projectPath)", { projectId });
      return null;
    }
    if (!projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
      logger.info("Skipping package export (not .luie)", {
        projectId,
        projectPath,
      });
      return null;
    }
    return projectPath;
  }

  private buildExportChapterData(chapters: ChapterExportRecord[]) {
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
  }

  private buildExportCharacterData(characters: CharacterExportRecord[]) {
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
  }

  private buildExportTermData(terms: TermExportRecord[]) {
    return terms.map((term) => ({
      id: term.id,
      term: term.term,
      definition: term.definition,
      category: term.category,
      firstAppearance: term.firstAppearance,
      createdAt: term.createdAt,
      updatedAt: term.updatedAt,
    }));
  }

  private buildExportSnapshotData(snapshots: SnapshotExportRecord[]) {
    const rawSnapshots = snapshots.map((snapshot) => ({
      id: snapshot.id,
      projectId: snapshot.projectId,
      chapterId: snapshot.chapterId,
      content: snapshot.content,
      description: snapshot.description,
      createdAt: snapshot.createdAt?.toISOString?.() ?? String(snapshot.createdAt),
    }));
    const snapshotExportLimit =
      settingsManager.getAll().snapshotExportLimit ?? SNAPSHOT_FILE_KEEP_COUNT;
    return snapshotExportLimit > 0
      ? rawSnapshots.slice(0, snapshotExportLimit)
      : rawSnapshots;
  }

  private async readWorldPayloadFromPackage(projectPath?: string | null) {
    if (!projectPath || !projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
      return {
        synopsis: LuieWorldSynopsisSchema.safeParse(null),
        plot: LuieWorldPlotSchema.safeParse(null),
        drawing: LuieWorldDrawingSchema.safeParse(null),
        mindmap: LuieWorldMindmapSchema.safeParse(null),
        memos: LuieWorldScrapMemosSchema.safeParse(null),
      };
    }

    try {
      const [
        existingSynopsisRaw,
        existingPlotRaw,
        existingDrawingRaw,
        existingMindmapRaw,
        existingMemosRaw,
      ] = await Promise.all([
        readLuieEntry(projectPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_SYNOPSIS_FILE}`, logger),
        readLuieEntry(projectPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_PLOT_FILE}`, logger),
        readLuieEntry(projectPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_DRAWING_FILE}`, logger),
        readLuieEntry(projectPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_MINDMAP_FILE}`, logger),
        readLuieEntry(projectPath, `${LUIE_WORLD_DIR}/${LUIE_WORLD_SCRAP_MEMOS_FILE}`, logger),
      ]);

      return {
        synopsis: LuieWorldSynopsisSchema.safeParse(parseJsonSafely(existingSynopsisRaw)),
        plot: LuieWorldPlotSchema.safeParse(parseJsonSafely(existingPlotRaw)),
        drawing: LuieWorldDrawingSchema.safeParse(parseJsonSafely(existingDrawingRaw)),
        mindmap: LuieWorldMindmapSchema.safeParse(parseJsonSafely(existingMindmapRaw)),
        memos: LuieWorldScrapMemosSchema.safeParse(parseJsonSafely(existingMemosRaw)),
      };
    } catch (error) {
      logger.warn("Failed to read world payload from package; falling back to defaults", {
        projectPath,
        error,
      });
      return {
        synopsis: LuieWorldSynopsisSchema.safeParse(null),
        plot: LuieWorldPlotSchema.safeParse(null),
        drawing: LuieWorldDrawingSchema.safeParse(null),
        mindmap: LuieWorldMindmapSchema.safeParse(null),
        memos: LuieWorldScrapMemosSchema.safeParse(null),
      };
    }
  }

  private buildWorldSynopsis(
    project: ProjectExportRecord,
    parsedSynopsis: ReturnType<typeof LuieWorldSynopsisSchema.safeParse>,
  ): WorldSynopsisData {
    return {
      synopsis:
        project.description ??
        (parsedSynopsis.success && typeof parsedSynopsis.data.synopsis === "string"
          ? parsedSynopsis.data.synopsis
          : ""),
      status:
        parsedSynopsis.success && parsedSynopsis.data.status
          ? parsedSynopsis.data.status
          : "draft",
      genre:
        parsedSynopsis.success && typeof parsedSynopsis.data.genre === "string"
          ? parsedSynopsis.data.genre
          : undefined,
      targetAudience:
        parsedSynopsis.success && typeof parsedSynopsis.data.targetAudience === "string"
          ? parsedSynopsis.data.targetAudience
          : undefined,
      logline:
        parsedSynopsis.success && typeof parsedSynopsis.data.logline === "string"
          ? parsedSynopsis.data.logline
          : undefined,
      updatedAt:
        parsedSynopsis.success && typeof parsedSynopsis.data.updatedAt === "string"
          ? parsedSynopsis.data.updatedAt
          : undefined,
    };
  }

  private buildWorldPlot(
    parsedPlot: ReturnType<typeof LuieWorldPlotSchema.safeParse>,
  ): WorldPlotData {
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
  }

  private buildWorldDrawing(
    parsedDrawing: ReturnType<typeof LuieWorldDrawingSchema.safeParse>,
  ): WorldDrawingData {
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
  }

  private buildWorldMindmap(
    parsedMindmap: ReturnType<typeof LuieWorldMindmapSchema.safeParse>,
  ): WorldMindmapData {
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
  }

  private buildWorldScrapMemos(
    parsedMemos: ReturnType<typeof LuieWorldScrapMemosSchema.safeParse>,
  ): WorldScrapMemosData {
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
  }

  private parseAttributesRecord(raw: string | null | undefined): Record<string, unknown> | null {
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
  }

  private buildWorldGraph(project: ProjectExportRecord): WorldGraphData {
    const nodes: WorldGraphData["nodes"] = [
      ...project.characters.map((character) => ({
        id: character.id,
        entityType: "Character" as const,
        name: character.name,
        description: character.description ?? null,
        firstAppearance: character.firstAppearance ?? null,
        attributes: this.parseAttributesRecord(character.attributes),
        positionX: 0,
        positionY: 0,
      })),
      ...project.factions.map((faction) => ({
        id: faction.id,
        entityType: "Faction" as const,
        name: faction.name,
        description: faction.description ?? null,
        firstAppearance: faction.firstAppearance ?? null,
        attributes: this.parseAttributesRecord(faction.attributes),
        positionX: 0,
        positionY: 0,
      })),
      ...project.events.map((event) => ({
        id: event.id,
        entityType: "Event" as const,
        name: event.name,
        description: event.description ?? null,
        firstAppearance: event.firstAppearance ?? null,
        attributes: this.parseAttributesRecord(event.attributes),
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
            ? this.parseAttributesRecord(entity.attributes)
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
          ? this.parseAttributesRecord(edge.attributes)
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
  }

  private buildProjectPackageMeta(
    project: ProjectExportRecord,
    chapterMeta: Array<{ id: string; title: string; order: number; file: string }>,
  ) {
    return {
      format: LUIE_PACKAGE_FORMAT,
      container: LUIE_PACKAGE_CONTAINER_DIR,
      version: LUIE_PACKAGE_VERSION,
      projectId: project.id,
      title: project.title,
      description: project.description,
      createdAt: project.createdAt?.toISOString?.() ?? String(project.createdAt),
      updatedAt: project.updatedAt?.toISOString?.() ?? String(project.updatedAt),
      chapters: chapterMeta,
    };
  }

  private async exportProjectPackageWithOptions(
    projectId: string,
    options?: {
      targetPath?: string;
      worldSourcePath?: string | null;
    },
  ): Promise<boolean> {
    const project = await this.getProjectForExport(projectId);
    if (!project) return false;

    const exportPath = options?.targetPath
      ? ensureLuieExtension(options.targetPath)
      : this.resolveExportPath(projectId, project.projectPath);
    if (!exportPath) return false;

    const worldSourcePath =
      options?.worldSourcePath === undefined
        ? exportPath
        : options.worldSourcePath;

    const { exportChapters, chapterMeta } = this.buildExportChapterData(project.chapters);
    const characters = this.buildExportCharacterData(project.characters);
    const terms = this.buildExportTermData(project.terms);
    const snapshots = this.buildExportSnapshotData(project.snapshots);
    const parsedWorld = await this.readWorldPayloadFromPackage(worldSourcePath);

    const synopsis = this.buildWorldSynopsis(project, parsedWorld.synopsis);
    const plot = this.buildWorldPlot(parsedWorld.plot);
    const drawing = this.buildWorldDrawing(parsedWorld.drawing);
    const mindmap = this.buildWorldMindmap(parsedWorld.mindmap);
    const memos = this.buildWorldScrapMemos(parsedWorld.memos);
    const graph = this.buildWorldGraph(project);
    const meta = this.buildProjectPackageMeta(project, chapterMeta);

    logger.info("Exporting .luie package", {
      projectId,
      projectPath: exportPath,
      chapterCount: exportChapters.length,
      characterCount: characters.length,
      termCount: terms.length,
      worldNodeCount: graph.nodes.length,
      relationCount: graph.edges.length,
      snapshotCount: snapshots.length,
    });

    await writeLuiePackage(
      exportPath,
      {
        meta,
        chapters: exportChapters,
        characters,
        terms,
        synopsis,
        plot,
        drawing,
        mindmap,
        memos,
        graph,
        snapshots,
      },
      logger,
    );
    return true;
  }

  async exportProjectPackage(projectId: string) {
    await this.exportProjectPackageWithOptions(projectId);
  }
}

export const projectService = new ProjectService();
