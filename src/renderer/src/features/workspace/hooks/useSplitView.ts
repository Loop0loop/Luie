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
      const savedResearchPanelSizes =
        uiMode === "default"
          ? projectLayout?.workspace.byLayout.default.researchPanelSizes
          : projectLayout?.workspace.researchPanelSizes;
      const initialSize =
        content.type === "research" && content.tab
          ? currentProjectId
            ? savedResearchPanelSizes?.[content.tab]
            : undefined
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
        const projectLayout = currentProjectId
          ? getProjectLayout(currentProjectId)
          : null;
        const savedSize =
          uiMode === "default"
            ? projectLayout?.workspace.byLayout.default.researchPanelSizes[type]
            : projectLayout?.workspace.researchPanelSizes[type];
        const replaced = {
          ...existingResearch,
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
