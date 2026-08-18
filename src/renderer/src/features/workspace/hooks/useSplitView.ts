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


export function useSplitView() {
  const panels = useUIStore((state) => state.panels);
  const addPanelBase = useUIStore((state) => state.addPanel);
  const removePanel = useUIStore((state) => state.removePanel);
  const setPanels = useUIStore((state) => state.setPanels);
  const currentProjectId = useProjectStore((state) => state.currentItem?.id);
  const getProjectLayout = useProjectLayoutStore((state) => state.getProjectLayout);

  const addPanel = useCallback(
    (content: RightPanelContent, insertAt?: number) => {
      const projectLayout = currentProjectId
        ? getProjectLayout(currentProjectId)
        : null;
      const savedResearchPanelSizes = projectLayout?.workspace.researchPanelSizes;
      const initialSize =
        content.type === "research" && content.tab
          ? (currentProjectId
              ? savedResearchPanelSizes?.[content.tab]
              : undefined)
          : content.type === "snapshot"
            ? getLayoutSurfaceDefaultRatio(getEditorLayoutPanelSurface("snapshot"))
            : undefined;
      addPanelBase(content, insertAt, initialSize);
    },
    [addPanelBase, currentProjectId, getProjectLayout],
  );

  const handleSelectResearchItem = useCallback(
    (type: ResearchTab) => {
      const existingResearch = panels.find((p) => p.content.type === "research");

      if (!existingResearch) {
        addPanel({ type: "research", tab: type });
      } else if (existingResearch.content.tab !== type) {
        // NOTE: research panel은 하나만 유지하고 선택 tab만 교체한다.
        const replaced = { ...existingResearch, content: { type: "research" as const, tab: type } };
        const next = panels.filter((p) => p.content.type !== "research").concat(replaced);
        const sizePerPanel = 100 / next.length;
        setPanels(next.map((p) => ({ ...p, size: sizePerPanel })));
      }

    },
    [addPanel, panels, setPanels],
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
