/**
 * canvasViewSchema — Zod schemas for canvas view persisted state.
 *
 * Replaces 100+ lines of manual sanitize functions with declarative validation.
 * The `sanitizePersistedState` function is the single entry point used by
 * zustand's `migrate` and `merge` options.
 */

import { z } from "zod";
import type {
  CanvasActivityPanel,
  CanvasLayer,
  CanvasMode,
  CanvasScope,
  CanvasViewport,
} from "../types/canvas.types";
import {
  CANVAS_ALL_MODES,
  CANVAS_ALL_LAYERS,
  CANVAS_DEFAULT_LAYERS,
  DEFAULT_CANVAS_MODE,
} from "../constants";

/* ─────────────────────────────────────────── schemas */

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

/**
 * Sanitize unknown persisted input into a partial state object.
 * Returns `{}` when nothing is salvageable — zustand falls back to defaults.
 */
export function sanitizePersistedState(input: unknown): Partial<CanvasViewPersistedState> {
  const result = CanvasViewPersistedSchema.safeParse(input);
  if (!result.success) return {};
  return result.data as Partial<CanvasViewPersistedState>;
}
