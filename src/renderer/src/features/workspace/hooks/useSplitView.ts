/**
 * 분할 뷰 관리
 */

import { useCallback } from "react";
import { useUIStore, type ResearchTab, type ContextTab } from "@renderer/features/workspace/stores/uiStore";
import type { Snapshot } from "@shared/types";

export function useSplitView() {
  const {
    panels,
    contextTab,
    addPanel,
    removePanel,
    setPanels,
    setContextTab,
  } = useUIStore();

  const handleSelectResearchItem = useCallback(
    (type: ResearchTab) => {
      addPanel({ type: "research", tab: type });

      const contextMap: Record<ResearchTab, ContextTab> = {
        character: "characters",
        world: "terms",
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

  const startResizeSplit = useCallback(
    (_e: React.MouseEvent) => {
       // Deprecated with react-resizable-panels
    },
    [],
  );

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
    startResizeSplit,
  };
}
