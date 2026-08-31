import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useCanvasViewStore } from "@renderer/features/canvas/stores";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { createLogger } from "@shared/logger";
import { ChapterSummarySection } from "./ChapterSummarySection";
import { ConnectedCharactersSection } from "./ConnectedCharactersSection";
import { ConnectedMemosSection } from "./ConnectedMemosSection";

const logger = createLogger("ChapterInspectorView");

interface ChapterInspectorViewProps {
  nodeId: string;
  nodeName: string;
}

export default function ChapterInspectorView({ nodeId, nodeName }: ChapterInspectorViewProps) {
  const { t } = useTranslation();
  const clearSelection = useCanvasViewStore((s) => s.clearSelection);
  const currentProjectId = useProjectStore((state) => state.currentProject?.id);
  const graphData = useWorldBuildingStore((state) => state.graphData);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const relations = graphData?.edges.filter(
    (e) => e.sourceId === nodeId || e.targetId === nodeId,
  ) ?? [];
  const connectedNodeIds = new Set(
    relations
      .flatMap((e) => [e.sourceId, e.targetId])
      .filter((id) => id !== nodeId),
  );
  const connectedCharacters = graphData?.nodes.filter(
    (n) => connectedNodeIds.has(n.id) && n.entityType.toLowerCase() === "character",
  ) ?? [];
  const connectedMemosAndEvents = graphData?.nodes.filter(
    (n) =>
      connectedNodeIds.has(n.id) &&
      (n.entityType.toLowerCase() === "memo" || n.entityType.toLowerCase() === "event"),
  ) ?? [];

  const [summary, setSummary] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const loadSummary = useCallback(async () => {
    if (typeof window === "undefined" || !window.api || !window.api.memory) {
      return;
    }
    try {
      setLoading(true);
      const res = await window.api.memory.getChapterSummary(nodeId);
      if (res && res.success && res.data) {
        setSummary(res.data.summary);
      } else {
        setSummary(null);
      }
    } catch (err) {
      logger.error("Failed to load chapter summary info", err);
    } finally {
      setLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void loadSummary();
    });
    return () => {
      cancelled = true;
    };
  }, [loadSummary]);

  const handleGenerateSummary = useCallback(async () => {
    if (typeof window === "undefined" || !window.api || !window.api.memoryAdmin) {
      return;
    }
    try {
      setGenerating(true);
      logger.info("Triggering summary generation manually on-demand", { nodeId });
      await window.api.memoryAdmin.rebuildChunks({
        projectId: currentProjectId ?? "",
        sourceType: "chapter",
        sourceId: nodeId,
      });

      // NOTE: background summary 생성이 반영될 시간을 둔 뒤 다시 불러온다.
      timeoutRef.current = setTimeout(async () => {
        await loadSummary();
        setGenerating(false);
      }, 3000);
    } catch (err) {
      logger.error("Failed to trigger manual summary build", err);
      setGenerating(false);
    }
  }, [nodeId, currentProjectId, loadSummary]);

  return (
    <div className="relative flex h-full flex-col overflow-y-auto bg-panel">
      <div className="absolute top-4 right-4 z-10">
        <button
          type="button"
          onClick={clearSelection}
          className="rounded-control p-1 text-muted transition-colors hover:bg-surface-hover hover:text-fg"
          title={t("canvas.node.deselect")}
          aria-label={t("canvas.node.deselect")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20">
            <span className="text-xs font-bold text-accent">CH</span>
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-fg">{nodeName}</h3>
            <span className="text-xs text-muted">{t("canvas.node.kind.chapter")}</span>
          </div>
        </div>

        <ChapterSummarySection
          loading={loading}
          summary={summary}
          generating={generating}
          onGenerate={handleGenerateSummary}
          t={t}
        />

        <ConnectedCharactersSection characters={connectedCharacters} t={t} />

        <ConnectedMemosSection items={connectedMemosAndEvents} t={t} />
      </div>
    </div>
  );
}
