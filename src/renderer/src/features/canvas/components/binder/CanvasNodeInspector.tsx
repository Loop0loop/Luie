/**
 * CanvasNodeInspector — BinderBar panel for the selected canvas node.
 *
 * 분기 처리:
 *   - node.entityType === "Character" -> WikiDetailView 이식
 *   - node.entityType === "Event" -> EventDetailView 이식
 *   - node.entityType === "Chapter" -> 전용 온디맨드 요약 및 등장인물/복선 리스트 연동
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, Sparkles, RefreshCw, User, HelpCircle } from "lucide-react";
import { useCanvasViewStore } from "@renderer/features/canvas/stores";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import {
  CANVAS_NODE_KIND_COLOUR,
  ENTITY_TYPE_TO_NODE_KIND,
} from "@renderer/features/canvas/types";
import type { CanvasNodeKind } from "@renderer/features/canvas/types";
import { cn } from "@shared/types/utils";
import { createLogger } from "@shared/logger";

// Namu Wiki & Research Detail Views
import WikiDetailView from "@renderer/features/research/components/wiki/WikiDetailView";
import EventDetailView from "@renderer/features/research/components/event/EventDetailView";

const logger = createLogger("CanvasNodeInspector");

interface CanvasNodeInspectorProps {
  nodeId: string;
}

export default function CanvasNodeInspector({ nodeId }: CanvasNodeInspectorProps) {
  const { t } = useTranslation();
  const graphData = useWorldBuildingStore((state) => state.graphData);
  const clearSelection = useCanvasViewStore((s) => s.clearSelection);
  const currentProjectId = useProjectStore((state) => state.currentProject?.id);

  const node = graphData?.nodes.find((n) => n.id === nodeId) ?? null;

  if (!node) {
    return (
      <div className="p-panel-pad text-xs italic text-muted">
        {t("canvas.status.empty")}
      </div>
    );
  }

  const normalizedType = node.entityType ? node.entityType.toLowerCase() : "";

  // 캐릭터 위키 재활용
  if (normalizedType === "character") {
    return (
      <div className="relative flex h-full flex-col overflow-y-auto">
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
        <WikiDetailView characterId={node.id} />
      </div>
    );
  }

  // 사건 타임라인 상세 재활용
  if (normalizedType === "event") {
    return (
      <div className="relative flex h-full flex-col overflow-y-auto">
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
        <EventDetailView eventId={node.id} />
      </div>
    );
  }

  // 원고(챕터) 노드 전용 디테일 뷰
  if (normalizedType === "chapter") {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 border-b border-border/40 px-panel-pad py-control-y flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: CANVAS_NODE_KIND_COLOUR.chapter }}
              aria-hidden
            />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">
              {t("canvas.node.kind.chapter")}
            </span>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-control p-0.5 text-muted transition-colors hover:bg-surface-hover hover:text-fg"
            title={t("canvas.node.deselect")}
            aria-label={t("canvas.node.deselect")}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-panel-pad py-4 border-b border-border/40">
            <h3 className="text-base font-bold leading-snug text-fg">
              {node.name}
            </h3>
            {node.description && (
              <p className="mt-2 text-xs leading-relaxed text-fg/70">
                {node.description}
              </p>
            )}
          </div>
          <ChapterNodeDetail
            nodeId={node.id}
            projectId={currentProjectId ?? ""}
            graphData={graphData}
          />
        </div>
      </div>
    );
  }

  // 그 외 일반 엔티티 범용 뷰포트
  const kind: CanvasNodeKind =
    ENTITY_TYPE_TO_NODE_KIND[node.entityType] ?? "world-entity";
  const colour = CANVAS_NODE_KIND_COLOUR[kind];

  const relations =
    graphData?.edges.filter(
      (e) => e.sourceId === nodeId || e.targetId === nodeId,
    ) ?? [];

  const connectedNodeIds = new Set(
    relations
      .flatMap((e) => [e.sourceId, e.targetId])
      .filter((id) => id !== nodeId),
  );
  const connectedNodes =
    graphData?.nodes.filter((n) => connectedNodeIds.has(n.id)) ?? [];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border/40 px-panel-pad py-control-y">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: colour }}
            aria-hidden
          />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">
            {t(`canvas.node.kind.${kind}` as never)}
          </span>
          <button
            type="button"
            onClick={clearSelection}
            className="ml-auto rounded-control p-0.5 text-muted transition-colors hover:bg-surface-hover hover:text-fg"
            title={t("canvas.node.deselect")}
            aria-label={t("canvas.node.deselect")}
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </div>
        <h3 className="mt-1 text-sm font-bold leading-snug text-fg">
          {node.name}
        </h3>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-4 overflow-y-auto px-panel-pad py-control-y">
        {node.description && (
          <section>
            <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
              {t("canvas.node.description")}
            </h4>
            <p className="text-xs leading-relaxed text-fg/80">
              {node.description}
            </p>
          </section>
        )}

        <section>
          <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted">
            {t("canvas.node.connections")} ({connectedNodes.length})
          </h4>
          {connectedNodes.length === 0 ? (
            <p className="text-xs italic text-muted">
              {t("canvas.status.empty")}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {connectedNodes.map((cnNode) => {
                const cnKind =
                  ENTITY_TYPE_TO_NODE_KIND[cnNode.entityType] ?? "world-entity";
                const cnColour = CANVAS_NODE_KIND_COLOUR[cnKind];
                const rel = relations.find(
                  (e) =>
                    (e.sourceId === nodeId && e.targetId === cnNode.id) ||
                    (e.targetId === nodeId && e.sourceId === cnNode.id),
                );
                return (
                  <li
                    key={cnNode.id}
                    className="flex items-center gap-2 text-xs text-fg/80"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: cnColour }}
                      aria-hidden
                    />
                    <span className="truncate">{cnNode.name}</span>
                    {rel?.relation && (
                      <span className="ml-auto shrink-0 text-[10px] text-muted">
                        {rel.relation}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────── Chapter Node Detail Inner Component */

