import type { DocsRightTab, ResearchTab } from "../stores/uiStore";

type SidebarSection = "snapshot" | "trash";

type LayoutModeActionsOptions = {
  isDocsMode: boolean;
  isSidebarOpen: boolean;
  isContextOpen: boolean;
  docsRightTab: DocsRightTab;
  activeChapterId?: string | null;
  openDocsRightTab: (tab: Exclude<DocsRightTab, null>) => void;
  openRightPanelTab?: (tab: Exclude<DocsRightTab, null>) => void;
  closeRightPanel?: () => void;
  toggleLeftSidebar?: () => void;
  setDocsRightTab: (tab: DocsRightTab) => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setContextOpen: (isOpen: boolean) => void;
  addPanel: (content: { type: "editor" | "research" | "export"; id?: string; tab?: ResearchTab }) => void;
  handleSelectResearchItem: (tab: ResearchTab) => void;
  handleOpenExport: () => void;
  onToggleManuscriptLegacy: () => void;
  onOpenSidebarSectionLegacy: (section: SidebarSection) => void;
};

const RESEARCH_TAB_TO_DOCS_TAB: Record<
  ResearchTab,
  "character" | "world" | "event" | "faction" | "scrap" | "analysis"
> = {
  character: "character",
  world: "world",
  event: "event",
  faction: "faction",
  scrap: "scrap",
  analysis: "analysis",
};

export function createLayoutModeActions(options: LayoutModeActionsOptions) {
  const openDocsTab = options.openRightPanelTab ?? options.openDocsRightTab;
  const closeDocsPanel = options.closeRightPanel ?? (() => options.setDocsRightTab(null));
  const toggleSidebar = options.toggleLeftSidebar ?? (() => options.setSidebarOpen(!options.isSidebarOpen));

  return {
    openResearchTab(tab: ResearchTab) {
      if (options.isDocsMode) {
        openDocsTab(RESEARCH_TAB_TO_DOCS_TAB[tab]);
        return;
      }

      options.addPanel({ type: "research", tab });
    },

    openExportPreview() {
      // Keep export preview surface consistent across layouts:
      // always open it in split-panel mode rather than docs-only right tab mode.
      if (options.isDocsMode && options.docsRightTab === "export") {
        options.setDocsRightTab(null);
      }
      options.addPanel({ type: "export" });
    },

    openEditorInSplit() {
      if (!options.activeChapterId) {
        return;
      }

      if (options.isDocsMode) {
        options.addPanel({
          type: "editor",
          id: options.activeChapterId,
        });
        openDocsTab("editor");
        return;
      }

      options.addPanel({ type: "editor", id: options.activeChapterId });
    },

    toggleContextPanel() {
      if (!options.isDocsMode) {
        options.setContextOpen(!options.isContextOpen);
        return;
      }

      if (options.docsRightTab) {
        closeDocsPanel();
        return;
      }

      openDocsTab("character");
    },

    openContextPanel() {
      if (!options.isDocsMode) {
        options.setContextOpen(true);
        return;
      }

      openDocsTab(options.docsRightTab ?? "character");
    },

    closeContextPanel() {
      if (!options.isDocsMode) {
        options.setContextOpen(false);
        return;
      }

      closeDocsPanel();
    },

    toggleManuscriptPanel() {
      if (options.isDocsMode) {
        toggleSidebar();
        return;
      }

      options.onToggleManuscriptLegacy();
    },

    openSidebarSection(section: SidebarSection) {
      if (options.isDocsMode) {
        openDocsTab(section);
        return;
      }

      options.onOpenSidebarSectionLegacy(section);
    },
  };
}
