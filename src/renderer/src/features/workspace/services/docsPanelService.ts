import { useUIStore, type DocsRightTab } from "../stores/uiStore";

export function ensureDocsPanelVisible(): void {
  const uiStore = useUIStore.getState();
  uiStore.setBinderBarOpen(true);
  uiStore.setContextOpen(true);
}

export function openDocsRightTab(tab: Exclude<DocsRightTab, null>): void {
  const uiStore = useUIStore.getState();
  uiStore.setDocsRightTab(tab);
  ensureDocsPanelVisible();
}
