import type { DocsRightTab } from "../stores/uiStore";
import { useUIStore } from "../stores/uiStore";

export function openDocsRightTab(tab: Exclude<DocsRightTab, null>): void {
  useUIStore.getState().openRightPanelTab(tab);
}
