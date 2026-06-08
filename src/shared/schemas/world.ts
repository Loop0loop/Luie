import { z } from "zod";
import { isRelationAllowed } from "../constants/worldRelationRules";
import { WORLD_SCRAP_MEMOS_SCHEMA_VERSION } from "../constants/persistence";
import { PATH_MAX_LENGTH, characterIdSchema, chapterIdSchema, projectIdSchema, termIdSchema } from "./common";

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

export type WorldScrapMemosPersistedData = z.infer<
  typeof worldScrapMemosDataSchema
>;
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
  memoryEntityId: z.string().uuid("Invalid memory entity ID").nullable().optional(),
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
  memoryEntityId: z.string().uuid("Invalid memory entity ID").nullable().optional(),
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
  size: z
    .number()
    .int()
    .positive()
    .max(1024 * 1024 * 1024),
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
