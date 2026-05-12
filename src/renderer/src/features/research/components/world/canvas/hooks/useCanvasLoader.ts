import { useEffect, useRef } from "react";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useGraphPluginStore } from "@renderer/features/research/stores/graphPluginStore";
import { useMemoStore } from "@renderer/features/research/stores/memoStore";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useWorldGraphUiStore } from "@renderer/features/research/stores/worldGraphUiStore";
import { getReadableLuieAttachmentPath } from "@shared/projectAttachment";

export function useCanvasLoader() {
  const currentProject = useProjectStore((state) => state.currentItem);
  const attachmentPath = getReadableLuieAttachmentPath(currentProject);

  const loadGraph = useWorldBuildingStore((state) => state.loadGraph);
  const loadNotes = useMemoStore((state) => state.loadNotes);
  const flushNotes = useMemoStore((state) => state.flushSave);
  const resetNotes = useMemoStore((state) => state.reset);
  const loadPluginData = useGraphPluginStore((state) => state.loadData);
  const resetGraphSessionSelection = useWorldGraphUiStore(
    (state) => state.resetSessionSelection,
  );

  const graphRequestRef = useRef<string | null>(null);
  const notesRequestRef = useRef<string | null>(null);
  const pluginLoadedRef = useRef(false);

  useEffect(() => {
    const projectId = currentProject?.id ?? null;
    if (!projectId) {
      graphRequestRef.current = null;
      notesRequestRef.current = null;
      resetGraphSessionSelection();
      void flushNotes().finally(resetNotes);
      return;
    }

    if (graphRequestRef.current !== projectId) {
      graphRequestRef.current = projectId;
      resetGraphSessionSelection();
      void loadGraph(projectId);
    }

    if (notesRequestRef.current !== projectId) {
      notesRequestRef.current = projectId;
      void loadNotes(projectId, attachmentPath, []);
    }
  }, [
    attachmentPath,
    currentProject?.id,
    flushNotes,
    loadGraph,
    loadNotes,
    resetGraphSessionSelection,
    resetNotes,
  ]);

  useEffect(() => {
    if (pluginLoadedRef.current) return;
    pluginLoadedRef.current = true;
    void loadPluginData();
  }, [loadPluginData]);
}
