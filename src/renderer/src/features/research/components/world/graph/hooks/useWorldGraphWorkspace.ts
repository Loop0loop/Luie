import { useMemo } from "react";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useGraphPluginStore } from "@renderer/features/research/stores/graphPluginStore";
import { useMemoStore } from "@renderer/features/research/stores/memoStore";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { getReadableLuieAttachmentPath } from "@shared/projectAttachment";
import { useWorldGraphLoader } from "./useWorldGraphLoader";

const readEventDate = (attributes: unknown): string | null => {
  if (
    !attributes ||
    typeof attributes !== "object" ||
    Array.isArray(attributes)
  ) {
    return null;
  }

  const raw =
    (attributes as Record<string, unknown>).date ??
    (attributes as Record<string, unknown>).time;

  return typeof raw === "string" && raw.trim().length > 0 ? raw : null;
};

export function useWorldGraphWorkspace() {
  useWorldGraphLoader();

  const currentProject = useProjectStore((state) => state.currentItem);
  const attachmentPath = getReadableLuieAttachmentPath(currentProject);

  const activeProjectId = useWorldBuildingStore(
    (state) => state.activeProjectId,
  );
  const storedGraphData = useWorldBuildingStore((state) => state.graphData);
  const graphLoading = useWorldBuildingStore((state) => state.isLoading);
  const graphError = useWorldBuildingStore((state) => state.error);

  const notes = useMemoStore((state) => state.notes);
  const notesLoading = useMemoStore((state) => state.isLoading);
  const notesSaving = useMemoStore((state) => state.isSaving);

  const catalog = useGraphPluginStore((state) => state.catalog);
  const installed = useGraphPluginStore((state) => state.installed);
  const templates = useGraphPluginStore((state) => state.templates);
  const pluginsLoading = useGraphPluginStore((state) => state.isLoading);
  const pluginError = useGraphPluginStore((state) => state.error);

  const graphData =
    activeProjectId === currentProject?.id ? storedGraphData : null;

  const graphNodes = useMemo(
    () =>
      [...(graphData?.nodes ?? [])].sort((left, right) =>
        left.name.localeCompare(right.name, "ko"),
      ),
    [graphData?.nodes],
  );

  const graphEdges = graphData?.edges ?? [];
  const graphCanvasBlocks = graphData?.canvasBlocks ?? [];
  const graphCanvasEdges = graphData?.canvasEdges ?? [];

  const timelineNodes = useMemo(
    () =>
      graphNodes
        .filter((node) => node.entityType === "Event")
        .sort((left, right) => {
          const leftDate = readEventDate(left.attributes);
          const rightDate = readEventDate(right.attributes);
          if (leftDate && rightDate) {
            return leftDate.localeCompare(rightDate, "ko");
          }
          if (leftDate) return -1;
          if (rightDate) return 1;
          return left.name.localeCompare(right.name, "ko");
        }),
    [graphNodes],
  );

  return {
    currentProject,
    projectId: currentProject?.id ?? null,
    projectPath: attachmentPath,
    currentProjectTitle: currentProject?.title ?? "프로젝트 없음",
    graphNodes,
    graphEdges,
    graphCanvasBlocks,
    graphCanvasEdges,
    timelineNodes,
    notes,
    notesLoading,
    notesSaving,
    graphLoading,
    graphError,
    catalog,
    installed,
    templates,
    pluginsLoading,
    pluginError,
  };
}
