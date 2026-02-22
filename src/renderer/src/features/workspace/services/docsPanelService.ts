import { useUIStore, type DocsRightTab } from "../stores/uiStore";

const DOCS_PANEL_COLLAPSED_WIDTH = 50;
const DOCS_PANEL_DEFAULT_WIDTH = 320;

export function ensureDocsPanelVisible(): void {
  const uiStore = useUIStore.getState();
  uiStore.setBinderBarOpen(true);

  if (uiStore.contextWidth < DOCS_PANEL_COLLAPSED_WIDTH) {
    uiStore.setContextWidth(DOCS_PANEL_DEFAULT_WIDTH);
  }
}

export function openDocsRightTab(tab: Exclude<DocsRightTab, null>): void {
  const uiStore = useUIStore.getState();
  uiStore.setDocsRightTab(tab);
  ensureDocsPanelVisible();
}
