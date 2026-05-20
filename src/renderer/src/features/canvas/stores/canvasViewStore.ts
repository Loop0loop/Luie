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
import {
  sanitizePersistedState,
  type CanvasViewPersistedState,
} from "./canvasViewSchema";
import {
  CANVAS_ALL_LAYERS,
  CANVAS_DEFAULT_LAYERS,
} from "../constants";

/* ─────────────────────────────────────────── constants */

const STORAGE_KEY = "canvas_view_v2";
const SCHEMA_VERSION = 2;

const isCanvasLayer = (value: unknown): value is CanvasLayer =>
  typeof value === "string" && (CANVAS_ALL_LAYERS as readonly string[]).includes(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const clampZoom = (zoom: number): number =>
  Math.min(3, Math.max(0.25, zoom));

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
      layers: [...CANVAS_DEFAULT_LAYERS],
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
      partialize: (state): CanvasViewPersistedState => ({
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
