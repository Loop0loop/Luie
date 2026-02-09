/**
 * 분할 뷰 관리
 */

import { useCallback } from "react";
import { useUIStore, type ResearchTab, type ContextTab } from "../stores/uiStore";
import type { Snapshot } from "../../../shared/types";

export function useSplitView() {
  const {
    isSplitView,
    splitRatio,
    rightPanelContent,
    contextTab,
    setSplitView,
    setSplitRatio,
    setRightPanelContent,
    setContextTab,
  } = useUIStore();

  const handleSelectResearchItem = useCallback(
    (type: ResearchTab) => {
      setSplitView(true);
      setRightPanelContent({ type: "research", tab: type });

      const contextMap: Record<ResearchTab, ContextTab> = {
        character: "characters",
        world: "terms",
        scrap: "synopsis",
        analysis: "synopsis",
      };
      setContextTab(contextMap[type]);
    },
    [setSplitView, setRightPanelContent, setContextTab],
  );

  const handleSplitView = useCallback(
    (type: "vertical" | "horizontal", contentId: string) => {
      if (type === "vertical") {
        setSplitView(true);
        setRightPanelContent({ type: "editor", id: contentId });
      }
    },
    [setSplitView, setRightPanelContent],
  );

  const handleOpenSnapshot = useCallback(
    (snapshot: Snapshot) => {
      setSplitView(true);
      setRightPanelContent({ type: "snapshot", snapshot });
    },
    [setSplitView, setRightPanelContent],
  );

  const handleOpenExport = useCallback(() => {
    setSplitView(true);
    setRightPanelContent({ type: "export" });
  }, [setSplitView, setRightPanelContent]);

  const startResizeSplit = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      const startX = e.clientX;
      const startRatio = splitRatio;
      const container = document.getElementById("split-view-container");
      const containerWidth =
        container instanceof HTMLElement
          ? container.getBoundingClientRect().width
          : window.innerWidth;

      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        const next = Math.min(
          0.8,
          Math.max(0.2, startRatio + delta / containerWidth),
        );
        setSplitRatio(next);
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [splitRatio, setSplitRatio],
  );

  return {
    isSplitView,
    splitRatio,
    rightPanelContent,
    contextTab,
    setContextTab,
    setSplitView,
    handleSelectResearchItem,
    handleSplitView,
    handleOpenSnapshot,
    handleOpenExport,
    startResizeSplit,
  };
}
