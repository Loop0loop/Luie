import { useCallback } from "react";
import type { DragData } from "@shared/ui/GlobalDragContext";
import type { EditorUiMode } from "@shared/types";
import type { SnapshotRef } from "@shared/types";
import { openDocsRightTab } from "@renderer/features/workspace/services/docsPanelService";
import { openEditorBinderTab } from "@renderer/features/workspace/services/layoutRegionActions";
import type {
  DocsRightTab,
  ResearchTab,
  ResizablePanelData,
  WorldTab,
} from "@renderer/features/workspace/stores/uiStore";
import { getChapterDropMainView } from "@renderer/features/workspace/utils/workspaceDropRouting";

type ScrivenerMainView = {
  type:
    | "editor"
    | "character"
    | "event"
    | "faction"
    | "world"
    | "memo"
    | "trash"
    | "analysis";
  id?: string;
};

interface DropHandlerDependencies {
  uiMode: EditorUiMode;
  handleSelectChapter: (id: string) => void;
  handleSelectResearchItem: (
    type: ResearchTab,
  ) => void;
  setMainView: (view: ScrivenerMainView) => void;
  setWorldTab: (tab: WorldTab) => void;
  addPanel: (
    panelInfo: ResizablePanelData["content"],
    insertAt?: number,
  ) => void;
  handleOpenSnapshot: (snapshot: SnapshotRef) => void;
}

export function useWorkspaceDropHandlers({
  uiMode,
  handleSelectChapter,
  handleSelectResearchItem,
  setMainView,
  setWorldTab,
  addPanel,
  handleOpenSnapshot,
}: DropHandlerDependencies) {
  const isDocsLikeMode = uiMode === "docs" || uiMode === "editor";
  const getDocsTabByDragType = useCallback((type: DragData["type"]) => {
    switch (type) {
      case "character":
        return "character" as const;
      case "event":
        return "event" as const;
      case "faction":
        return "faction" as const;
      case "world":
      case "mindmap":
      case "plot":
      case "drawing":
      case "synopsis":
      case "graph":
        return "world" as const;
      case "memo":
        return "scrap" as const;
      case "analysis":
        return "analysis" as const;
      case "snapshot":
        return "snapshot" as const;
      case "trash":
        return "trash" as const;
      default:
        return null;
    }
  }, []);
  const openModeRightTab = useCallback(
    (tab: Exclude<DocsRightTab, null>) => {
      if (uiMode === "editor") {
        openEditorBinderTab(tab);
        return;
      }
      openDocsRightTab(tab);
    },
    [uiMode],
  );

  const handleDropToCenter = useCallback(
    (data: DragData) => {
      if (data.type === "chapter") {
        handleSelectChapter(data.id);
        const mainView = getChapterDropMainView(uiMode, data.type);
        if (mainView) setMainView(mainView);
        return;
      }

      if (data.type === "snapshot") {
        const snapshot = data.snapshot;
        if (snapshot && typeof snapshot === "object") {
          handleOpenSnapshot(snapshot as SnapshotRef);
        }
        return;
      }

      if (isDocsLikeMode) {
        const docsTab = getDocsTabByDragType(data.type);
        if (docsTab) {
          openModeRightTab(docsTab);
        }
        return;
      }

      if (uiMode === "scrivener") {
        switch (data.type) {
          case "character":
            setMainView({ type: "character", id: data.id });
            break;
          case "event":
            setMainView({ type: "event", id: data.id });
            break;
          case "faction":
            setMainView({ type: "faction", id: data.id });
            break;
          case "world":
            setWorldTab("terms");
            setMainView({ type: "world", id: data.id });
            break;
          case "mindmap":
            setWorldTab("mindmap");
            setMainView({ type: "world", id: data.id });
            break;
          case "plot":
            setWorldTab("plot");
            setMainView({ type: "world", id: data.id });
            break;
          case "drawing":
            setWorldTab("drawing");
            setMainView({ type: "world", id: data.id });
            break;
          case "synopsis":
            setWorldTab("synopsis");
            setMainView({ type: "world", id: data.id });
            break;
          case "graph":
            setWorldTab("graph");
            setMainView({ type: "world", id: data.id });
            break;
          case "memo":
            setMainView({ type: "memo", id: data.id });
            break;
          case "analysis":
            setMainView({ type: "analysis", id: data.id });
            break;
          case "trash":
            setMainView({ type: "trash", id: data.id });
            break;
        }
      } else {
        switch (data.type) {
          case "character":
            handleSelectResearchItem("character");
            break;
          case "event":
            handleSelectResearchItem("event");
            break;
          case "faction":
            handleSelectResearchItem("faction");
            break;
          case "world":
            handleSelectResearchItem("scrap");
            break;
          case "plot":
          case "synopsis":
            handleSelectResearchItem("plotboard");
            break;
          case "mindmap":
          case "drawing":
          case "graph":
            handleSelectResearchItem("untitled");
            break;
          case "memo":
            handleSelectResearchItem("scrap");
            break;
          case "analysis":
            handleSelectResearchItem("analysis");
            break;
        }
      }
    },
    [
      getDocsTabByDragType,
      handleOpenSnapshot,
      handleSelectChapter,
      handleSelectResearchItem,
      isDocsLikeMode,
      openModeRightTab,
      setMainView,
      setWorldTab,
      uiMode,
    ],
  );

  const handleDropToSplit = useCallback(
    (data: DragData, side?: "left" | "right" | "bottom") => {
      if (data.type === "snapshot") {
        const snapshot = data.snapshot;
        if (snapshot && typeof snapshot === "object") {
          handleOpenSnapshot(snapshot as SnapshotRef);
        }
        return;
      }

      if (isDocsLikeMode) {
        const docsTab = getDocsTabByDragType(data.type);
        if (docsTab) {
          openModeRightTab(docsTab);
        }
        return;
      }

      let insertAt: number | undefined;
      if (side === "left") insertAt = 0;

      switch (data.type) {
        case "chapter":
          addPanel({ type: "editor", id: data.id }, insertAt);
          break;
        case "character":
          addPanel(
            { type: "research", tab: "character", id: data.id },
            insertAt,
          );
          break;
        case "event":
          addPanel({ type: "research", tab: "event", id: data.id }, insertAt);
          break;
        case "faction":
          addPanel({ type: "research", tab: "faction", id: data.id }, insertAt);
          break;
        case "world":
          addPanel({ type: "research", tab: "scrap", id: data.id }, insertAt);
          break;
        case "plot":
        case "synopsis":
          addPanel({ type: "research", tab: "plotboard", id: data.id }, insertAt);
          break;
        case "mindmap":
        case "drawing":
        case "graph":
          addPanel({ type: "research", tab: "untitled", id: data.id }, insertAt);
          break;
        case "memo":
          addPanel({ type: "research", tab: "scrap", id: data.id }, insertAt);
          break;
        case "analysis":
          addPanel(
            { type: "research", tab: "analysis", id: data.id },
            insertAt,
          );
          break;
      }
    },
    [
      addPanel,
      getDocsTabByDragType,
      handleOpenSnapshot,
      isDocsLikeMode,
      openModeRightTab,
    ],
  );

  return {
    handleDropToCenter,
    handleDropToSplit,
  };
}
