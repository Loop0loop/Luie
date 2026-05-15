/**
 * Canvas Projection — 원본(Canonical)에서 파생된 시각화 데이터. PRD §10.3.
 *
 * Projection은 사용자가 직접 편집하는 데이터가 아니다. 다음 규칙을 지킨다:
 *
 *   1. 항상 재생성 가능. 깨져도 원본은 안전.
 *   2. stale 여부를 표시할 수 있어야 함.
 *   3. 같은 (mode, scope)에는 하나의 projection만.
 *
 * Phase 0~3에서는 main process IPC가 아직 없으므로 worldBuildingStore의
 * graphData를 어댑터로 변환해 만든다. Phase 4에서 IPC `canvas.projection.get`
 * 으로 교체.
 */

import type { CanvasMode, CanvasLayer, CanvasFocus } from "./canvas.types";
import type { CanvasScope } from "./canvasScope.types";

/**
 * Projection 상태 머신. PRD §7.3.
 *
 *   empty   — scope가 비어있거나 매칭되는 chapter가 없음.
 *   loading — 빌드 중. UI는 skeleton/spinner.
 *   ready   — 정상 표시 가능.
 *   error   — 빌드 실패. 원본에는 영향 없음. 재시도 가능.
 *   stale   — 원본이 바뀐 후 아직 재빌드 안 됨. UI는 stale badge.
 */
export type CanvasProjectionStatus =
  | "empty"
  | "loading"
  | "ready"
  | "error"
  | "stale";

/**
 * Canvas에 표시될 노드. mode마다 의미가 다르지만 시각화 계층의 공통
 * 형태로 정규화한다. data는 mode-specific payload를 담는 자유 영역.
 */
export interface CanvasNode<TData = unknown> {
  id: string;
  /** 시각화에서 분류 색상/아이콘을 정하는 카테고리. */
  kind: string;
  /** 카드 제목. */
  title: string;
  /** 부제 (회차/위치/역할 등). */
  subtitle?: string;
  position: { x: number; y: number };
  /** Mode-specific payload. layout/렌더가 함께 본다. */
  data?: TData;
}

export interface CanvasEdge<TData = unknown> {
  id: string;
  source: string;
  target: string;
  /** 관계 라벨. */
  label?: string;
  /** 관계 종류. mode가 색/스타일 매핑에 사용. */
  kind?: string;
  data?: TData;
}

/**
 * Projection의 출력 단위. mode + scope 조합에 1:1로 대응한다.
 *
 * sourceVersion은 원본 변경 감지용. Phase 0에서는 단순히
 * Math.max(chapter.updatedAt) 같은 단조 증가 값을 쓰고, Phase 4에서
 * 원본 revision id로 교체한다.
 */
export interface CanvasProjection {
  status: CanvasProjectionStatus;
  mode: CanvasMode;
  scope: CanvasScope;
  nodes: readonly CanvasNode[];
  edges: readonly CanvasEdge[];
  /** projection이 생성된 시각 (Date.now()). */
  generatedAt: number;
  /** 원본 데이터 버전 식별자. stale 판정에 사용. */
  sourceVersion: string;
  /** error 상태에서만 채워지는 사용자 표시용 메시지. */
  error?: string;
}

/**
 * Projection 빌드 입력값. mode + scope + 활성 layer/focus.
 *
 * activeLayers/focus는 결과 nodes/edges를 필터/디머링할 때 쓰며,
 * cache key에는 포함하지 않는다 (같은 mode+scope면 같은 projection).
 */
export interface CanvasProjectionRequest {
  mode: CanvasMode;
  scope: CanvasScope;
  activeLayers: readonly CanvasLayer[];
  activeFocus: readonly CanvasFocus[];
}
