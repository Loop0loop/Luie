/**
 * react-flow Node에 실어 보낼 캔버스 노드 데이터.
 *
 * worldBuildingStore의 WorldGraphNode가 캔버스에서 어떻게 보일지를
 * 결정하는 데 필요한 정보만 담는다. 원본 도메인 객체는 store에 그대로 있고
 * id로 다시 lookup 가능하므로 여기는 표현 계층 데이터로 한정.
 */

import type { CanvasNodeKind, CanvasNodeOrigin } from "../../types";

export interface CanvasNodeData {
  kind: CanvasNodeKind;
  /** Canonical(확정) / Derived(자동 추출) */
  origin: CanvasNodeOrigin;
  /** 카드 제목 */
  title: string;
  /** 카드 부제 (역할, 위치, 등장 회차 등) */
  subtitle?: string;
  /** 본문 한 줄 요약 (note 카드용) */
  excerpt?: string;
}

/** 노드 타입 키 — react-flow nodeTypes 매핑에 사용 */
export const CANVAS_NODE_TYPE: Record<CanvasNodeKind, string> = {
  episode: "canvas-episode",
  character: "canvas-character",
  event: "canvas-event",
  place: "canvas-place",
  note: "canvas-note",
};
