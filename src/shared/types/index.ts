/**
 * Shared type definitions
 */

// Model Types (Renderer-safe)
export type ProjectAttachmentStatus =
  | "attached"
  | "detached"
  | "missing-attachment"
  | "invalid-attachment"
  | "unsupported-legacy-container";

export interface Project {
  id: string;
  title: string;
  description?: string | null;
  // Legacy attachment metadata. Not canonical project content.
  projectPath?: string | null;
  // App-local metadata for recent/opened ordering.
  lastOpenedAt?: string | Date | null;
  attachmentStatus?: ProjectAttachmentStatus;
  attachmentContainerKind?: "sqlite-v2" | "legacy-package" | "unknown" | null;
  // Legacy compatibility flag. Prefer attachmentStatus for new code.
  pathMissing?: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ProjectOpenResult {
  project: Project;
  recovery?: boolean;
  conflict?: "db-newer" | "luie-newer";
  recoveryPath?: string;
  recoveryReason?: "missing" | "corrupt";
}

export interface Chapter {
  id: string;
  projectId: string;
  title: string;
  content: string;
  synopsis?: string | null;
  order: number;
  wordCount?: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt?: string | Date | null;
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  firstAppearance?: string | null;
  attributes?: Record<string, unknown> | string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
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
}

export interface Snapshot {
  id: string;
  projectId: string;
  chapterId?: string | null;
  content: string;
  contentLength?: number;
  type?: "AUTO" | "MANUAL";
  description?: string | null;
  createdAt: string | Date;
}

export interface SnapshotRestoreCandidate {
  snapshotId: string;
  projectId: string;
  projectTitle: string;
  chapterTitle?: string;
  savedAt: string;
  excerpt?: string;
  filePath: string;
}

export interface Note {
  id: string;
  projectId: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string | Date;
  updatedAt: string | Date;
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
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
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

// Export/Package Types
export type ChapterExportRecord = {
  id: string;
  title: string;
  order: number;
  updatedAt: Date;
  content: string;
};

export type CharacterExportRecord = {
  id: string;
  name: string;
  description?: string | null;
  firstAppearance?: string | null;
  attributes?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TermExportRecord = {
  id: string;
  term: string;
  definition?: string | null;
  category?: string | null;
  firstAppearance?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EventExportRecord = {
  id: string;
  name: string;
  description?: string | null;
  firstAppearance?: string | null;
  attributes?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FactionExportRecord = {
  id: string;
  name: string;
  description?: string | null;
  firstAppearance?: string | null;
  attributes?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SnapshotExportRecord = {
  id: string;
  projectId: string;
  chapterId?: string | null;
  content: string;
  description?: string | null;
  createdAt: Date;
};

export type ProjectExportRecord = {
  id: string;
  title: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
  projectPath?: string | null;
  chapters: ChapterExportRecord[];
  characters: CharacterExportRecord[];
  terms: TermExportRecord[];
  events: EventExportRecord[];
  factions: FactionExportRecord[];
  snapshots: SnapshotExportRecord[];
  worldEntities: WorldEntity[];
  entityRelations: EntityRelation[];
};

// Project Types
export interface ProjectCreateInput {
  title: string;
  description?: string;
  projectPath?: string;
}

export interface ProjectUpdateInput {
  id: string;
  title?: string;
  description?: string;
  projectPath?: string;
}

export interface ProjectDeleteInput {
  id: string;
  deleteFile?: boolean;
}

// Chapter Types
export interface ChapterCreateInput {
  projectId: string;
  title: string;
  synopsis?: string;
  order?: number;
}

export interface ChapterUpdateInput {
  id: string;
  title?: string;
  content?: string;
  synopsis?: string;
}

// Character Types
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

// Term Types
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

// Event Types
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

// Faction Types
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

// Snapshot Types
export interface SnapshotCreateInput {
  projectId: string;
  chapterId?: string;
  content: string;
  description?: string;
  type?: "AUTO" | "MANUAL";
}

// Search Types
export interface SearchQuery {
  projectId: string;
  query: string;
  type?: "all" | "character" | "term";
}

export interface SearchResult {
  type: "character" | "term" | "chapter";
  id: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

// Settings Types
export type FontFamily = "system-ui" | "serif" | "mono";

export type FontPreset = "inter";

export type EditorTheme = "light" | "dark" | "sepia";
export type ThemeTemperature = "neutral" | "warm" | "cool";
export type ThemeContrast = "soft" | "high";
export type ThemeAccent =
  | "blue"
  | "violet"
  | "green"
  | "amber"
  | "rose"
  | "slate";
export type ThemeTexture = boolean;
export type WindowMenuBarMode = "hidden" | "visible";
export type AppBootstrapStatus = {
  isReady: boolean;
  error?: string;
};

export type AppUpdateStatus =
  | "disabled"
  | "unconfigured"
  | "not-implemented"
  | "available"
  | "up-to-date"
  | "error";

export interface AppUpdateCheckResult {
  supported: boolean;
  available: boolean;
  status: AppUpdateStatus;
  currentVersion: string;
  latestVersion?: string;
  message?: string;
}

export type AppUpdateLifecycleStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "applying"
  | "error";

export interface AppUpdateArtifact {
  version: string;
  filePath: string;
  sha256: string;
  size: number;
  sourceUrl: string;
  downloadedAt: string;
}

export interface AppUpdateState {
  status: AppUpdateLifecycleStatus;
  currentVersion: string;
  latestVersion?: string;
  message?: string;
  rollbackAvailable: boolean;
  checkedAt?: string;
  artifact?: AppUpdateArtifact;
}

export interface AppUpdateDownloadResult {
  success: boolean;
  message: string;
  artifact?: AppUpdateArtifact;
}

export interface AppUpdateApplyResult {
  success: boolean;
  message: string;
  rollbackAvailable: boolean;
  relaunched: boolean;
}

export interface AppUpdateRollbackResult {
  success: boolean;
  message: string;
  restoredVersion?: string;
}

export type AppQuitPhase =
  | "idle"
  | "prepare"
  | "mirror-durable"
  | "export-flush"
  | "finalize"
  | "aborted"
  | "completed";

export interface AppQuitPhasePayload {
  phase: AppQuitPhase;
  message?: string;
}

export interface DbRecoveryCheckpoint {
  busy: number;
  log: number;
  checkpointed: number;
}

export interface DbRecoveryFileStatus {
  path: string;
  exists: boolean;
  sizeBytes?: number;
  modifiedAt?: string;
}

export type DbRecoveryStatusReason = "ready" | "wal-missing" | "db-missing";

export interface DbRecoveryStatus {
  available: boolean;
  reason: DbRecoveryStatusReason;
  checkedAt: string;
  backupRootDir: string;
  latestBackupDir?: string;
  database: DbRecoveryFileStatus;
  wal: DbRecoveryFileStatus;
  shm: DbRecoveryFileStatus;
  preview?: {
    projectTitle?: string;
    chapterTitle?: string;
    chapterUpdatedAt?: string;
    excerpt?: string;
  };
}

export interface DbRecoveryResult {
  success: boolean;
  dryRun: boolean;
  message: string;
  backupDir?: string;
  checkpoint?: DbRecoveryCheckpoint[];
  integrity?: string[];
}

export type SyncProvider = "google";
export type SyncMode = "idle" | "connecting" | "syncing" | "error";
export type SyncHealth = "connected" | "degraded" | "disconnected";

export interface SyncPendingProjectDelete {
  projectId: string;
  deletedAt: string;
}

export interface SyncConflictItem {
  type: "chapter" | "memo";
  id: string;
  projectId: string;
  title: string;
  localUpdatedAt: string;
  remoteUpdatedAt: string;
  localPreview: string;
  remotePreview: string;
}

export interface SyncConflictSummary {
  chapters: number;
  memos: number;
  total: number;
  items?: SyncConflictItem[];
}

export interface SyncEntityBaseline {
  chapter: Record<string, string>;
  memo: Record<string, string>;
  capturedAt: string;
}

export interface SyncConnection {
  connected: boolean;
  provider?: SyncProvider;
  email?: string;
  userId?: string;
  expiresAt?: string;
  autoSync: boolean;
  lastSyncedAt?: string;
  lastError?: string;
}

export interface SyncStatus extends SyncConnection {
  mode: SyncMode;
  health: SyncHealth;
  degradedReason?: string;
  inFlight: boolean;
  queued: boolean;
  conflicts: SyncConflictSummary;
  projectLastSyncedAtByProjectId?: Record<string, string>;
  projectStateById?: Record<
    string,
    {
      state: "synced" | "pending" | "error";
      lastSyncedAt?: string;
      reason?: string;
    }
  >;
  lastRun?: {
    at: string;
    pulled: number;
    pushed: number;
    conflicts: number;
    success: boolean;
    message: string;
  };
}

export type SyncAuthResultStatus = "success" | "error" | "stale";

export type SyncAuthResultReason =
  | "NO_PENDING"
  | "EXPIRED"
  | "STATE_MISMATCH"
  | "UNKNOWN";

export interface SyncAuthResult {
  status: SyncAuthResultStatus;
  reason?: SyncAuthResultReason;
  detail?: string;
  timestamp: string;
}

export interface SyncRunResult {
  success: boolean;
  message: string;
  pulled: number;
  pushed: number;
  conflicts: SyncConflictSummary;
  syncedAt?: string;
}

export interface RuntimeSupabaseConfig {
  url: string;
  anonKey: string;
}

export interface RuntimeSupabaseConfigView {
  url: string | null;
  hasAnonKey: boolean;
  source?: "env" | "runtime" | "legacy";
}

export interface SyncSettings extends SyncConnection {
  accessTokenCipher?: string;
  refreshTokenCipher?: string;
  pendingAuthState?: string;
  pendingAuthVerifierCipher?: string;
  pendingAuthCreatedAt?: string;
  pendingAuthRedirectUri?: string;
  pendingProjectDeletes?: SyncPendingProjectDelete[];
  projectLastSyncedAtByProjectId?: Record<string, string>;
  entityBaselinesByProjectId?: Record<string, SyncEntityBaseline>;
  pendingConflictResolutions?: Record<string, "local" | "remote">;
  runtimeSupabaseConfig?: RuntimeSupabaseConfig;
}

export type StartupCheckKey =
  | "osPermission"
  | "dataDirRW"
  | "defaultLuiePath"
  | "sqliteConnect"
  | "sqliteWal"
  | "supabaseRuntimeConfig"
  | "supabaseSession";

export interface StartupCheck {
  key: StartupCheckKey;
  ok: boolean;
  blocking: boolean;
  detail?: string;
  checkedAt: string;
}

export interface StartupReadiness {
  mustRunWizard: boolean;
  checks: StartupCheck[];
  reasons: StartupCheckKey[];
  completedAt?: string;
}

export interface StartupSettings {
  completedAt?: string;
}

export interface WindowBounds {
  width: number;
  height: number;
  x: number;
  y: number;
}

export type WindowState = "maximized" | "normal";

export type EditorUiMode =
  | "default"
  | "docs"
  | "editor"
  | "scrivener"
  | "focus";

export interface EditorSettings {
  fontFamily: FontFamily;
  fontPreset?: FontPreset;
  customFontFamily?: string;
  fontSize: number;
  lineHeight: number;
  maxWidth: number;
  spellcheckEnabled: boolean;
  theme: EditorTheme;
  themeTemp: "neutral" | "warm" | "cool";
  themeContrast: "soft" | "high";
  themeAccent: ThemeAccent;
  themeTexture: ThemeTexture;
  uiMode: EditorUiMode;
  enableAnimations: boolean;
}

export interface AppSettings {
  editor: EditorSettings;
  language?: "ko" | "en" | "ja";
  shortcuts?: ShortcutMap;
  // Legacy machine-local path hint. New recent/opened state lives in ProjectLocalState.
  lastProjectPath?: string;
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  snapshotExportLimit?: number;
  windowBounds?: WindowBounds;
  lastWindowState?: WindowState;
  menuBarMode?: WindowMenuBarMode;
  sync?: SyncSettings;
  startup?: StartupSettings;
}

export type ShortcutAction =
  | "app.closeWindow"
  | "app.openSettings"
  | "app.quit"
  | "chapter.new"
  | "chapter.save"
  | "chapter.delete"
  | "chapter.open.1"
  | "chapter.open.2"
  | "chapter.open.3"
  | "chapter.open.4"
  | "chapter.open.5"
  | "chapter.open.6"
  | "chapter.open.7"
  | "chapter.open.8"
  | "chapter.open.9"
  | "chapter.open.0"
  | "view.toggleSidebar"
  | "view.sidebar.open"
  | "view.sidebar.close"
  | "view.toggleContextPanel"
  | "view.context.open"
  | "view.context.close"
  | "sidebar.section.manuscript.toggle"
  | "sidebar.section.snapshot.open"
  | "sidebar.section.trash.open"
  | "project.rename"
  | "research.open.character"
  | "research.open.world"
  | "research.open.scrap"
  | "research.open.analysis"
  | "research.open.character.left"
  | "research.open.world.left"
  | "research.open.scrap.left"
  | "research.open.analysis.left"
  | "character.openTemplate"
  | "world.tab.synopsis"
  | "world.tab.terms"
  | "world.tab.mindmap"
  | "world.tab.drawing"
  | "world.tab.plot"
  | "world.tab.graph"
  | "world.addTerm"
  | "scrap.addMemo"
  | "export.openPreview"
  | "export.openWindow"
  | "editor.openRight"
  | "editor.openLeft"
  | "split.swapSides"
  | "editor.fontSize.increase"
  | "editor.fontSize.decrease"
  | "window.toggleFullscreen"
  | "view.toggleFocusMode";

export type ShortcutMap = Record<ShortcutAction, string>;

// Analysis Types
export type {
  AnalysisRequest,
  AnalysisItem,
  AnalysisContext,
  AnalysisStreamChunk,
  AnalysisResult,
  AnalysisError,
} from "./analysis";

// ─── World Building Types ────────────────────────────────────────────────────

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

// Input types
export interface WorldEntityCreateInput {
  projectId: string;
  type: WorldEntityType;
  name: string;
  description?: string;
  firstAppearance?: string;
  attributes?: WorldEntityAttributes;
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

export interface WorldGraphCanvasTimelineSequenceNode {
  id: string;
  content: string;
  isHeld: boolean;
  topBranches: WorldGraphCanvasTimelineSequenceNode[][];
  bottomBranches: WorldGraphCanvasTimelineSequenceNode[][];
}

export interface WorldGraphCanvasTimelineBlockData {
  label: string;
  sequence: WorldGraphCanvasTimelineSequenceNode[];
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
  targetId: string;
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

export interface WorldGraphData {
  nodes: WorldGraphNode[];
  edges: EntityRelation[];
  canvasBlocks?: WorldGraphCanvasBlock[];
  canvasEdges?: WorldGraphCanvasEdge[];
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
