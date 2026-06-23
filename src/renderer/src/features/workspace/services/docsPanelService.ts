import type { DocsRightTab } from "../stores/uiStore";
import {
  openDocsBinderTab,
  setDocsBinderRailOpen,
} from "./layoutRegionActions";

export function ensureDocsPanelVisible(): void {
  setDocsBinderRailOpen(true);
}

export function openDocsRightTab(tab: Exclude<DocsRightTab, null>): void {
  openDocsBinderTab(tab);
}
