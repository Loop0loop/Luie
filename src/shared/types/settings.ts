export type FontFamilyPreset = "system-ui" | "serif" | "mono";
export type FontFamily = FontFamilyPreset | string;
export type FontPreset = "inter";
export type EditorTheme = "light" | "dark" | "sepia";
export type ThemeContrast = "soft" | "high";
export type ThemeAccent =
  | "blue"
  | "violet"
  | "green"
  | "amber"
  | "rose"
  | "slate";
export type WindowMenuBarMode = "hidden" | "visible";
export type RagSearchOptimizationMode =
  | "low-end"
  | "standard"
  | "high-end"
  | "quality";

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
  type: "chapter" | "memo" | "memoryCanonical";
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
  memoryCanonical: number;
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
  | "sqliteIntegrity"
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
  letterSpacing: number;
  wordSpacing: number;
  paragraphSpacing: number;
  maxWidth: number;
  spellcheckEnabled: boolean;
  theme: EditorTheme;
  themeContrast: "soft" | "high";
  themeAccent: ThemeAccent;
  uiMode: EditorUiMode;
  enableAnimations: boolean;
  entityColors?: {
    character: string;
    event: string;
    faction: string;
    term: string;
  };
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
  llm?: {
    preferredProvider?: "auto" | "sidecar" | "ollama" | "openai" | "gemini";
    openaiApiKey?: string;
    geminiApiKey?: string;
    ollama?: {
      baseUrl?: string;
      chatModel?: string;
      embeddingModel?: string;
      apiKey?: string;
    };
    localLlm?: {
      enabled: boolean;
      modelPath?: string;
      binaryPath?: string;
      gpuLayers?: number;
      contextSize?: number;
      cacheRamMiB?: number;
      cacheReuse?: number;
    };
    ragTemperature?: number;
    ragMaxTokens?: number;
    searchOptimizationMode?: RagSearchOptimizationMode;
  };
}

export interface OllamaConnectionResult {
  ok: boolean;
}

export interface LlmRuntimeInfo {
  provider: "gemini" | "openai" | "ollama" | "sidecar" | "deterministic" | "unavailable";
  model: string;
  alternativeModel?: string | null;
  requestedProvider?: "auto" | "sidecar" | "ollama" | "openai" | "gemini";
  resolvedProvider?: "gemini" | "openai" | "ollama" | "sidecar" | "deterministic" | "unavailable";
  backend?: "local-sidecar" | "remote-http" | "test" | null;
  fallbackUsed?: boolean;
  ready?: boolean;
  skipped?: Array<{
    provider: "gemini" | "openai" | "ollama" | "sidecar" | "deterministic";
    code: string;
    message: string;
  }>;
}

export interface HfModelSearchResult {
  repoId: string;
  downloads: number;
  likes: number;
  lastModified?: string;
  tags?: string[];
}

export interface HfModelFile {
  filename: string;
  sizeBytes: number;
}

/** 하드웨어 맞춤 모델 추천(llmfit) — 렌더러 안전 타입. */
export interface LlmfitRecommendation {
  name: string;
  provider: string;
  paramsB: number | null;
  fitLevel: "perfect" | "good" | "marginal" | "too_tight" | "unknown";
  fitLabel: string;
  runMode: string;
  estimatedTps: number | null;
  memoryRequiredGb: number | null;
  bestQuant: string | null;
  score: number | null;
}

export type LlmfitResult =
  | { available: true; recommendations: LlmfitRecommendation[] }
  | { available: false; reason: string };

/** llmfit 바이너리 설치 상태(렌더러 안전 타입). */
export interface LlmfitInstallStatus {
  installed: boolean;
  path: string | null;
  version: string | null;
  reason?: string;
}

/** 로컬 임베딩 모델(bge-m3) 설치 상태(렌더러 안전 타입). */
export interface EmbeddingModelStatusView {
  modelId: string;
  displayName: string;
  installed: boolean;
  source: "bundled" | "downloaded" | "none";
  dimension: number;
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
