import { z } from "zod";
import { isRelationAllowed } from "../constants/worldRelationRules";
import {
  PROJECT_LAYOUT_SCHEMA_VERSION,
  UI_STORE_SCHEMA_VERSION,
  WORLD_SCRAP_MEMOS_SCHEMA_VERSION,
} from "../constants/persistence";

const PATH_MAX_LENGTH = 4096;
const TITLE_MAX_LENGTH = 255;
const LARGE_TEXT_MAX_LENGTH = 10_000_000;

const basePathSchema = z
  .string()
  .min(1, "Path is required")
  .max(PATH_MAX_LENGTH, "Path is too long")
  .refine((value) => !value.includes("\0"), "Path must not contain null bytes");

const baseContentSchema = z
  .string()
  .max(LARGE_TEXT_MAX_LENGTH, "Content is too large");

const dialogFilterSchema = z.strictObject({
  name: z.string().min(1).max(100),
  extensions: z.array(z.string().min(1).max(20)).max(20),
});

const dialogOptionsSchema = z.strictObject({
  filters: z.array(dialogFilterSchema).max(20).optional(),
  defaultPath: basePathSchema.optional(),
  title: z.string().min(1).max(200).optional(),
});

export const projectCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  projectPath: z.string().optional(),
});

export const projectUpdateSchema = z.object({
  id: z.string().uuid("Invalid project ID"),
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  projectPath: z.string().optional(),
});

export const projectDeleteRequestSchema = z.object({
  id: z.string().uuid("Invalid project ID"),
  deleteFile: z.boolean().optional(),
});

export const projectDeleteArgSchema = z.union([
  z.string().uuid("Invalid project ID"),
  projectDeleteRequestSchema,
]);

export const chapterCreateSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  title: z.string().min(1, "Title is required"),
  synopsis: z.string().optional(),
});

export const chapterUpdateSchema = z.object({
  id: z.string().uuid("Invalid chapter ID"),
  title: z.string().min(1, "Title is required").optional(),
  content: z.string().optional(),
  synopsis: z.string().optional(),
});

