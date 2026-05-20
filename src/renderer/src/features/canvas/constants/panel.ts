/**
 * panel.ts — 사이드바 패널 및 아이콘 레일 구성 데이터.
 *
 * SidePanelRouter, CanvasIconRail에서 사용합니다.
 */

import type { CanvasActivityPanel } from "../types/canvas.types";
import type { CanvasRailIconName } from "../types/canvasPanel.types";

// ─── SidePanelRouter ──────────────────────────────────────────────────────────

export const CANVAS_PANEL_KEYS: ReadonlyArray<CanvasActivityPanel> = [
  "explorer",
  "graph",
  "canvas",
  "memory",
  "search",
] as const;

// ─── CanvasIconRail ───────────────────────────────────────────────────────────

export interface CanvasRailItem {
  readonly panel: CanvasActivityPanel;
  /** `canvas.activity.${i18nKey}` 형태로 사용 */
  readonly i18nKey: string;
  readonly iconName: CanvasRailIconName;
}

export const CANVAS_RAIL_ITEMS: ReadonlyArray<CanvasRailItem> = [
  { panel: "explorer",  i18nKey: "explorer",  iconName: "Compass"    },
  { panel: "graph",     i18nKey: "graph",     iconName: "Waypoints"  },
  { panel: "canvas",    i18nKey: "canvas",    iconName: "LayoutGrid" },
  { panel: "memory",    i18nKey: "memory",    iconName: "Brain"      },
  { panel: "search",    i18nKey: "search",    iconName: "Search"     },
] as const;

// ─── Constants for Activity Panels ──────────────────────────────────────────

export const GRAPH_RELATIONSHIP_FILTERS = ["등장", "대화", "갈등", "소속", "동맹", "떡밥"] as const;

export interface MockMemoryInsight {
  readonly title: string;
  readonly content: string;
}

export interface MockMemoryConflict {
  readonly title: string;
  readonly content: string;
  readonly highlight1: string;
  readonly highlight2: string;
  readonly kind: "rose" | "amber";
}

export interface MockMemoryUnlinked {
  readonly label: string;
  readonly description: string;
}

export const MOCK_MEMORY_INSIGHTS: ReadonlyArray<MockMemoryInsight> = [
  {
    title: "3챕터: 틈새의 비밀",
    content: "리안이 지하실에서 발견한 오래된 문양을 통해 잃어버린 가문의 문장과의 연관성을 독백으로 추적함. 마커스의 등장으로 대화가 중단됨.",
  },
  {
    title: "2챕터: 어둠 속의 의뢰인",
    content: "바에서 붉은 코트를 입은 낯선 이와 비밀 대화를 나눈 마커스의 행적이 드러남. 두 인물 간 동맹과 떡밥 요소 동시 성립.",
  },
] as const;

export const MOCK_MEMORY_CONFLICTS: ReadonlyArray<MockMemoryConflict> = [
  {
    title: "인물 나이 묘사 모순",
    content: "1챕터에서 17세로 서술되었으나, 3챕터의 마커스와의 대화 중 19세로 언급되었습니다.",
    highlight1: "17세",
    highlight2: "19세",
    kind: "rose",
  },
  {
    title: "소지품 위치 모순",
    content: "2챕터에서 잃어버린 은장도가 3챕터 격투 씬에서 다시 외투 속에 소지된 것으로 묘사되었습니다.",
    highlight1: "잃어버린 은장도",
    highlight2: "다시 외투 속에 소지된 것",
    kind: "amber",
  },
] as const;

export const MOCK_MEMORY_UNLINKED: ReadonlyArray<MockMemoryUnlinked> = [
  {
    label: "@에밀리아",
    description: "3챕터 내 6회 등장 (등록되지 않은 인물)",
  },
  {
    label: "#아르카디아 성채",
    description: "2챕터 내 3회 등장 (등록되지 않은 용어)",
  },
] as const;

export interface MockRecentSearch {
  readonly query: string;
  readonly timestampKey: string;
  readonly timestampValue?: number;
}

export interface SearchTipItem {
  readonly keywordKey: string;
  readonly descriptionKey: string;
}

export const MOCK_RECENT_SEARCH: ReadonlyArray<MockRecentSearch> = [
  { query: "리안의 눈물", timestampKey: "canvas.search.recent.justNow" },
  { query: "붉은 코트", timestampKey: "canvas.search.recent.hoursAgo", timestampValue: 3 },
] as const;

export const MOCK_SEARCH_TIPS: ReadonlyArray<SearchTipItem> = [
  {
    keywordKey: "canvas.search.tips.tip1.keyword",
    descriptionKey: "canvas.search.tips.tip1.description",
  },
  {
    keywordKey: "canvas.search.tips.tip2.keyword",
    descriptionKey: "canvas.search.tips.tip2.description",
  },
  {
    keywordKey: "canvas.search.tips.tip3.keyword",
    descriptionKey: "canvas.search.tips.tip3.description",
  },
] as const;
