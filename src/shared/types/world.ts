export interface Character {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  firstAppearance?: string | null;
  attributes?: Record<string, unknown> | string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt?: string | Date | null;
}
export interface Term {
  id: string;
  projectId: string;
  term: string;
  definition?: string | null;
  category?: string | null;
  order: number;
  firstAppearance?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt?: string | Date | null;
}
export interface Event {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  firstAppearance?: string | null;
  attributes?: Record<string, unknown> | string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt?: string | Date | null;
}
export interface Faction {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  firstAppearance?: string | null;
  attributes?: Record<string, unknown> | string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt?: string | Date | null;
}
export type WorldSynopsisStatus = "draft" | "working" | "locked";
export interface WorldSynopsisData {
  synopsis: string;
  status: WorldSynopsisStatus;
  genre?: string;
  targetAudience?: string;
  logline?: string;
  updatedAt?: string;
}
export interface WorldPlotCard {
  id: string;
  content: string;
}
export interface WorldPlotColumn {
  id: string;
  title: string;
  cards: WorldPlotCard[];
}
export interface WorldPlotData {
  columns: WorldPlotColumn[];
  updatedAt?: string;
}
export type WorldDrawingTool = "pen" | "text" | "eraser" | "icon";
export type WorldDrawingIconType = "mountain" | "castle" | "village";
export interface WorldDrawingPath {
  id: string;
  d?: string;
  type: "path" | "text" | "icon";
  color: string;
  width?: number;
  x?: number;
  y?: number;
  text?: string;
  icon?: WorldDrawingIconType;
}
export interface WorldDrawingData {
  paths: WorldDrawingPath[];
  tool?: WorldDrawingTool;
  iconType?: WorldDrawingIconType;
  color?: string;
  lineWidth?: number;
  updatedAt?: string;
}
export interface WorldMindmapNodeData {
  label: string;
  image?: string;
}
export interface WorldMindmapNode {
  id: string;
  type?: string;
  position: {
    x: number;
    y: number;
  };
  data: WorldMindmapNodeData;
}
export interface WorldMindmapEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}
export interface WorldMindmapData {
  nodes: WorldMindmapNode[];
  edges: WorldMindmapEdge[];
  updatedAt?: string;
}
export interface ScrapMemo {
  id: string;
  projectId?: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
  deletedAt?: string | Date | null;
}
export interface ScrapMemoCreateInput {
  projectId: string;
  title: string;
  content: string;
  tags?: string[];
}
export interface ScrapMemoUpdateInput {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
}
export interface WorldScrapMemosData {
  schemaVersion?: number;
  memos: ScrapMemo[];
  updatedAt?: string;
}
export type ReplicaWorldDocumentType =
  | "synopsis"
  | "plot"
  | "drawing"
  | "mindmap"
  | "graph"
  | "scrap";
export interface WorldReplicaDocumentResult {
  found: boolean;
  payload: unknown | null;
  updatedAt?: string;
}
export interface WorldReplicaScrapMemosResult {
  found: boolean;
  data: WorldScrapMemosData | null;
}
export interface CharacterCreateInput {
  projectId: string;
  name: string;
  description?: string;
  firstAppearance?: string;
  attributes?: Record<string, unknown>;
}
export interface CharacterUpdateInput {
  id: string;
  name?: string;
  description?: string;
  firstAppearance?: string;
  attributes?: Record<string, unknown>;
}
export interface CharacterAppearanceInput {
  projectId: string;
  characterId: string;
  chapterId: string;
  position: number;
  context?: string;
}
export interface TermCreateInput {
  projectId: string;
  term: string;
  definition?: string;
  category?: string;
  order?: number;
  firstAppearance?: string;
}
export interface TermUpdateInput {
  id: string;
  term?: string;
  definition?: string;
  category?: string;
  order?: number;
  firstAppearance?: string;
}
export interface TermAppearanceInput {
  projectId: string;
  termId: string;
  chapterId: string;
  position: number;
  context?: string;
}
export interface EventCreateInput {
  projectId: string;
  name: string;
  description?: string;
  firstAppearance?: string;
  attributes?: Record<string, unknown>;
}
export interface EventUpdateInput {
  id: string;
  name?: string;
  description?: string;
  firstAppearance?: string;
  attributes?: Record<string, unknown>;
}
export interface FactionCreateInput {
  projectId: string;
  name: string;
  description?: string;
  firstAppearance?: string;
  attributes?: Record<string, unknown>;
}
export interface FactionUpdateInput {
  id: string;
  name?: string;
  description?: string;
  firstAppearance?: string;
  attributes?: Record<string, unknown>;
}
export type WorldEntityType = "Place" | "Concept" | "Rule" | "Item";
export type WorldEntitySourceType =
  | "Character"
  | "Faction"
  | "Event"
  | "Place"
  | "Concept"
  | "Rule"
  | "Item"
  | "Term"
  | "WorldEntity";
export type RelationKind =
  | "belongs_to"
  | "enemy_of"
  | "causes"
  | "controls"
  | "located_in"
  | "violates";
export interface WorldEntityAttributes {
  time?: string;
  region?: string;
  tags?: string[];
  importance?: 1 | 2 | 3 | 4 | 5;
  [key: string]: unknown;
}
export interface WorldEntity {
  id: string;
  projectId: string;
  type: WorldEntityType;
  name: string;
  description?: string | null;
  firstAppearance?: string | null;
  attributes?: WorldEntityAttributes | string | null;
  memoryEntityId?: string | null;
  positionX: number;
  positionY: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}