export const characterCreateSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  firstAppearance: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const characterUpdateSchema = z.object({
  id: z.string().uuid("Invalid character ID"),
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  firstAppearance: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const eventCreateSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  firstAppearance: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const eventUpdateSchema = z.object({
  id: z.string().uuid("Invalid event ID"),
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  firstAppearance: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const factionCreateSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  firstAppearance: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const factionUpdateSchema = z.object({
  id: z.string().uuid("Invalid faction ID"),
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  firstAppearance: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const termCreateSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  term: z.string().min(1, "Term is required"),
  definition: z.string().optional(),
  category: z.string().optional(),
  firstAppearance: z.string().optional(),
});

export const termUpdateSchema = z.object({
  id: z.string().uuid("Invalid term ID"),
  term: z.string().min(1, "Term is required").optional(),
  definition: z.string().optional(),
  category: z.string().optional(),
  firstAppearance: z.string().optional(),
});

export const projectIdSchema = z.string().uuid("Invalid project ID");
export const chapterIdSchema = z.string().uuid("Invalid chapter ID");
export const characterIdSchema = z.string().uuid("Invalid character ID");
export const eventIdSchema = z.string().uuid("Invalid event ID");
export const factionIdSchema = z.string().uuid("Invalid faction ID");
export const termIdSchema = z.string().uuid("Invalid term ID");
export const snapshotIdSchema = z.string().uuid("Invalid snapshot ID");

export const autoSaveArgsSchema = z.tuple([
  chapterIdSchema,
  z.string(),
  projectIdSchema,
]);

export const characterAppearanceSchema = z.object({
  projectId: projectIdSchema,
  characterId: characterIdSchema,
  chapterId: chapterIdSchema,
  position: z.number().int().nonnegative(),
  context: z.string().optional(),
});

export const termAppearanceSchema = z.object({
  projectId: projectIdSchema,
  termId: termIdSchema,
  chapterId: chapterIdSchema,
  position: z.number().int().nonnegative(),
  context: z.string().optional(),
});

export const snapshotCreateSchema = z.object({
  projectId: projectIdSchema,
  chapterId: chapterIdSchema.optional(),
  content: z.string(),
  description: z.string().optional(),
  type: z.enum(["AUTO", "MANUAL"]).optional(),
});

export const snapshotRestoreCandidateSchema = z.object({
  snapshotId: z.string().min(1),
  projectId: z.string().min(1),
  projectTitle: z.string().min(1),
  chapterTitle: z.string().min(1).optional(),
  savedAt: z.string().min(1),
  excerpt: z.string().min(1).optional(),
  filePath: basePathSchema,
});

export const searchQuerySchema = z.object({
  projectId: projectIdSchema,
  query: z.string().min(1, "Query is required"),
  type: z.enum(["all", "character", "term"]).optional(),
});

export const exportRequestSchema = z.object({
  projectId: projectIdSchema,
  chapterId: chapterIdSchema,
  title: z.string().min(1).max(TITLE_MAX_LENGTH),
  content: baseContentSchema.min(1),
  format: z.enum(["DOCX", "HWPX"]),
  paperSize: z.enum(["A4", "Letter", "B5"]).optional(),
  marginTop: z.number().nonnegative().max(100).optional(),
  marginBottom: z.number().nonnegative().max(100).optional(),
  marginLeft: z.number().nonnegative().max(100).optional(),
  marginRight: z.number().nonnegative().max(100).optional(),
  fontFamily: z.string().min(1).max(100).optional(),
  fontSize: z.number().positive().max(96).optional(),
  lineHeight: z.string().min(1).max(20).optional(),
  normalizeLineSpacing: z.boolean().optional(),
  showPageNumbers: z.boolean().optional(),
  startPageNumber: z.number().int().min(1).max(100_000).optional(),
});

export const exportCreateArgsSchema = z.tuple([exportRequestSchema]);

export const fsSelectDialogArgsSchema = z.tuple([
  dialogOptionsSchema.optional(),
]);
export const fsSaveProjectArgsSchema = z.tuple([
  z.string().min(1).max(TITLE_MAX_LENGTH),
  basePathSchema,
  baseContentSchema,
]);
export const fsReadFileArgsSchema = z.tuple([basePathSchema]);
export const fsReadLuieEntryArgsSchema = z.tuple([
  basePathSchema,
  z.string().min(1).max(PATH_MAX_LENGTH),
]);
export const fsWriteFileArgsSchema = z.tuple([
  basePathSchema,
  baseContentSchema,
]);
export const fsCreateLuiePackageArgsSchema = z.tuple([
  basePathSchema,
  z.unknown(),
]);
export const fsWriteProjectFileArgsSchema = z.tuple([
  basePathSchema,
  z.string().min(1).max(PATH_MAX_LENGTH),
  baseContentSchema,
]);
export const fsApproveProjectPathArgsSchema = z.tuple([basePathSchema]);

export const windowSetFullscreenArgsSchema = z.tuple([z.boolean()]);
export const windowOpenExportArgsSchema = z.tuple([chapterIdSchema]);
const loggerLogEntrySchema = z.strictObject({
  level: z.enum(["debug", "info", "warn", "error"]),
  message: z.string().min(1).max(LARGE_TEXT_MAX_LENGTH),
  data: z.unknown().optional(),
});
export const loggerLogArgsSchema = z.tuple([loggerLogEntrySchema]);
export const loggerLogBatchArgsSchema = z.tuple([
  z.array(loggerLogEntrySchema).max(1000),
]);
export const analysisStartArgsSchema = z.tuple([
  z.object({
    chapterId: chapterIdSchema,
    projectId: projectIdSchema,
  }),
]);
export const recoveryRunDbArgsSchema = z.tuple([
  z
    .strictObject({
      dryRun: z.boolean().optional(),
    })
    .optional(),
]);

export const dbRecoveryCheckpointSchema = z.object({
  busy: z.number(),
  log: z.number(),
  checkpointed: z.number(),
});

export const dbRecoveryFileStatusSchema = z.object({
  path: z.string(),
  exists: z.boolean(),
  sizeBytes: z.number().optional(),
  modifiedAt: z.string().optional(),
});

export const dbRecoveryStatusSchema = z.object({
  available: z.boolean(),
  reason: z.enum(["ready", "wal-missing", "db-missing"]),
  checkedAt: z.string(),
  backupRootDir: z.string(),
  latestBackupDir: z.string().optional(),
  database: dbRecoveryFileStatusSchema,
  wal: dbRecoveryFileStatusSchema,
  shm: dbRecoveryFileStatusSchema,
  preview: z
    .object({
      projectTitle: z.string().optional(),
      chapterTitle: z.string().optional(),
      chapterUpdatedAt: z.string().optional(),
      excerpt: z.string().optional(),
    })
    .optional(),
});

export const dbRecoveryResultSchema = z.object({
  success: z.boolean(),
  dryRun: z.boolean(),
  message: z.string(),
  backupDir: z.string().optional(),
  checkpoint: z.array(dbRecoveryCheckpointSchema).optional(),
  integrity: z.array(z.string()).optional(),
});

export const appBootstrapStatusSchema = z.object({
  isReady: z.boolean(),
  error: z.string().optional(),
});

const startupCheckKeySchema = z.enum([
  "osPermission",
  "dataDirRW",
  "defaultLuiePath",
  "sqliteConnect",
  "sqliteWal",
  "supabaseRuntimeConfig",
  "supabaseSession",
]);

export const startupCheckSchema = z.object({
  key: startupCheckKeySchema,
  ok: z.boolean(),
  blocking: z.boolean(),
  detail: z.string().optional(),
  checkedAt: z.string(),
});

export const startupReadinessSchema = z.object({
  mustRunWizard: z.boolean(),
  checks: z.array(startupCheckSchema),
  reasons: z.array(startupCheckKeySchema),
  completedAt: z.string().optional(),
});

export const syncConflictSummarySchema = z.object({
  chapters: z.number().int().nonnegative(),
  memos: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  items: z
    .array(
      z.object({
        type: z.enum(["chapter", "memo"]),
        id: z.string().min(1),
        projectId: z.string().min(1),
        title: z.string(),
        localUpdatedAt: z.string(),
        remoteUpdatedAt: z.string(),
        localPreview: z.string(),
        remotePreview: z.string(),
      }),
    )
    .optional(),
});

export const syncStatusSchema = z.object({
  connected: z.boolean(),
  provider: z.enum(["google"]).optional(),
  email: z.string().email().optional(),
  userId: z.string().uuid().optional(),
  expiresAt: z.string().optional(),
  autoSync: z.boolean(),
  lastSyncedAt: z.string().optional(),
  lastError: z.string().optional(),
  mode: z.enum(["idle", "connecting", "syncing", "error"]),
  health: z.enum(["connected", "degraded", "disconnected"]),
  degradedReason: z.string().optional(),
  inFlight: z.boolean(),
  queued: z.boolean(),
  conflicts: syncConflictSummarySchema,
  projectLastSyncedAtByProjectId: z.record(z.string(), z.string()).optional(),
  projectStateById: z
    .record(
      z.string(),
      z.object({
        state: z.enum(["synced", "pending", "error"]),
        lastSyncedAt: z.string().optional(),
        reason: z.string().optional(),
      }),
    )
    .optional(),
  lastRun: z
    .object({
      at: z.string(),
      pulled: z.number().int().nonnegative(),
      pushed: z.number().int().nonnegative(),
      conflicts: z.number().int().nonnegative(),
      success: z.boolean(),
      message: z.string(),
    })
    .optional(),
});

export const syncRunResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  pulled: z.number().int().nonnegative(),
  pushed: z.number().int().nonnegative(),
  conflicts: syncConflictSummarySchema,
  syncedAt: z.string().optional(),
});

export const syncSetAutoSchema = z.strictObject({
  enabled: z.boolean(),
});

export const syncSetAutoArgsSchema = z.tuple([syncSetAutoSchema]);

export const runtimeSupabaseConfigSchema = z.strictObject({
  url: z
    .string()
    .min(1)
    .max(1024)
    .refine((value) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    }, "Supabase URL must be a valid http(s) URL"),
  anonKey: z.string().min(16).max(8096),
});

export const runtimeSupabaseConfigInputSchema = z.strictObject({
  url: z.string().max(1024).optional(),
  anonKey: z.string().max(8096).optional(),
});

export const runtimeSupabaseConfigViewSchema = z.object({
  url: z.string().nullable(),
  hasAnonKey: z.boolean(),
  source: z.enum(["env", "runtime", "legacy"]).optional(),
});

export const runtimeSupabaseConfigValidationSchema = z.object({
  valid: z.boolean(),
  issues: z.array(z.string()),
  normalized: runtimeSupabaseConfigSchema.optional(),
});

export const syncRuntimeConfigSetArgsSchema = z.tuple([
  runtimeSupabaseConfigSchema,
]);
export const syncRuntimeConfigValidateArgsSchema = z.tuple([
  runtimeSupabaseConfigInputSchema,
]);

export const syncResolveConflictSchema = z.strictObject({
  type: z.enum(["chapter", "memo"]),
  id: z.string().min(1),
  resolution: z.enum(["local", "remote"]),
});

export const syncResolveConflictArgsSchema = z.tuple([
  syncResolveConflictSchema,
]);

export const editorSettingsSchema = z.strictObject({
  fontFamily: z.enum(["serif", "sans", "mono"]),
  fontPreset: z
    .enum([
      "inter",
      "lora",
      "bitter",
      "source-serif",
      "montserrat",
      "nunito-sans",
      "victor-mono",
    ])
    .optional(),
  fontSize: z.number().int().positive(),
  lineHeight: z.number().positive(),
  maxWidth: z.number().int().positive(),
  spellcheckEnabled: z.boolean().optional().default(true),
  theme: z.enum(["light", "dark", "sepia"]),
  themeTemp: z.enum(["neutral", "warm", "cool"]).optional().default("neutral"),
  themeContrast: z.enum(["soft", "high"]).optional().default("soft"),
  themeAccent: z
    .enum(["blue", "violet", "green", "amber", "rose", "slate"])
    .optional()
    .default("blue"),
  themeTexture: z.boolean().optional().default(true),
  uiMode: z
    .enum(["default", "docs", "editor", "word", "scrivener"])
    .transform((v) => (v === "word" ? "editor" : v))
    .pipe(z.enum(["default", "docs", "editor", "scrivener"]))
    .catch("default"),
  enableAnimations: z.boolean().optional().default(true),
});

export const settingsAutoSaveSchema = z.strictObject({
  enabled: z.boolean().optional(),
  interval: z.number().int().positive().optional(),
});

export const settingsLanguageSchema = z.strictObject({
  language: z.enum(["ko", "en", "ja"]),
});

export const settingsMenuBarModeSchema = z.strictObject({
  mode: z.enum(["hidden", "visible"]),
});

export const settingsShortcutsSchema = z.strictObject({
  shortcuts: z.record(z.string(), z.string()),
});

export const windowBoundsSchema = z.strictObject({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  x: z.number().int(),
  y: z.number().int(),
});

const uiRightPanelTabSchema = z.enum([
  "character",
  "event",
  "faction",
  "world",
  "scrap",
  "analysis",
  "snapshot",
  "trash",
  "editor",
  "export",
]);

const uiMainViewSchema = z.strictObject({
  type: z.enum([
    "editor",
    "character",
    "event",
    "faction",
    "world",
    "memo",
    "trash",
    "analysis",
  ]),
  id: z.string().optional(),
});

const uiScrivenerSectionsSchema = z.strictObject({
  manuscript: z.boolean(),
  characters: z.boolean(),
  world: z.boolean(),
  scrap: z.boolean(),
  snapshots: z.boolean(),
  analysis: z.boolean(),
  trash: z.boolean(),
});

const uiRegionsSchema = z.strictObject({
  leftSidebar: z.strictObject({
    open: z.boolean(),
    widthPx: z.number().finite(),
  }),
  rightPanel: z.strictObject({
    open: z.boolean(),
    activeTab: uiRightPanelTabSchema.nullable(),
    widthByTab: z.record(z.string(), z.number().finite()),
  }),
  rightRail: z.strictObject({
    open: z.boolean(),
  }),
});

export const uiStorePersistedStateSchema = z.strictObject({
  schemaVersion: z
    .number()
    .int()
    .positive()
    .max(UI_STORE_SCHEMA_VERSION)
    .optional(),
  view: z.enum(["template", "editor", "corkboard", "outliner"]).optional(),
  contextTab: z.enum(["synopsis", "characters", "terms"]).optional(),
  worldTab: z
    .enum(["synopsis", "terms", "mindmap", "drawing", "plot", "graph"])
    .optional(),
  isSidebarOpen: z.boolean().optional(),
  isContextOpen: z.boolean().optional(),
  isManuscriptMenuOpen: z.boolean().optional(),
  isBinderBarOpen: z.boolean().optional(),
  scrivenerSidebarOpen: z.boolean().optional(),
  scrivenerInspectorOpen: z.boolean().optional(),
  scrivenerSections: uiScrivenerSectionsSchema.optional(),
  sidebarWidths: z.record(z.string(), z.number().finite()).optional(),
  layoutSurfaceRatios: z.record(z.string(), z.number().finite()).optional(),
  regions: uiRegionsSchema.optional(),
  docsRightTab: uiRightPanelTabSchema.nullable().optional(),
  mainView: uiMainViewSchema.optional(),
});

const projectLayoutStateSchema = z.strictObject({
  main: z.strictObject({
    sidebarOpen: z.boolean(),
    contextOpen: z.boolean(),
  }),
  docs: z.strictObject({
    sidebarOpen: z.boolean(),
    binderBarOpen: z.boolean(),
    rightTab: uiRightPanelTabSchema.nullable(),
  }),
  scrivener: z.strictObject({
    sidebarOpen: z.boolean(),
    inspectorOpen: z.boolean(),
    sections: uiScrivenerSectionsSchema,
  }),
});

export const projectLayoutPersistedStateSchema = z.strictObject({
  schemaVersion: z
    .number()
    .int()
    .positive()
    .max(PROJECT_LAYOUT_SCHEMA_VERSION)
    .optional(),
  byProject: z.record(z.string(), projectLayoutStateSchema),
});

const scrapMemoSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  updatedAt: z.string(),
});

