import { z } from "zod";
import type {
  CanvasActivityPanel,
  CanvasScope,
  CanvasViewport,
} from "../types/canvas.types";
import {
  CANVAS_ALL_MODES,
  CANVAS_ALL_LAYERS,
  CANVAS_DEFAULT_LAYERS,
  DEFAULT_CANVAS_MODE,
} from "../constants";

const CanvasScopeSchema: z.ZodType<CanvasScope> = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("single-chapter"), chapterId: z.string() }),
  z.object({ kind: z.literal("three-chapters"), centerChapterId: z.string() }),
  z.object({ kind: z.literal("current-part"), partId: z.string() }),
  z.object({ kind: z.literal("whole-project"), projectId: z.string() }),
]) as z.ZodType<CanvasScope>;

const CanvasViewportSchema: z.ZodType<CanvasViewport> = z.object({
  zoom: z.number().finite().min(0.25).max(3),
  pan: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
  }),
}).default({ zoom: 1, pan: { x: 0, y: 0 } }) as z.ZodType<CanvasViewport>;

export const CanvasViewPersistedSchema = z.object({
  mode: z.enum(CANVAS_ALL_MODES as unknown as [string, ...string[]]).default(DEFAULT_CANVAS_MODE),
  scope: CanvasScopeSchema.nullable().default(null),
  layers: z.array(z.enum(CANVAS_ALL_LAYERS as unknown as [string, ...string[]])).default(CANVAS_DEFAULT_LAYERS as unknown as string[]),
  focuses: z.array(z.string()).default([]),
  viewport: CanvasViewportSchema,
  lastPreset: z.string().nullable().default(null),
  activePanel: z.enum(["explorer", "graph", "canvas", "memory", "search"] as const satisfies readonly CanvasActivityPanel[]).default("explorer"),
  isActivityCollapsed: z.boolean().default(false),
  isBinderCollapsed: z.boolean().default(false),
});

export type CanvasViewPersistedState = z.infer<typeof CanvasViewPersistedSchema>;

/** 알 수 없는 저장값에서 유효한 canvas state만 복구하며 실패하면 기본값용 `{}`를 반환한다. */
export function sanitizePersistedState(input: unknown): Partial<CanvasViewPersistedState> {
  const result = CanvasViewPersistedSchema.safeParse(input);
  if (!result.success) return {};
  return result.data as Partial<CanvasViewPersistedState>;
}
