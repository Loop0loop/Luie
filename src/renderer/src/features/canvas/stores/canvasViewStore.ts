/**
 * canvasViewStore — view-model state for the canvas viewport + activity sidebar.
 *
 * Persisted across sessions:
 *   - mode, scope, layers, focuses (range/preset memory)
 *   - zoom/pan (last viewport)
 *   - activePanel + isActivityCollapsed + isBinderCollapsed (P2 sidebar shell)
 *
 * NOT persisted:
 *   - selection (transient, reset between sessions)
 *
 * Layout RATIOS for canvas.activity / canvas.binder live in `uiStore.layoutSurfaceRatios`.
 * This store only owns logical view state.
 */

import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import type {
  CanvasActivityPanel,
  CanvasLayer,
  CanvasMode,
  CanvasScope,
  CanvasSelection,
  CanvasViewport,
} from "../types/canvas.types";

/* ─────────────────────────────────────────── constants */

const STORAGE_KEY = "canvas_view_v2";
const SCHEMA_VERSION = 2;

const ALL_MODES: ReadonlyArray<CanvasMode> = [
  "flow-map",
  "scene-board",
  "timeline",
  "character-map",
  "memory-map",
];

const ALL_LAYERS: ReadonlyArray<CanvasLayer> = [
  "scene",
  "character",
  "event",
  "memo",
  "ai-hint",
];

const ALL_ACTIVITY_PANELS: ReadonlyArray<CanvasActivityPanel> = [
  "explorer",
  "canvas",
  "entities",
  "memory",
  "search",
];

const DEFAULT_LAYERS: ReadonlyArray<CanvasLayer> = [
  "scene",
  "character",
  "event",
  "memo",
];

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3;

/* ─────────────────────────────────────────── helpers */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isCanvasMode = (value: unknown): value is CanvasMode =>
  typeof value === "string" && ALL_MODES.includes(value as CanvasMode);

const isCanvasLayer = (value: unknown): value is CanvasLayer =>
  typeof value === "string" && ALL_LAYERS.includes(value as CanvasLayer);

const isCanvasActivityPanel = (value: unknown): value is CanvasActivityPanel =>
  typeof value === "string" &&
  ALL_ACTIVITY_PANELS.includes(value as CanvasActivityPanel);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const clampZoom = (zoom: number): number =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));

const sanitizePersistedScope = (input: unknown): CanvasScope | null => {
  if (!isRecord(input)) return null;
  const kind = input.kind;
  if (kind === "single-chapter" && typeof input.chapterId === "string") {
    return { kind, chapterId: input.chapterId };
  }
  if (kind === "three-chapters" && typeof input.centerChapterId === "string") {
    return { kind, centerChapterId: input.centerChapterId };
  }
  if (kind === "current-part" && typeof input.partId === "string") {
    return { kind, partId: input.partId };
  }
  if (kind === "whole-project" && typeof input.projectId === "string") {
    return { kind, projectId: input.projectId };
  }
  return null;
};

const sanitizeViewport = (input: unknown): CanvasViewport => {
  const fallback: CanvasViewport = { zoom: 1, pan: { x: 0, y: 0 } };
  if (!isRecord(input)) return fallback;
  const zoom = isFiniteNumber(input.zoom) ? clampZoom(input.zoom) : 1;
  const panInput = isRecord(input.pan) ? input.pan : null;
  const pan: CanvasViewport["pan"] = {
    x: panInput && isFiniteNumber(panInput.x) ? panInput.x : 0,
    y: panInput && isFiniteNumber(panInput.y) ? panInput.y : 0,
  };
  return { zoom, pan };
};

const sanitizePersistedState = (
  input: unknown,
): Partial<CanvasViewState> => {
  if (!isRecord(input)) return {};

  const next: Partial<CanvasViewState> = {};

  if (isCanvasMode(input.mode)) next.mode = input.mode;

  const scope = sanitizePersistedScope(input.scope);
  next.scope = scope; // explicit null is meaningful (no scope chosen)

  if (Array.isArray(input.layers)) {
    const layers = input.layers.filter(isCanvasLayer);
    if (layers.length > 0) next.layers = layers;
  }

  if (Array.isArray(input.focuses)) {
    const focuses = input.focuses.filter(
      (id): id is string => typeof id === "string",
    );
    next.focuses = focuses;
  }

  if (isRecord(input.viewport)) {
    next.viewport = sanitizeViewport(input.viewport);
  }

  if (typeof input.lastPreset === "string") {
    next.lastPreset = input.lastPreset;
  }

  if (isCanvasActivityPanel(input.activePanel)) {
    next.activePanel = input.activePanel;
  }

  if (typeof input.isActivityCollapsed === "boolean") {
    next.isActivityCollapsed = input.isActivityCollapsed;
  }

  if (typeof input.isBinderCollapsed === "boolean") {
    next.isBinderCollapsed = input.isBinderCollapsed;
  }

  return next;
};

