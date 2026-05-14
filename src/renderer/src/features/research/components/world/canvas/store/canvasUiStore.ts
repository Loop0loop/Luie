/**
 * Canvas UI 상태 — Scope, Layers, Filters, Selection.
 *
 * 데이터(노드/엣지) 자체는 worldBuildingStore가 소유한다.
 * 이 store는 "지금 캔버스를 어떻게 보고 있는가"만 다룬다.
 *
 * persist는 의도적으로 붙이지 않는다. 캔버스 뷰 상태는
 * 프로젝트 단위가 아니라 세션 단위로 다루는 편이 사용자
 * 멘탈 모델에 맞고, 세션 종료 시 초기화되는 편이 안전하다.
 */

import { create } from "zustand";
import type {
  CanvasLayerId,
  CanvasNodeFilterId,
  CanvasScope,
  CanvasSelection,
} from "../types";

const DEFAULT_LAYERS: Readonly<Record<CanvasLayerId, boolean>> = {
  canonical: true,
  derived: true,
  timeline: true,
  "relation-strength": false,
  conflict: false,
  foreshadowing: false,
};

const DEFAULT_FILTERS: Readonly<Record<CanvasNodeFilterId, boolean>> = {
  episode: true,
  character: true,
  event: true,
  place: true,
  note: true,
  relation: true,
};

const DEFAULT_SCOPE: CanvasScope = { kind: "all" };

const DEFAULT_SELECTION: CanvasSelection = { kind: "none", id: null };

export interface CanvasUiState {
  scope: CanvasScope;
  layers: Record<CanvasLayerId, boolean>;
  filters: Record<CanvasNodeFilterId, boolean>;
  selection: CanvasSelection;
  showTimelineStrip: boolean;
  showMiniMap: boolean;

  setScope: (scope: CanvasScope) => void;
  toggleLayer: (id: CanvasLayerId) => void;
  toggleFilter: (id: CanvasNodeFilterId) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  clearSelection: () => void;
  setShowTimelineStrip: (visible: boolean) => void;
  setShowMiniMap: (visible: boolean) => void;
}

export const useCanvasUiStore = create<CanvasUiState>((set) => ({
  scope: DEFAULT_SCOPE,
  layers: { ...DEFAULT_LAYERS },
  filters: { ...DEFAULT_FILTERS },
  selection: DEFAULT_SELECTION,
  showTimelineStrip: false,
  showMiniMap: false,

  setScope: (scope) => set({ scope }),

  toggleLayer: (id) =>
    set((state) => ({
      layers: { ...state.layers, [id]: !state.layers[id] },
    })),

  toggleFilter: (id) =>
    set((state) => ({
      filters: { ...state.filters, [id]: !state.filters[id] },
    })),

  selectNode: (id) =>
    set({ selection: id ? { kind: "node", id } : DEFAULT_SELECTION }),

  selectEdge: (id) =>
    set({ selection: id ? { kind: "edge", id } : DEFAULT_SELECTION }),

  clearSelection: () => set({ selection: DEFAULT_SELECTION }),

  setShowTimelineStrip: (visible) => set({ showTimelineStrip: visible }),

  setShowMiniMap: (visible) => set({ showMiniMap: visible }),
}));
