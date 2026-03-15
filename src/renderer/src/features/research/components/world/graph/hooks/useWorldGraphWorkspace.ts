import { useEffect, useMemo, useRef } from "react";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useGraphPluginStore } from "@renderer/features/research/stores/graphPluginStore";
import { useMemoStore } from "@renderer/features/research/stores/memoStore";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { getReadableLuieAttachmentPath } from "@shared/projectAttachment";

const readEventDate = (attributes: unknown): string | null => {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    return null;
  }

  const raw =
    (attributes as Record<string, unknown>).date ??
    (attributes as Record<string, unknown>).time;

  return typeof raw === "string" && raw.trim().length > 0 ? raw : null;
};

export function useWorldGraphWorkspace() {
  const currentProject = useProjectStore((state) => state.currentItem);
  const attachmentPath = getReadableLuieAttachmentPath(currentProject);

  const activeProjectId = useWorldBuildingStore((state) => state.activeProjectId);
  const storedGraphData = useWorldBuildingStore((state) => state.graphData);
  const graphLoading = useWorldBuildingStore((state) => state.isLoading);
  const graphError = useWorldBuildingStore((state) => state.error);
  const loadGraph = useWorldBuildingStore((state) => state.loadGraph);

  const notes = useMemoStore((state) => state.notes);
  const notesLoading = useMemoStore((state) => state.isLoading);
  const notesSaving = useMemoStore((state) => state.isSaving);
  const loadNotes = useMemoStore((state) => state.loadNotes);
  const resetNotes = useMemoStore((state) => state.reset);

  const catalog = useGraphPluginStore((state) => state.catalog);
  const installed = useGraphPluginStore((state) => state.installed);
  const templates = useGraphPluginStore((state) => state.templates);
  const pluginsLoading = useGraphPluginStore((state) => state.isLoading);
  const pluginError = useGraphPluginStore((state) => state.error);
  const loadPluginData = useGraphPluginStore((state) => state.loadData);

  const graphRequestRef = useRef<string | null>(null);
  const notesRequestRef = useRef<string | null>(null);
  const pluginLoadedRef = useRef(false);

  useEffect(() => {
    const projectId = currentProject?.id ?? null;
    if (!projectId) {
      graphRequestRef.current = null;
      resetNotes();
      return;
    }

    if (graphRequestRef.current !== projectId) {
      graphRequestRef.current = projectId;
      void loadGraph(projectId);
    }

    if (notesRequestRef.current !== projectId) {
      notesRequestRef.current = projectId;
      void loadNotes(projectId, attachmentPath, []);
    }
  }, [attachmentPath, currentProject?.id, loadGraph, loadNotes, resetNotes]);

  useEffect(() => {
    if (pluginLoadedRef.current) {
      return;
    }
    pluginLoadedRef.current = true;
    void loadPluginData();
  }, [loadPluginData]);

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
