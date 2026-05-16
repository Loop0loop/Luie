/**
 * Canvas-feature surface sizing.
 *
 * 외부 `@shared/constants/{layoutSizing,sidebarSizing}.ts` 패턴을 그대로
 * 인용하되, 캔버스 feature 안에 격리해 둔다. 캔버스는 외부 사이즈
 * registry에 자기 키를 끼워넣지 않고, 자체 surface 두 개(activity / binder)를
 * 자기 안에서만 관리한다.
 *
 * 두 layer:
 *
 *   1) `CanvasSurfaceId` — 사용자가 드래그로 조절 가능한 가변 폭 surface.
 *      `useCanvasSurfaceResizeCommit`이 이 키를 받아 debounce commit한다.
 *
 *   2) `CANVAS_LAYOUT_PX` — 사용자가 절대 바꾸지 않는 컴포넌트 고정 px.
 *      IconBar 폭, status bar 높이 등.
 */

export type CanvasSurfaceId = "canvas.activity" | "canvas.binder";

export interface CanvasSurfaceConfig {
  minPx: number;
  maxPx: number;
  defaultPx: number;
}

/**
 * ActivityBar — IconBar 옆의 Mode 컨트롤러 패널.
 * 컨트롤이 적은 편이라 240 안팎이 합리적.
 */
const ACTIVITY_CONFIG: CanvasSurfaceConfig = {
  minPx: 200,
  maxPx: 320,
  defaultPx: 248,
};

/**
 * Binder — Project Tree + Scope + Selection Detail.
 * Selection Detail이 들어와도 답답하지 않을 정도로만, 사이드바보다 살짝
 * 좁거나 비슷하게 유지해 화면 무게 중심을 stage로 둔다.
 */
const BINDER_CONFIG: CanvasSurfaceConfig = {
  minPx: 240,
  maxPx: 380,
  defaultPx: 280,
};

export const CANVAS_SURFACE_CONFIG: Record<
  CanvasSurfaceId,
  CanvasSurfaceConfig
> = {
  "canvas.activity": ACTIVITY_CONFIG,
  "canvas.binder": BINDER_CONFIG,
};

const clampNumber = (value: number, min: number, max: number): number =>
  Math.round(Math.min(max, Math.max(min, value)));

export const isCanvasSurfaceId = (value: string): value is CanvasSurfaceId =>
  Object.prototype.hasOwnProperty.call(CANVAS_SURFACE_CONFIG, value);

export const getCanvasSurfaceConfig = (
  surface: CanvasSurfaceId,
): CanvasSurfaceConfig => CANVAS_SURFACE_CONFIG[surface];

export const getCanvasSurfaceDefaultWidth = (
  surface: CanvasSurfaceId,
): number => CANVAS_SURFACE_CONFIG[surface].defaultPx;

export const clampCanvasSurfaceWidth = (
  surface: CanvasSurfaceId,
  widthPx: number,
): number => {
  const config = CANVAS_SURFACE_CONFIG[surface];
  return clampNumber(widthPx, config.minPx, config.maxPx);
};

/**
 * 컴포넌트 고정 px. 사용자가 드래그하지 않는 영역.
 *
 * - ICON_BAR: VS Code Activity Bar와 같은 44px. 절대 줄이지 않음.
 * - STATUS_BAR / TOOLBAR: Stage 안 헤더 띠 높이.
 */
export const CANVAS_LAYOUT_PX = {
  ICON_BAR: 44,
  STATUS_BAR: 28,
  TOOLBAR: 36,
} as const;

/** PanelGroup의 stage(가변) 최소 비율(%). resize 시 stage 보호. */
export const CANVAS_FLEX_MIN_PERCENT = 25;

/**
 * 외부 sidebarSizing.ts의 `toPxSize` 패턴 인용. react-resizable-panels의
 * `defaultSize/minSize/maxSize`에 px 문자열을 그대로 넣을 때 사용.
 */
export const toPxSize = (value: number): string =>
  `${Math.max(0, Math.round(value))}px`;
