import type { DocsRightTab, ResearchTab, ResizablePanelData } from "../stores/uiStore";
import type { DocsLayoutPanelTab } from "@renderer/shared/constants/layoutSizing";

type SidebarSection = "snapshot" | "trash";

type LayoutModeActionsOptions = {
  isDocsMode: boolean;
  isContextOpen: boolean;
  docsRightTab: DocsRightTab;
  activeChapterId?: string | null;
  openDocsRightTab: (tab: Exclude<DocsRightTab, null>) => void;
  closeRightPanel: () => void;
  toggleLeftSidebar: () => void;
  setContextOpen: (isOpen: boolean) => void;
  addPanel: (content: {
    type: "editor" | "research" | "export";
    id?: string;
    tab?: ResearchTab;
  }) => void;
  /** 비-docs 모드에서 열린 split panel 목록. 토글 판정에 쓴다. */
  panels: ResizablePanelData[];
  removePanel: (id: string) => void;
  handleSelectResearchItem: (tab: ResearchTab) => void;
  handleOpenExport: () => void;
  onToggleManuscriptLegacy: () => void;
  onOpenSidebarSectionLegacy: (section: SidebarSection) => void;
  onToggleSidebarSectionLegacy: (section: SidebarSection) => void;
};

const RESEARCH_TAB_TO_DOCS_TAB: Record<ResearchTab, DocsLayoutPanelTab> = {
  character: "character",
  world: "world",
  event: "event",
  faction: "faction",
  scrap: "scrap",
  analysis: "analysis",
  plotboard: "plotboard",
  untitled: "untitled",
};

export function createLayoutModeActions(options: LayoutModeActionsOptions) {
  const openDocsTab = options.openDocsRightTab;
  const closeDocsPanel = options.closeRightPanel;
  const toggleSidebar = options.toggleLeftSidebar;

  return {
    openResearchTab(tab: ResearchTab) {
      if (options.isDocsMode) {
        openDocsTab(RESEARCH_TAB_TO_DOCS_TAB[tab]);
        return;
      }

      options.addPanel({ type: "research", tab });
    },

    /**
     * 같은 탭이 이미 열려 있으면 닫는다.
     *
     * WHY `openResearchTab`을 남겨두는가: `world.tab.graph`처럼 '열고 나서 하위 탭을
     * 바꾸는' 흐름은 토글이면 방금 연 패널을 닫아버린다. 열기 의도와 토글 의도를
     * 분리해 둔다.
     *
     * 선례: `toggleContextPanel`이 `docsRightTab`을 보고 닫기/열기를 가른다.
     */
    toggleResearchTab(tab: ResearchTab) {
      if (options.isDocsMode) {
        if (options.docsRightTab === RESEARCH_TAB_TO_DOCS_TAB[tab]) {
          closeDocsPanel();
          return;
        }
        openDocsTab(RESEARCH_TAB_TO_DOCS_TAB[tab]);
        return;
      }

      const openPanel = options.panels.find(
        (panel) => panel.content.type === "research" && panel.content.tab === tab,
      );
      if (openPanel) {
        options.removePanel(openPanel.id);
        return;
      }

      options.addPanel({ type: "research", tab });
    },

    openExportPreview() {
      // NOTE: layout에 따라 preview surface가 달라지지 않도록 항상 split panel로 연다.
      if (options.isDocsMode && options.docsRightTab === "export") {
        closeDocsPanel();
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

    /**
     * 같은 섹션이 이미 열려 있으면 닫는다.
     *
     * 레거시(비-docs) 경로는 `useSidebarLogic`이 이미 `sidebar.section.toggle` 커맨드를
     * 지원하므로 그것을 그대로 쓴다.
     */
    toggleSidebarSection(section: SidebarSection) {
      if (options.isDocsMode) {
        if (options.docsRightTab === section) {
          closeDocsPanel();
          return;
        }
        openDocsTab(section);
        return;
      }

      options.onToggleSidebarSectionLegacy(section);
    },
  };
}