export interface EntityRelation {
  id: string;
  projectId: string;
  sourceId: string;
  sourceType: WorldEntitySourceType;
  targetId: string;
  targetType: WorldEntitySourceType;
  relation: RelationKind;
  attributes?: Record<string, unknown> | string | null;
  sourceWorldEntityId?: string | null;
  targetWorldEntityId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}
export interface WorldEntityCreateInput {
  projectId: string;
  type: WorldEntityType;
  name: string;
  description?: string;
  firstAppearance?: string;
  attributes?: WorldEntityAttributes;
  memoryEntityId?: string | null;
  positionX?: number;
  positionY?: number;
}
export interface WorldEntityUpdateInput {
  id: string;
  type?: WorldEntityType;
  name?: string;
  description?: string;
  firstAppearance?: string;
  attributes?: WorldEntityAttributes;
  memoryEntityId?: string | null;
}
export interface WorldEntityUpdatePositionInput {
  id: string;
  positionX: number;
  positionY: number;
}
export interface EntityRelationCreateInput {
  projectId: string;
  sourceId: string;
  sourceType: WorldEntitySourceType;
  targetId: string;
  targetType: WorldEntitySourceType;
  relation: RelationKind;
  attributes?: Record<string, unknown>;
}
export interface EntityRelationUpdateInput {
  id: string;
  relation?: RelationKind;
  attributes?: Record<string, unknown>;
}
// Graph node — renderer safe
export interface WorldGraphNode {
  id: string;
  entityType: WorldEntitySourceType; // "Character" | "Faction" | "Event" | "Term" | "WorldEntity"
  subType?: WorldEntityType; // Place / Concept / Rule / Item
  name: string;
  description?: string | null;
  firstAppearance?: string | null;
  attributes?: WorldEntityAttributes | null;
  positionX: number;
  positionY: number;
}
export interface WorldGraphCanvasTimelineBlockData {
  content: string;
  isHeld: boolean;
  color?: string;
}
export interface WorldGraphCanvasMemoBlockData {
  title: string;
  tags: string[];
  body: string;
  color?: string;
}
export type WorldGraphCanvasEdgeDirection =
  | "unidirectional"
  | "bidirectional"
  | "none";
export interface WorldGraphCanvasEdge {
  id: string;
  sourceId: string;
  sourceHandle?: string;
  targetId: string;
  targetHandle?: string;
  relation: string;
  color?: string;
  direction?: WorldGraphCanvasEdgeDirection;
}
export type WorldGraphCanvasBlock =
  | {
      id: string;
      type: "timeline";
      positionX: number;
      positionY: number;
      data: WorldGraphCanvasTimelineBlockData;
    }
  | {
      id: string;
      type: "memo";
      positionX: number;
      positionY: number;
      data: WorldGraphCanvasMemoBlockData;
    };
export interface WorldTimelineSegment {
  id: string;
  name: string;
}
export interface WorldTimelineTrack {
  id: string;
  name: string;
  segments: WorldTimelineSegment[];
}
export interface WorldGraphData {
  nodes: WorldGraphNode[];
  edges: EntityRelation[];
  canvasBlocks?: WorldGraphCanvasBlock[];
  canvasEdges?: WorldGraphCanvasEdge[];
  timelines?: WorldTimelineTrack[];
}
export interface WorldGraphMentionsQuery {
  projectId: string;
  entityId: string;
  entityType: WorldEntitySourceType;
  limit?: number;
}
export interface WorldGraphMention {
  chapterId: string;
  chapterTitle: string;
  position: number | null;
  context?: string;
  source: "appearance" | "content-match";
}
export type GraphPluginKind = "graph-template-bundle";
export type GraphPluginInstallStatus = "installed";
export interface GraphTemplateManifest {
  id: string;
  title: string;
  summary: string;
  thumbnail: string;
  graphEntry: string;
  tags: string[];
}
export interface GraphPluginManifest {
  id: string;
  name: string;
  version: string;
  apiVersion: string;
  kind: GraphPluginKind;
  description: string;
  author: string;
  templates: GraphTemplateManifest[];
}
export interface GraphPluginCatalogItem {
  pluginId: string;
  version: string;
  name: string;
  summary: string;
  releaseTag: string;
  assetUrl: string;
  sha256: string;
  size: number;
  minAppVersion: string;
  apiVersion: string;
}
export interface InstalledGraphPlugin {
  pluginId: string;
  version: string;
  name: string;
  description: string;
  author: string;
  apiVersion: string;
  kind: GraphPluginKind;
  installedAt: string;
  source: {
    assetUrl: string;
    sha256: string;
  };
  status: GraphPluginInstallStatus;
}
export interface GraphPluginTemplateRef {
  pluginId: string;
  pluginName: string;
  pluginVersion: string;
  pluginDescription: string;
  pluginAuthor: string;
  template: GraphTemplateManifest;
}
export interface GraphPluginInstallResult {
  pluginId: string;
  version: string;
  installedAt: string;
  status: GraphPluginInstallStatus;
  alreadyInstalled: boolean;
}
export interface GraphPluginApplyTemplateInput {
  pluginId: string;
  templateId: string;
  projectId: string;
}
