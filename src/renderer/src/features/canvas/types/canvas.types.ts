/**
 * 캔버스 feature 도메인 타입.
 *
 * Canvas는 본문을 직접 편집하지 않는다. 원본 데이터(Project / Chapter /
 * ChapterBody / Revision)를 읽어 만든 파생 시각화 레이어이며, 사용자는
 * "어디를(scope) 어떤 방식으로(mode) 볼지"를 선택해 결과를 탐색한다.
 *
 * PRD §13 — Canvas Mode.
 *   초기 릴리즈는 P0 두 개(flow-map, scene-board)만 활성. 나머지는
 *   IconBar에 노출하되 비활성 상태로 둔다.
 */

export type CanvasMode =
  | "flow-map"
  | "scene-board"
  | "timeline"
  | "character-map"
  | "memory-map";

/**
 * Mode가 현재 릴리즈에서 사용 가능한지 여부.
 *
 * UI 비활성 처리에 쓰며, 확장은 단순히 모드를 enabled로 바꾸기만 하면
 * 된다. PRD §14.1 MVP 범위에 따라 두 개만 enabled로 둔다.
 */
export const CANVAS_MODE_ENABLED: Readonly<Record<CanvasMode, boolean>> = {
  "flow-map": true,
  "scene-board": true,
  timeline: false,
  "character-map": false,
  "memory-map": false,
};

/**
 * 캔버스 시각 레이어. Layer toggle UI에서 직접 사용한다. PRD §6.3.
 *
 * - scene/character/event: Mode 종류와 무관하게 가장 자주 쓰는 레이어.
 * - memo: 메모/주석 노드 표시 여부.
 * - ai-hint: AI 추정 노드/관계. 셸 단계에서는 비활성 디폴트.
 */
export type CanvasLayer = "scene" | "character" | "event" | "memo" | "ai-hint";

/**
 * Focus filter — Mode와 별개로 "어떤 종류만 볼지" 강조하는 필터. PRD §6.3.
 *
 * Focus와 Layer를 분리하는 이유: Layer는 노드 렌더 자체를 끄지만, Focus는
 * 시각적으로 강조/디머만 한다. 두 개념을 한 토글에 합치면 의도가 모호해진다.
 */
export type CanvasFocus =
  | "character"
  | "event"
  | "location"
  | "foreshadow"
  | "conflict";

/**
 * View Preset — 자주 쓰는 Scope/Layer/Filter 조합 단축키. PRD §6.3.
 *
 * Preset 적용은 결과적으로 store의 다른 필드를 한 번에 갱신하는 명령이며
 * Preset 자체가 영구 상태로 남지는 않는다. 셸 단계에서는 키만 노출.
 */
export type CanvasViewPreset =
  | "current-chapter"
  | "arc-view"
  | "conflict-view"
  | "foreshadow-view";

/**
 * 캔버스에서 선택된 대상의 종류. PRD §7.6.
 */
export type CanvasSelectionKind = "node" | "edge" | "none";

export interface CanvasSelection {
  kind: CanvasSelectionKind;
  /** 선택된 노드/엣지의 id. kind === "none"이면 null. */
  id: string | null;
}