export const worldScrapMemosDataSchema = z.strictObject({
  schemaVersion: z
    .number()
    .int()
    .positive()
    .max(WORLD_SCRAP_MEMOS_SCHEMA_VERSION)
    .optional(),
  memos: z.array(scrapMemoSchema),
  updatedAt: z.string().optional(),
});

export const replicaWorldDocumentTypeSchema = z.enum([
  "synopsis",
  "plot",
  "drawing",
  "mindmap",
  "graph",
  "scrap",
]);

export const worldReplicaDocumentGetSchema = z.strictObject({
  projectId: projectIdSchema,
  docType: replicaWorldDocumentTypeSchema,
});

export const worldReplicaDocumentSetSchema = z.strictObject({
  projectId: projectIdSchema,
  docType: replicaWorldDocumentTypeSchema,
  payload: z.unknown(),
});

export const worldReplicaScrapMemosGetSchema = z.strictObject({
  projectId: projectIdSchema,
});

export const worldReplicaScrapMemosSetSchema = z.strictObject({
  projectId: projectIdSchema,
  data: worldScrapMemosDataSchema,
});

export type UiStorePersistedState = z.infer<typeof uiStorePersistedStateSchema>;
export type ProjectLayoutPersistedState = z.infer<
  typeof projectLayoutPersistedStateSchema
