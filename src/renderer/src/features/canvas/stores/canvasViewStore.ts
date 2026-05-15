import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import type {
  CanvasFocus,
  CanvasLayer,
  CanvasMode,
  CanvasSelection,
  CanvasViewPreset,
} from "../types/canvas.types";
import type { CanvasScope } from "../types/canvasScope.types";
import { getDefaultCanvasMode } from "../utils/canvasModeRegistry";

/**
 * Canvas View State — 사용자가 "어떻게 보고 있는가"를 표현. PRD §10.4.
 *
 *   mode      : 현재 활성 시각화 모드 (flow-map 등)
 *   scope     : 현재 입력 chapter 범위 (single/range/arc/custom)
 *   selection : 선택된 노드/엣지
 *   layers    : 활성 시각 레이어 토글
 *   focus     : 강조할 종류 필터
 *   zoom/pan  : 캔버스 viewport
 *   preset    : 마지막으로 적용한 View Preset (적용 후 사용자가 수정해도
 *               기록은 남겨, 다시 같은 Preset 클릭 시 reset 가능)
 *
 * persist는 worldGraphUiStore 패턴을 인용 — 부분 저장 + sanitize +
 * version migration.
 */

type LayerMap = Readonly<Record<CanvasLayer, boolean>>;
type FocusMap = Readonly<Record<CanvasFocus, boolean>>;

const DEFAULT_LAYERS: LayerMap = {
  scene: true,
  character: true,
  event: true,
  memo: false,
  "ai-hint": false,
};

const DEFAULT_FOCUSES: FocusMap = {
  character: false,
  event: false,
  location: false,
  foreshadow: false,
  conflict: false,
};

const DEFAULT_SELECTION: CanvasSelection = { kind: "none", id: null };

const DEFAULT_VIEWPORT = { zoom: 1, pan: { x: 0, y: 0 } } as const;

interface CanvasViewState {
  mode: CanvasMode;
  /** 현재 scope. null이면 빈 상태(empty) — projection도 empty가 된다. */
  scope: CanvasScope | null;
  selection: CanvasSelection;
  layers: LayerMap;
  focuses: FocusMap;
  zoom: number;
  pan: { x: number; y: number };
  /** 마지막으로 적용한 Preset. 적용 후 사용자 수정과는 별개로 기록만. */
  lastPreset: CanvasViewPreset | null;
  hasHydrated: boolean;

  setMode: (mode: CanvasMode) => void;
  setScope: (scope: CanvasScope | null) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  clearSelection: () => void;
  toggleLayer: (id: CanvasLayer) => void;
  toggleFocus: (id: CanvasFocus) => void;
  setLayers: (layers: Partial<Record<CanvasLayer, boolean>>) => void;
  setFocuses: (focuses: Partial<Record<CanvasFocus, boolean>>) => void;
  setViewport: (viewport: { zoom?: number; pan?: { x: number; y: number } }) => void;
  setLastPreset: (preset: CanvasViewPreset | null) => void;
}

const STORAGE_KEY = "canvas_view_v1";
const SCHEMA_VERSION = 1;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === "object" && !Array.isArray(v);

const isCanvasMode = (value: unknown): value is CanvasMode =>
  value === "flow-map" ||
  value === "scene-board" ||
  value === "timeline" ||
  value === "character-map" ||
  value === "memory-map";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/**
 * Persist payload sanitize — partial 입력에서 신뢰할 수 있는 값만 받는다.
 *
 * Scope는 union이라 잘못된 형태로 저장되면 캔버스가 깨질 수 있어
 * 각 type별로 필수 필드만 검증해 통과시킨다. 검증 실패 시 null로
 * 떨어뜨려 빈 상태에서 시작.
 */
