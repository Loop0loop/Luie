import { useUIStore, type DocsRightTab } from "../stores/uiStore";

export function ensureDocsPanelVisible(): void {
  const uiStore = useUIStore.getState();
  uiStore.setBinderBarOpen(true);
  uiStore.setRegionOpen("rightRail", true);
}

export function openDocsRightTab(tab: Exclude<DocsRightTab, null>): void {
  const uiStore = useUIStore.getState();
  uiStore.openRightPanelTab(tab);
  ensureDocsPanelVisible();
}
