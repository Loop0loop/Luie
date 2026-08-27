import { useCallback } from "react";
import {
  useUIStore,
  type ResearchTab,
  type RightPanelContent,
} from "@renderer/features/workspace/stores/uiStore";
import { useProjectStore } from "@renderer/domains/project";
import { useProjectLayoutStore } from "@renderer/features/workspace/stores/projectLayoutStore";
import type { Snapshot } from "@shared/types";
import {
  getEditorLayoutPanelSurface,
  getLayoutSurfaceDefaultRatio,
} from "@renderer/shared/constants/layoutSizing";
import { useEditorStore } from "@renderer/domains/editor";
import { buildStablePanelId } from "@renderer/features/workspace/stores/uiStore.state";
import { DEFAULT_RESEARCH_PANEL_SIZE } from "@renderer/features/workspace/stores/projectLayout/constants";

export function useSplitView(activeChapterId?: string) {
  const panels = useUIStore((state) => state.panels);
  const addPanelBase = useUIStore((state) => state.addPanel);
  const removePanel = useUIStore((state) => state.removePanel);
  const setPanels = useUIStore((state) => state.setPanels);
  const currentProjectId = useProjectStore((state) => state.currentItem?.id);
  const getProjectLayout = useProjectLayoutStore(
    (state) => state.getProjectLayout,
  );
  const uiMode = useEditorStore((state) => state.uiMode);

  const addPanel = useCallback(
    (content: RightPanelContent, insertAt?: number) => {
      if (content.type === "editor" && content.id === activeChapterId) {
        return;
      }
      const projectLayout = currentProjectId
        ? getProjectLayout(currentProjectId)
        : null;
      // default 레이아웃은 research 탭이 패널 하나를 공유하므로 폭도 하나만 읽는다.
      const savedResearchSize =
        uiMode === "default"
          ? projectLayout?.workspace.byLayout.default.researchPanelSize
          : content.type === "research" && content.tab
            ? projectLayout?.workspace.researchPanelSizes[content.tab]
            : undefined;
      const initialSize =
        content.type === "research" && content.tab
          ? (savedResearchSize ?? DEFAULT_RESEARCH_PANEL_SIZE)
          : content.type === "snapshot"
            ? getLayoutSurfaceDefaultRatio(
                getEditorLayoutPanelSurface("snapshot"),
              )
            : undefined;
      addPanelBase(content, insertAt, initialSize);
    },
    [activeChapterId, addPanelBase, currentProjectId, getProjectLayout, uiMode],
  );

  const handleSelectResearchItem = useCallback(
    (type: ResearchTab) => {
      const existingResearch = panels.find(
        (p) => p.content.type === "research",
      );

      if (!existingResearch) {
        addPanel({ type: "research", tab: type });
      } else if (existingResearch.content.tab !== type) {
        // NOTE: research panel은 하나만 유지하고 DnD 원고와 함께 열지 않는다.
        // default 레이아웃은 탭을 바꿔도 같은 패널이므로 폭을 그대로 유지한다.
        const projectLayout = currentProjectId
          ? getProjectLayout(currentProjectId)
          : null;
        const savedSize =
          uiMode === "default"
            ? existingResearch.size
            : projectLayout?.workspace.researchPanelSizes[type];
        const replaced = {
          ...existingResearch,
          // 이전 버전이 저장한 tab별 id(`research-character` 등)를 공용 id로 정규화한다.
          id: buildStablePanelId({ type: "research", tab: type }),
          content: { type: "research" as const, tab: type },
          size: savedSize ?? existingResearch.size,
        };
        const next = panels
          .filter(
            (panel) =>
              panel.content.type !== "research" &&
              panel.content.type !== "editor",
          )
          .concat(replaced);
        setPanels(next);
      }
    },
    [addPanel, currentProjectId, getProjectLayout, panels, setPanels, uiMode],
  );

  const handleSplitView = useCallback(
    (_type: "vertical" | "horizontal", _contentId: string) => {
      addPanel({ type: "editor", id: _contentId });
    },
    [addPanel],
  );

  const handleOpenSnapshot = useCallback(
    (snapshot: Snapshot) => {
      addPanel({ type: "snapshot", snapshot });
    },
    [addPanel],
  );

  const handleOpenExport = useCallback(() => {
    addPanel({ type: "export" });
  }, [addPanel]);

  return {
    panels,
    addPanel,
    removePanel,
    handleSelectResearchItem,
    handleSplitView,
    handleOpenSnapshot,
    handleOpenExport,
  };
}