const sanitizePersistedScope = (input: unknown): CanvasScope | null => {
  if (!isRecord(input)) return null;
  switch (input.type) {
    case "single-chapter":
      return typeof input.chapterId === "string"
        ? { type: "single-chapter", chapterId: input.chapterId }
        : null;
    case "chapter-range":
      return typeof input.fromChapterId === "string" &&
        typeof input.toChapterId === "string"
        ? {
            type: "chapter-range",
            fromChapterId: input.fromChapterId,
            toChapterId: input.toChapterId,
          }
        : null;
    case "arc":
      return typeof input.arcId === "string"
        ? { type: "arc", arcId: input.arcId }
        : null;
    case "custom":
      return Array.isArray(input.chapterIds) &&
        input.chapterIds.every((v) => typeof v === "string")
        ? { type: "custom", chapterIds: input.chapterIds as string[] }
        : null;
    default:
      return null;
  }
};

const sanitizePersistedState = (
  input: unknown,
): Partial<CanvasViewState> => {
  if (!isRecord(input)) return {};
  return {
    ...(isCanvasMode(input.mode) ? { mode: input.mode } : {}),
    scope: sanitizePersistedScope(input.scope),
    ...(isRecord(input.layers)
      ? {
          layers: { ...DEFAULT_LAYERS, ...filterBoolMap(input.layers) } as LayerMap,
        }
      : {}),
    ...(isRecord(input.focuses)
      ? {
          focuses: {
            ...DEFAULT_FOCUSES,
            ...filterBoolMap(input.focuses),
          } as FocusMap,
        }
      : {}),
    ...(isFiniteNumber(input.zoom) ? { zoom: clampZoom(input.zoom) } : {}),
    ...(isRecord(input.pan) &&
    isFiniteNumber(input.pan.x) &&
    isFiniteNumber(input.pan.y)
      ? { pan: { x: input.pan.x, y: input.pan.y } }
      : {}),
  };
};

function filterBoolMap(
  input: Record<string, unknown>,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === "boolean") out[k] = v;
  }
  return out;
}

const clampZoom = (z: number): number => Math.min(2.5, Math.max(0.2, z));

const createNoopStorage = (): StateStorage => ({
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
});

export const useCanvasViewStore = create<CanvasViewState>()(
  persist(
    (set) => ({
      mode: getDefaultCanvasMode(),
      scope: null,
      selection: DEFAULT_SELECTION,
      layers: { ...DEFAULT_LAYERS },
      focuses: { ...DEFAULT_FOCUSES },
      zoom: DEFAULT_VIEWPORT.zoom,
      pan: { ...DEFAULT_VIEWPORT.pan },
      lastPreset: null,
      hasHydrated: false,

      setMode: (mode) => set({ mode }),
      setScope: (scope) => set({ scope, selection: DEFAULT_SELECTION }),
      selectNode: (id) =>
        set({ selection: id ? { kind: "node", id } : DEFAULT_SELECTION }),
      selectEdge: (id) =>
        set({ selection: id ? { kind: "edge", id } : DEFAULT_SELECTION }),
      clearSelection: () => set({ selection: DEFAULT_SELECTION }),
      toggleLayer: (id) =>
        set((state) => ({
          layers: { ...state.layers, [id]: !state.layers[id] } as LayerMap,
        })),
      toggleFocus: (id) =>
        set((state) => ({
          focuses: { ...state.focuses, [id]: !state.focuses[id] } as FocusMap,
        })),
      setLayers: (layers) =>
        set((state) => ({
          layers: { ...state.layers, ...layers } as LayerMap,
        })),
      setFocuses: (focuses) =>
        set((state) => ({
          focuses: { ...state.focuses, ...focuses } as FocusMap,
        })),
      setViewport: ({ zoom, pan }) =>
        set((state) => ({
          zoom: zoom !== undefined ? clampZoom(zoom) : state.zoom,
          pan: pan ?? state.pan,
        })),
      setLastPreset: (preset) => set({ lastPreset: preset }),
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() =>
        typeof localStorage === "undefined"
          ? createNoopStorage()
          : localStorage,
      ),
      partialize: (state) => ({
        mode: state.mode,
        scope: state.scope,
        layers: state.layers,
        focuses: state.focuses,
        zoom: state.zoom,
        pan: state.pan,
      }),
      migrate: (persistedState) => sanitizePersistedState(persistedState),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizePersistedState(persistedState),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hasHydrated = true;
      },
    },
  ),
);

export type { CanvasViewState };
