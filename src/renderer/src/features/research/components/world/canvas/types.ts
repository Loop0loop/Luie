/**
 * Canvas 도메인 타입
 *
 * 캔버스는 작품의 구조(인물/사건/장소/회차/메모)를 노드와 관계로 표현하는
 * Obsidian 풍 워크스페이스. 본 파일은 캔버스가 자체적으로 다루는 UI/도메인
 * 타입만 정의한다. 데이터 자체는 worldBuildingStore / memoStore가 소유한다.
 */

import type { WorldEntitySourceType } from "@shared/types";

/** 캔버스 노드 종류 */
export type CanvasNodeKind =
  | "episode"
  | "character"
  | "event"
  | "place"
  | "note";

/** 노드의 출처 — Canonical은 확정, Derived는 자동 추출 후보 */
export type CanvasNodeOrigin = "canonical" | "derived";

/** 캔버스에서 토글할 수 있는 시각 레이어 */
export type CanvasLayerId =
  | "canonical"
  | "derived"
  | "timeline"
  | "relation-strength"
  | "conflict"
  | "foreshadowing";

/** 노드 종류 필터 */
export type CanvasNodeFilterId = CanvasNodeKind | "relation";

/** Scope: 캔버스가 어느 범위를 보여주는지 */
export type CanvasScopeKind = "current-episode" | "episode-range" | "all";

export interface CanvasScope {
  kind: CanvasScopeKind;
  /** episode-range일 때 시작/끝 화 번호 */
  fromEpisode?: number;
  toEpisode?: number;
  /** current-episode일 때 기준 화 번호 */
  episode?: number;
}

/** BinderBar가 보여주는 선택 대상 */
export type CanvasSelectionKind = "node" | "edge" | "none";

export interface CanvasSelection {
  kind: CanvasSelectionKind;
  /** 노드/엣지 ID. kind === "none"이면 null */
  id: string | null;
}

/** worldBuildingStore의 entity type을 캔버스 노드 종류로 매핑 */
export const ENTITY_TYPE_TO_CANVAS_KIND: Record<
  WorldEntitySourceType,
  CanvasNodeKind
> = {
  Character: "character",
  Faction: "character",
  Event: "event",
  Place: "place",
  Concept: "place",
  Rule: "place",
  Item: "place",
  Term: "place",
  WorldEntity: "place",
};