>;
export type WorldScrapMemosPersistedData = z.infer<
  typeof worldScrapMemosDataSchema
>;

// ─── World Building Schemas ─────────────────────────────────────────────────

export const worldEntityTypeSchema = z.enum([
  "Place",
  "Concept",
  "Rule",
  "Item",
]);
export const entityRelationTypeSchema = z.enum([
  "Character",
  "Faction",
  "Event",
  "Place",
  "Concept",
  "Rule",
  "Item",
  "Term",
  "WorldEntity",
]);
export const relationKindSchema = z.enum([
  "belongs_to",
  "enemy_of",
  "causes",
  "controls",
  "located_in",
  "violates",
]);

export const worldEntityIdSchema = z.string().uuid("Invalid world entity ID");
export const entityRelationIdSchema = z
  .string()
  .uuid("Invalid entity relation ID");

export const worldEntityCreateSchema = z.object({
  projectId: projectIdSchema,
  type: worldEntityTypeSchema,
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  firstAppearance: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
});

export const worldEntityUpdateSchema = z.object({
  id: worldEntityIdSchema,
  type: worldEntityTypeSchema.optional(),
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  firstAppearance: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const worldEntityUpdatePositionSchema = z.object({
  id: worldEntityIdSchema,
  positionX: z.number(),
  positionY: z.number(),
});

export const entityRelationCreateSchema = z
  .object({
    projectId: projectIdSchema,
    sourceId: z.string().uuid("Invalid source ID"),
    sourceType: entityRelationTypeSchema,
    targetId: z.string().uuid("Invalid target ID"),
    targetType: entityRelationTypeSchema,
    relation: relationKindSchema,
    attributes: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      !isRelationAllowed(value.relation, value.sourceType, value.targetType)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid relation mapping: ${value.sourceType} -> ${value.targetType} (${value.relation})`,
        path: ["relation"],
      });
    }
  });

export const entityRelationUpdateSchema = z.object({
  id: entityRelationIdSchema,
  relation: relationKindSchema.optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const worldGraphMentionsQuerySchema = z.object({
  projectId: projectIdSchema,
  entityId: z.string().uuid("Invalid entity ID"),
  entityType: entityRelationTypeSchema,
  limit: z.number().int().positive().max(500).optional(),
});

const GRAPH_PLUGIN_ALLOWED_MANIFEST_KEYS = new Set([
  "id",
  "name",
  "version",
  "apiVersion",
  "kind",
  "description",
  "author",
  "templates",
]);

const GRAPH_PLUGIN_BLOCKED_MANIFEST_KEYS = new Set([
  "main",
  "entry",
  "entrypoint",
  "renderer",
  "background",
  "preload",
  "scripts",
  "permissions",
]);

const graphPluginVersionSchema = z.string().min(1).max(64);

export const graphTemplateManifestSchema = z
  .object({
    id: z.string().min(1).max(128),
    title: z.string().min(1).max(200),
    summary: z.string().min(1).max(2000),
    thumbnail: z.string().max(PATH_MAX_LENGTH),
    graphEntry: z.string().min(1).max(PATH_MAX_LENGTH),
    tags: z.array(z.string().min(1).max(64)).max(32),
  })
  .strict();

export const graphPluginManifestSchema = z
  .object({
    id: z.string().min(1).max(128),
    name: z.string().min(1).max(200),
    version: graphPluginVersionSchema,
    apiVersion: graphPluginVersionSchema,
    kind: z.literal("graph-template-bundle"),
    description: z.string().min(1).max(4000),
    author: z.string().min(1).max(200),
    templates: z.array(graphTemplateManifestSchema).min(1).max(100),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    for (const key of Object.keys(value)) {
      if (GRAPH_PLUGIN_ALLOWED_MANIFEST_KEYS.has(key)) {
        continue;
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: GRAPH_PLUGIN_BLOCKED_MANIFEST_KEYS.has(key)
          ? `Executable manifest field is not allowed in V1: ${key}`
          : `Unknown manifest field is not allowed: ${key}`,
        path: [key],
      });
    }
  })
  .transform((value) => ({
    id: value.id,
    name: value.name,
    version: value.version,
    apiVersion: value.apiVersion,
    kind: value.kind,
    description: value.description,
    author: value.author,
    templates: value.templates,
  }));

export const graphPluginCatalogItemSchema = z.strictObject({
  pluginId: z.string().min(1).max(128),
  version: graphPluginVersionSchema,
  name: z.string().min(1).max(200),
  summary: z.string().min(1).max(2000),
  releaseTag: z.string().min(1).max(200),
  assetUrl: z.string().url(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i, "Invalid sha256"),
  size: z.number().int().positive().max(1024 * 1024 * 1024),
  minAppVersion: graphPluginVersionSchema,
  apiVersion: graphPluginVersionSchema,
});

export const installedGraphPluginSchema = z.strictObject({
  pluginId: z.string().min(1).max(128),
  version: graphPluginVersionSchema,
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  author: z.string().min(1).max(200),
  apiVersion: graphPluginVersionSchema,
  kind: z.literal("graph-template-bundle"),
  installedAt: z.string().min(1),
  source: z.strictObject({
    assetUrl: z.string().url(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/i, "Invalid sha256"),
  }),
  status: z.literal("installed"),
});

export const installedGraphPluginIndexSchema = z.array(
  installedGraphPluginSchema,
);

export const graphPluginApplyTemplateSchema = z.strictObject({
  pluginId: z.string().min(1).max(128),
  templateId: z.string().min(1).max(128),
  projectId: projectIdSchema,
});

export const graphPluginInstallArgsSchema = z.tuple([
  z.string().min(1).max(128),
]);
export const graphPluginUninstallArgsSchema = z.tuple([
  z.string().min(1).max(128),
]);
export const graphPluginApplyTemplateArgsSchema = z.tuple([
  graphPluginApplyTemplateSchema,
]);