interface ChapterNodeDetailProps {
  nodeId: string;
  projectId: string;
  graphData: {
    nodes: Array<{ id: string; name: string; entityType: string; description?: string | null }>;
    edges: Array<{ sourceId: string; targetId: string; relation?: string | null }>;
  } | null;
}

function ChapterNodeDetail({ nodeId, projectId, graphData }: ChapterNodeDetailProps) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 컴포넌트 언마운트 시 setTimeout 클린업을 통한 메모리 누수 방지
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
        projectId,
        sourceType: "chapter",
        sourceId: nodeId,
      });

      // 3초 후 요약본 재로드를 시도하는 복원 메커니즘
      timeoutRef.current = setTimeout(async () => {
        await loadSummary();
        setGenerating(false);
      }, 3000);
    } catch (err) {
      logger.error("Failed to trigger manual summary build", err);
      setGenerating(false);
    }
  }, [nodeId, projectId, loadSummary]);

  // 챕터와 연결된 등장인물 분석
  const relations =
    graphData?.edges.filter(
      (e) => e.sourceId === nodeId || e.targetId === nodeId,
    ) ?? [];
  const connectedNodeIds = new Set(
    relations
      .flatMap((e) => [e.sourceId, e.targetId])
      .filter((id) => id !== nodeId),
  );
  const connectedCharacters =
    graphData?.nodes.filter(
      (n) => connectedNodeIds.has(n.id) && n.entityType.toLowerCase() === "character",
    ) ?? [];

  // 챕터와 연결된 메모/사건들을 미해결 복선으로 수집
  const connectedMemosAndEvents =
    graphData?.nodes.filter(
      (n) =>
        connectedNodeIds.has(n.id) &&
        (n.entityType.toLowerCase() === "memo" || n.entityType.toLowerCase() === "event"),
    ) ?? [];

  return (
    <div className="space-y-5 p-panel-pad py-4">
      {/* 3줄 요약 섹션 */}
      <section className="rounded-lg bg-surface-hover border border-border/40 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-accent animate-pulse" />
          <h4 className="text-xs font-semibold text-fg/80">
            {t("canvas.graph.episode")}
          </h4>
        </div>
        {loading ? (
          <p className="text-xs text-muted italic">
            {t("canvas.status.loading")}
          </p>
        ) : summary ? (
          <div className="text-xs leading-relaxed text-fg/70 space-y-1">
            {summary.split("\n").map((line, idx) => (
              <p key={`${line}-${idx}`} className="flex gap-1.5">
                <span className="text-accent/60 shrink-0">•</span>
                <span>{line}</span>
              </p>
            ))}
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs text-muted mb-2">
              {t("canvas.status.empty")}
            </p>
            <button
              type="button"
              disabled={generating}
              onClick={handleGenerateSummary}
              className="inline-flex items-center gap-1.5 rounded bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-fg hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3 w-3", generating && "animate-spin")} />
              <span>
                {generating ? t("canvas.status.loading") : t("canvas.graph.aiSync")}
              </span>
            </button>
          </div>
        )}
      </section>

      {/* 등장인물 리스트 */}
      <section>
        <div className="flex items-center gap-1.5 mb-2">
          <User className="h-4 w-4 text-muted" />
          <h4 className="text-xs font-semibold text-fg/80">
            {t("canvas.graph.character")}
          </h4>
        </div>
        {connectedCharacters.length === 0 ? (
          <p className="text-xs italic text-muted pl-5">
            {t("canvas.status.empty")}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5 pl-5">
            {connectedCharacters.map((char) => (
              <span
                key={char.id}
                className="text-xs bg-surface border border-border/40 px-2 py-0.5 rounded text-fg/80"
              >
                {char.name}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 미해결 복선/남은 떡밥 */}
      <section>
        <div className="flex items-center gap-1.5 mb-2">
          <HelpCircle className="h-4 w-4 text-muted" />
          <h4 className="text-xs font-semibold text-fg/80">
            {t("canvas.graph.relations")}
          </h4>
        </div>
        {connectedMemosAndEvents.length === 0 ? (
          <p className="text-xs italic text-muted pl-5">
            {t("canvas.status.empty")}
          </p>
        ) : (
          <ul className="space-y-2 pl-5 list-disc text-xs text-fg/70 leading-relaxed">
            {connectedMemosAndEvents.map((item) => (
              <li key={item.id} className="marker:text-accent/60">
                <span className="font-semibold text-fg/80">
                  [{t(`canvas.node.kind.${item.entityType.toLowerCase()}` as never)}]
                </span>{" "}
                {item.name}
                {item.description && (
                  <span className="text-muted text-[11px] block pl-2">
                    {item.description}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
