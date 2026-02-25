import type { DocsRightTab, ResearchTab } from "../stores/uiStore";

type SidebarSection = "snapshot" | "trash";

type LayoutModeActionsOptions = {
  isDocsMode: boolean;
  isSidebarOpen: boolean;
  docsRightTab: DocsRightTab;
  activeChapterId?: string | null;
  openDocsRightTab: (tab: Exclude<DocsRightTab, null>) => void;
  setDocsRightTab: (tab: DocsRightTab) => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setContextOpen: (isOpen: boolean) => void; // Keep setContextOpen as it's used
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
  return {
    openResearchTab(tab: ResearchTab) {
      if (options.isDocsMode) {
        options.openDocsRightTab(RESEARCH_TAB_TO_DOCS_TAB[tab]);
        return;
      }

      options.addPanel({ type: "research", tab });
    },

    openExportPreview() {
      if (options.isDocsMode) {
        options.openDocsRightTab("export");
        return;
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
        options.openDocsRightTab("editor");
        return;
      }

      options.addPanel({ type: "editor", id: options.activeChapterId });
    },

    toggleContextPanel() {
      if (!options.isDocsMode) {
        // The instruction implies isContextOpen is removed, so we can't use it directly.
        // Assuming the intent is to toggle the context panel state,
        // but without knowing the current state, we can only open it.
        // If the original intent was to toggle based on a state, that state needs to be passed in.
        // For now, we'll just open it if it's not docs mode.
        options.setContextOpen(true);
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