const createNoopStorage = (): StateStorage => ({
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
});

/* ─────────────────────────────────────────── state shape */

export interface CanvasViewState {
  /* viewport ─────── */
  mode: CanvasMode;
  scope: CanvasScope | null;
  layers: CanvasLayer[];
  focuses: string[];
  viewport: CanvasViewport;
  lastPreset: string | null;
  selection: CanvasSelection;

  /* sidebar ─────── */
  activePanel: CanvasActivityPanel;
  isActivityCollapsed: boolean;
  isBinderCollapsed: boolean;

  /* actions: viewport */
  setMode: (mode: CanvasMode) => void;
  setScope: (scope: CanvasScope | null) => void;
  toggleLayer: (layer: CanvasLayer) => void;
  setLayers: (layers: CanvasLayer[]) => void;
  setFocuses: (focuses: string[]) => void;
  setViewport: (viewport: Partial<CanvasViewport>) => void;
  setLastPreset: (preset: string | null) => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  clearSelection: () => void;

  /* actions: sidebar */
  setActivePanel: (panel: CanvasActivityPanel) => void;
  toggleActivity: () => void;
  toggleBinder: () => void;
  setActivityCollapsed: (collapsed: boolean) => void;
  setBinderCollapsed: (collapsed: boolean) => void;
}

/* ─────────────────────────────────────────── store */

export const useCanvasViewStore = create<CanvasViewState>()(
  persist(
    (set) => ({
      mode: "flow-map",
      scope: null,
      layers: [...DEFAULT_LAYERS],
      focuses: [],
      viewport: { zoom: 1, pan: { x: 0, y: 0 } },
      lastPreset: null,
      selection: { kind: "none" },

      activePanel: "explorer",
      isActivityCollapsed: false,
      isBinderCollapsed: false,

      setMode: (mode) => set({ mode }),
      setScope: (scope) => set({ scope }),
      toggleLayer: (layer) =>
        set((state) => ({
          layers: state.layers.includes(layer)
            ? state.layers.filter((value) => value !== layer)
            : [...state.layers, layer],
        })),
      setLayers: (layers) =>
        set({
          layers: layers.filter(isCanvasLayer),
        }),
      setFocuses: (focuses) =>
        set({
          focuses: focuses.filter((id) => typeof id === "string"),
        }),
      setViewport: (next) =>
        set((state) => ({
          viewport: {
            zoom:
              next.zoom !== undefined && isFiniteNumber(next.zoom)
                ? clampZoom(next.zoom)
                : state.viewport.zoom,
            pan: {
              x:
                next.pan && isFiniteNumber(next.pan.x)
                  ? next.pan.x
                  : state.viewport.pan.x,
              y:
                next.pan && isFiniteNumber(next.pan.y)
                  ? next.pan.y
                  : state.viewport.pan.y,
            },
          },
        })),
      setLastPreset: (lastPreset) => set({ lastPreset }),
      selectNode: (nodeId) =>
        set({
          selection: nodeId ? { kind: "node", id: nodeId } : { kind: "none" },
        }),
      selectEdge: (edgeId) =>
        set({
          selection: edgeId ? { kind: "edge", id: edgeId } : { kind: "none" },
        }),
      clearSelection: () => set({ selection: { kind: "none" } }),

      setActivePanel: (activePanel) =>
        set({ activePanel, isActivityCollapsed: false }),
      toggleActivity: () =>
        set((state) => ({ isActivityCollapsed: !state.isActivityCollapsed })),
      toggleBinder: () =>
        set((state) => ({ isBinderCollapsed: !state.isBinderCollapsed })),
      setActivityCollapsed: (isActivityCollapsed) =>
        set({ isActivityCollapsed }),
      setBinderCollapsed: (isBinderCollapsed) => set({ isBinderCollapsed }),
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() =>
        typeof localStorage === "undefined"
          ? createNoopStorage()
          : localStorage,
      ),
      migrate: (persistedState) => sanitizePersistedState(persistedState),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizePersistedState(persistedState),
      }),
      onRehydrateStorage: () => () => undefined,
      partialize: (state) => ({
        mode: state.mode,
        scope: state.scope,
        layers: state.layers,
        focuses: state.focuses,
        viewport: state.viewport,
        lastPreset: state.lastPreset,
        activePanel: state.activePanel,
        isActivityCollapsed: state.isActivityCollapsed,
        isBinderCollapsed: state.isBinderCollapsed,
      }),
    },
  ),
);
