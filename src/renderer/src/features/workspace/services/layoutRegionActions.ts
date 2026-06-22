import {
  useUIStore,
  type DocsRightTab,
  type RightPanelTab,
} from "../stores/uiStore";

type NonNullDocsRightTab = Exclude<DocsRightTab, null>;

export function setDocsSidebarOpen(open: boolean): void {
  useUIStore.getState().setRegionOpen("leftSidebar", open);
}

export function setDocsBinderRailOpen(open: boolean): void {
  useUIStore.getState().setRegionOpen("rightRail", open);
}

export function openDocsBinderTab(tab: NonNullDocsRightTab): void {
  const uiStore = useUIStore.getState();
  uiStore.setRegionOpen("rightRail", true);
  uiStore.openRightPanelTab(tab);
}

export function closeDocsBinderPanel(): void {
  useUIStore.getState().closeRightPanel();
}

export function setEditorBinderRailOpen(open: boolean): void {
  useUIStore.getState().setRegionOpen("rightRail", open);
}

export function openEditorBinderTab(tab: RightPanelTab): void {
  const uiStore = useUIStore.getState();
  uiStore.setRegionOpen("rightRail", true);
  uiStore.openRightPanelTab(tab);
}
