/**
 * panel.ts — 사이드바 패널 및 아이콘 레일 구성 데이터.
 *
 * SidePanelRouter, CanvasIconRail에서 사용합니다.
 */

import type { CanvasActivityPanel } from "../types/canvas.types";

// ─── SidePanelRouter ──────────────────────────────────────────────────────────

export const CANVAS_PANEL_KEYS: ReadonlyArray<CanvasActivityPanel> = [
  "explorer",
  "canvas",
  "entities",
  "memory",
  "search",
] as const;

// ─── CanvasIconRail ───────────────────────────────────────────────────────────

export interface CanvasRailItem {
  readonly panel: CanvasActivityPanel;
  /** `canvas.activity.${i18nKey}` 형태로 사용 */
  readonly i18nKey: string;
  readonly iconName: "Compass" | "LayoutGrid" | "Users" | "Brain" | "Search";
}

export const CANVAS_RAIL_ITEMS: ReadonlyArray<CanvasRailItem> = [
  { panel: "explorer",  i18nKey: "explorer",  iconName: "Compass"    },
  { panel: "canvas",    i18nKey: "canvas",    iconName: "LayoutGrid" },
  { panel: "entities",  i18nKey: "entities",  iconName: "Users"      },
  { panel: "memory",    i18nKey: "memory",    iconName: "Brain"      },
  { panel: "search",    i18nKey: "search",    iconName: "Search"     },
] as const;
