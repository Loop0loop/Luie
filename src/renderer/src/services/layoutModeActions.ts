import type { DocsRightTab, ResearchTab } from "../stores/uiStore";

type SplitSide = "left" | "right";
type SidebarSection = "snapshot" | "trash";

type LayoutModeActionsOptions = {
  isDocsMode: boolean;
  isContextOpen: boolean;
  isSidebarOpen: boolean;
  docsRightTab: DocsRightTab;
  activeChapterId?: string | null;
  openDocsRightTab: (tab: Exclude<DocsRightTab, null>) => void;
  setDocsRightTab: (tab: DocsRightTab) => void;
  setContextOpen: (isOpen: boolean) => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setSplitSide: (side: SplitSide) => void;
  setRightPanelContent: (content: { type: "editor"; id: string }) => void;
  handleSelectResearchItem: (tab: ResearchTab) => void;
  handleOpenExport: () => void;
  handleSplitView: (type: "vertical" | "horizontal", contentId: string) => void;
  onToggleManuscriptLegacy: () => void;
  onOpenSidebarSectionLegacy: (section: SidebarSection) => void;
};

const RESEARCH_TAB_TO_DOCS_TAB: Record<
  ResearchTab,
  "character" | "world" | "scrap" | "analysis"
> = {
  character: "character",
  world: "world",
  scrap: "scrap",
  analysis: "analysis",
};

export function createLayoutModeActions(options: LayoutModeActionsOptions) {
  return {
    openResearchTab(tab: ResearchTab, side: SplitSide) {
      if (options.isDocsMode) {
        options.openDocsRightTab(RESEARCH_TAB_TO_DOCS_TAB[tab]);
        return;
      }

      options.setSplitSide(side);
      options.handleSelectResearchItem(tab);
    },

    openExportPreview(side: SplitSide) {
      if (options.isDocsMode) {
        options.openDocsRightTab("export");
        return;
      }

      options.setSplitSide(side);
      options.handleOpenExport();
    },

    openEditorInSplit(side: SplitSide) {
      if (!options.activeChapterId) {
        return;
      }

      if (options.isDocsMode) {
        options.setRightPanelContent({
          type: "editor",
          id: options.activeChapterId,
        });
        options.openDocsRightTab("editor");
        return;
      }

      options.setSplitSide(side);
      options.handleSplitView("vertical", options.activeChapterId);
    },

    toggleContextPanel() {
      if (!options.isDocsMode) {
        options.setContextOpen(!options.isContextOpen);
        return;
      }

      if (options.docsRightTab) {
        options.setDocsRightTab(null);
        return;
      }

      options.openDocsRightTab("character");
    },

    openContextPanel() {
      if (!options.isDocsMode) {
        options.setContextOpen(true);
        return;
      }

      options.openDocsRightTab(options.docsRightTab ?? "character");
    },

    closeContextPanel() {
      if (!options.isDocsMode) {
        options.setContextOpen(false);
        return;
      }

      options.setDocsRightTab(null);
    },

    toggleManuscriptPanel() {
      if (options.isDocsMode) {
        options.setSidebarOpen(!options.isSidebarOpen);
        return;
      }

      options.onToggleManuscriptLegacy();
    },

    openSidebarSection(section: SidebarSection) {
      if (options.isDocsMode) {
        options.openDocsRightTab(section);
        return;
      }

      options.onOpenSidebarSectionLegacy(section);
    },
  };
}
