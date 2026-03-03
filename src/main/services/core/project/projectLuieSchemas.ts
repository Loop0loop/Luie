import { z } from "zod";

export const LuieMetaSchema = z
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

export const LuieCharactersSchema = z
  .object({
    characters: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

export const LuieTermsSchema = z
  .object({
    terms: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

export const LuieWorldSynopsisSchema = z
  .object({
    synopsis: z.string().optional(),
    status: z.enum(["draft", "working", "locked"]).optional(),
    genre: z.string().optional(),
    targetAudience: z.string().optional(),
    logline: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const LuieWorldPlotSchema = z
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

export const LuieWorldDrawingSchema = z
  .object({
    paths: z.array(z.record(z.string(), z.unknown())).optional(),
    tool: z.enum(["pen", "text", "eraser", "icon"]).optional(),
    iconType: z.enum(["mountain", "castle", "village"]).optional(),
    color: z.string().optional(),
    lineWidth: z.number().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const LuieWorldMindmapSchema = z
  .object({
    nodes: z.array(z.record(z.string(), z.unknown())).optional(),
    edges: z.array(z.record(z.string(), z.unknown())).optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const LuieWorldScrapMemosSchema = z
  .object({
    memos: z.array(z.record(z.string(), z.unknown())).optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const LuieWorldGraphNodeSchema = z
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

export const LuieWorldGraphEdgeSchema = z
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

export const LuieWorldGraphSchema = z
  .object({
    nodes: z.array(LuieWorldGraphNodeSchema).optional(),
    edges: z.array(LuieWorldGraphEdgeSchema).optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const LuieSnapshotSchema = z
  .object({
    id: z.string(),
    projectId: z.string().optional(),
    chapterId: z.string().optional().nullable(),
    content: z.string().optional(),
    description: z.string().optional().nullable(),
    createdAt: z.string().optional(),
  })
  .passthrough();

export const LuieSnapshotsSchema = z
  .object({
    snapshots: z.array(LuieSnapshotSchema).optional(),
  })
  .passthrough();
