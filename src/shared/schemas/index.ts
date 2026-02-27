import { z } from "zod";
import { isRelationAllowed } from "../constants/worldRelationRules";

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

const dialogFilterSchema = z.object({
  name: z.string().min(1).max(100),
  extensions: z.array(z.string().min(1).max(20)).max(20),
});

const dialogOptionsSchema = z.object({
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
  characterId: characterIdSchema,
  chapterId: chapterIdSchema,
  position: z.number().int().nonnegative(),
  context: z.string().optional(),
});

export const termAppearanceSchema = z.object({
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
  showPageNumbers: z.boolean().optional(),
  startPageNumber: z.number().int().min(1).max(100_000).optional(),
});

export const exportCreateArgsSchema = z.tuple([exportRequestSchema]);

export const fsSelectDialogArgsSchema = z.tuple([dialogOptionsSchema.optional()]);
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
export const fsWriteFileArgsSchema = z.tuple([basePathSchema, baseContentSchema]);
export const fsCreateLuiePackageArgsSchema = z.tuple([basePathSchema, z.unknown()]);
export const fsWriteProjectFileArgsSchema = z.tuple([
  basePathSchema,
  z.string().min(1).max(PATH_MAX_LENGTH),
  baseContentSchema,
]);

export const windowSetFullscreenArgsSchema = z.tuple([z.boolean()]);
export const windowOpenExportArgsSchema = z.tuple([chapterIdSchema]);
export const analysisStartArgsSchema = z.tuple([
  z.object({
    chapterId: chapterIdSchema,
    projectId: projectIdSchema,
  }),
]);
export const recoveryRunDbArgsSchema = z.tuple([
  z
    .object({
      dryRun: z.boolean().optional(),
    })
    .optional(),
]);

export const appBootstrapStatusSchema = z.object({
  isReady: z.boolean(),
  error: z.string().optional(),
});

export const syncConflictSummarySchema = z.object({
  chapters: z.number().int().nonnegative(),
  memos: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
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
  inFlight: z.boolean(),
  queued: z.boolean(),
  conflicts: syncConflictSummarySchema,
  projectLastSyncedAtByProjectId: z.record(z.string(), z.string()).optional(),
});

export const syncRunResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  pulled: z.number().int().nonnegative(),
  pushed: z.number().int().nonnegative(),
  conflicts: syncConflictSummarySchema,
  syncedAt: z.string().optional(),
});

export const syncSetAutoSchema = z.object({
  enabled: z.boolean(),
});

export const syncSetAutoArgsSchema = z.tuple([syncSetAutoSchema]);

export const editorSettingsSchema = z.object({
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
  theme: z.enum(["light", "dark", "sepia"]),
  themeTemp: z.enum(["neutral", "warm", "cool"]).optional().default("neutral"),
  themeContrast: z.enum(["soft", "high"]).optional().default("soft"),
  themeAccent: z
    .enum(["blue", "violet", "green", "amber", "rose", "slate"])
    .optional()
    .default("blue"),
  themeTexture: z.boolean().optional().default(true),
  uiMode: z.enum(["default", "docs", "editor", "word", "scrivener"]).transform(v => v === "word" ? "editor" : v).pipe(z.enum(["default", "docs", "editor", "scrivener"])).catch("default"),
});

export const settingsAutoSaveSchema = z.object({
  enabled: z.boolean().optional(),
  interval: z.number().int().positive().optional(),
});

export const settingsLanguageSchema = z.object({
  language: z.enum(["ko", "en", "ja"]),
});

export const settingsMenuBarModeSchema = z.object({
  mode: z.enum(["hidden", "visible"]),
});

export const settingsShortcutsSchema = z.object({
  shortcuts: z.record(z.string(), z.string()),
});

export const windowBoundsSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  x: z.number().int(),
  y: z.number().int(),
});

// ─── World Building Schemas ─────────────────────────────────────────────────

export const worldEntityTypeSchema = z.enum(["Place", "Concept", "Rule", "Item"]);
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
export const entityRelationIdSchema = z.string().uuid("Invalid entity relation ID");

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

export const entityRelationCreateSchema = z.object({
  projectId: projectIdSchema,
  sourceId: z.string().uuid("Invalid source ID"),
  sourceType: entityRelationTypeSchema,
  targetId: z.string().uuid("Invalid target ID"),
  targetType: entityRelationTypeSchema,
  relation: relationKindSchema,
  attributes: z.record(z.string(), z.unknown()).optional(),
}).superRefine((value, ctx) => {
  if (!isRelationAllowed(value.relation, value.sourceType, value.targetType)) {
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
