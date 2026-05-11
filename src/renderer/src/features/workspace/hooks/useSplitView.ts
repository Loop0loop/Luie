/**
 * 분할 뷰 관리
 */

import { useCallback } from "react";
import {
  useUIStore,
  type ContextTab,
  type ResearchTab,
  type RightPanelContent,
} from "@renderer/features/workspace/stores/uiStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useProjectLayoutStore } from "@renderer/features/workspace/stores/projectLayoutStore";
import type { Snapshot } from "@shared/types";


export function useSplitView() {
  const panels = useUIStore((state) => state.panels);
  const contextTab = useUIStore((state) => state.contextTab);
  const addPanelBase = useUIStore((state) => state.addPanel);
  const removePanel = useUIStore((state) => state.removePanel);
  const setPanels = useUIStore((state) => state.setPanels);
  const setContextTab = useUIStore((state) => state.setContextTab);
  const currentProjectId = useProjectStore((state) => state.currentItem?.id);
  const getProjectLayout = useProjectLayoutStore((state) => state.getProjectLayout);

  const addPanel = useCallback(
    (content: RightPanelContent, insertAt?: number) => {
      const initialSize =
        content.type === "research" && content.tab && currentProjectId
          ? getProjectLayout(currentProjectId).workspace.researchPanelSizes[
              content.tab
            ]
          : undefined;
      addPanelBase(content, insertAt, initialSize);
    },
    [addPanelBase, currentProjectId, getProjectLayout],
  );

  const handleSelectResearchItem = useCallback(
    (type: ResearchTab) => {
      addPanel({ type: "research", tab: type });

      const contextMap: Record<ResearchTab, ContextTab> = {
        character: "characters",
        world: "terms",
        event: "terms",
        faction: "terms",
        scrap: "synopsis",
        analysis: "synopsis",
      };
      setContextTab(contextMap[type]);
    },
    [addPanel, setContextTab],
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
    contextTab,
    setContextTab,
    addPanel,
    removePanel,
    setPanels,
    handleSelectResearchItem,
    handleSplitView,
    handleOpenSnapshot,
    handleOpenExport,
  };
}
