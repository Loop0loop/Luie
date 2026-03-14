import { useEffect, useState } from "react";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { worldPackageStorage } from "@renderer/features/research/services/worldPackageStorage";
import { getReadableLuieAttachmentPath } from "@shared/projectAttachment";
import {
  DEFAULT_WORLD_DRAWING,
  DEFAULT_WORLD_MINDMAP,
  DEFAULT_WORLD_PLOT,
  DEFAULT_WORLD_SCRAP_MEMOS,
  DEFAULT_WORLD_SYNOPSIS,
} from "@renderer/features/research/services/worldPackageStorage";
import {
  buildLibrarySummaryEntries,
  type LibrarySummaryEntry,
} from "../utils/worldGraphIdeViewModels";

type WorldLibrarySummaryState = {
  entries: LibrarySummaryEntry[];
  error: string | null;
  isLoading: boolean;
};

export function useWorldLibrarySummary(): WorldLibrarySummaryState {
  const currentProject = useProjectStore((state) => state.currentItem);
  const graphData = useWorldBuildingStore((state) => state.graphData);
  const projectPath = getReadableLuieAttachmentPath(currentProject);
  const projectId = currentProject?.id ?? null;
  const [state, setState] = useState<{
    drawing: typeof DEFAULT_WORLD_DRAWING;
    mindmap: typeof DEFAULT_WORLD_MINDMAP;
    plot: typeof DEFAULT_WORLD_PLOT;
    projectId: string | null;
    scrap: typeof DEFAULT_WORLD_SCRAP_MEMOS;
    synopsis: typeof DEFAULT_WORLD_SYNOPSIS;
    error: string | null;
  }>({
    drawing: DEFAULT_WORLD_DRAWING,
    mindmap: DEFAULT_WORLD_MINDMAP,
    plot: DEFAULT_WORLD_PLOT,
    projectId: null,
    scrap: DEFAULT_WORLD_SCRAP_MEMOS,
    synopsis: DEFAULT_WORLD_SYNOPSIS,
    error: null,
  });

  useEffect(() => {
    if (!projectId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const [synopsis, plot, drawing, mindmap, scrap] = await Promise.all([
          worldPackageStorage.loadSynopsis(projectId, projectPath),
          worldPackageStorage.loadPlot(projectId, projectPath),
          worldPackageStorage.loadDrawing(projectId, projectPath),
          worldPackageStorage.loadMindmap(projectId, projectPath),
          worldPackageStorage.loadScrapMemos(projectId, projectPath),
        ]);

        if (cancelled) {
          return;
        }

        setState({
          drawing,
          mindmap,
          plot,
          projectId,
          scrap,
          synopsis,
          error: null,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setState({
          drawing: DEFAULT_WORLD_DRAWING,
          mindmap: DEFAULT_WORLD_MINDMAP,
          plot: DEFAULT_WORLD_PLOT,
          projectId,
          scrap: DEFAULT_WORLD_SCRAP_MEMOS,
          synopsis: DEFAULT_WORLD_SYNOPSIS,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, projectPath]);

  const snapshot = projectId
    ? state
    : {
        drawing: DEFAULT_WORLD_DRAWING,
        mindmap: DEFAULT_WORLD_MINDMAP,
        plot: DEFAULT_WORLD_PLOT,
        projectId: null,
        scrap: DEFAULT_WORLD_SCRAP_MEMOS,
        synopsis: DEFAULT_WORLD_SYNOPSIS,
        error: null,
      };
  const isLoading = Boolean(projectId) && snapshot.projectId !== projectId;

  const entries = buildLibrarySummaryEntries({
    drawing: snapshot.drawing,
    graphNodes: graphData?.nodes ?? [],
    graphEdgesCount: graphData?.edges.length ?? 0,
    mindmap: snapshot.mindmap,
    plot: snapshot.plot,
    scrap: snapshot.scrap,
    synopsis: snapshot.synopsis,
  });

  return {
    entries,
    error: snapshot.error,
    isLoading,
  };
}
