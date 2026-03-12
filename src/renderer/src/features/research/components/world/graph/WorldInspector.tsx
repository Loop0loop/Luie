import { useMemo, useState, useEffect } from "react";
import { X, Link as LinkIcon, MapPin, Clock, Star, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import { api } from "@shared/api";
import type { WorldGraphMention } from "@shared/types";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { requestChapterNavigation } from "@renderer/features/workspace/services/chapterNavigation";

// ─── Constants ────────────────────────────────────────────────────────────────



const IMPORTANCE_MAX = 5;



// ─── Sub-components ───────────────────────────────────────────────────────────

/** ★ 별점 UI */
/** ★ 별점 읽기 전용 UI */
function StarRatingReadOnly({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: IMPORTANCE_MAX }, (_, i) => i + 1).map((star) => {
        const filled = star <= value;
        return (
          <div key={star} className="p-0.5" aria-label={`중요도 ${star}`}>
            <Star
              size={14}
              className={cn(filled ? "fill-amber-400 text-amber-400" : "text-muted/40")}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WorldInspector() {
  const { t } = useTranslation();
  const graphData = useWorldBuildingStore((state) => state.graphData);
  const activeProjectId = useWorldBuildingStore((state) => state.activeProjectId);
  const selectedNodeId = useWorldBuildingStore((state) => state.selectedNodeId);
  const selectedEdgeId = useWorldBuildingStore((state) => state.selectedEdgeId);
  const selectNode = useWorldBuildingStore((state) => state.selectNode);
  const selectEdge = useWorldBuildingStore((state) => state.selectEdge);

  const selectedNode = useMemo(
    () => (selectedNodeId ? graphData?.nodes.find((node) => node.id === selectedNodeId) : null),
    [graphData, selectedNodeId],
  );
  const selectedEdge = useMemo(
    () => (selectedEdgeId ? graphData?.edges.find((edge) => edge.id === selectedEdgeId) : null),
    [graphData, selectedEdgeId],
  );
  const sourceNode = useMemo(
    () => (selectedEdge ? graphData?.nodes.find((node) => node.id === selectedEdge.sourceId) : null),
    [graphData, selectedEdge],
  );
  const targetNode = useMemo(
    () => (selectedEdge ? graphData?.nodes.find((node) => node.id === selectedEdge.targetId) : null),
    [graphData, selectedEdge],
  );

  const [mentions, setMentions] = useState<WorldGraphMention[]>([]);
  const [mentionsLoading, setMentionsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"mentions" | "consistency" | "evidence">("mentions");

  useEffect(() => {
    if (!selectedNode || !activeProjectId) {
      queueMicrotask(() => {
        setMentions((previous) => (previous.length > 0 ? [] : previous));
        setMentionsLoading(false);
      });
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setMentionsLoading(true);
      }
    });
    void api.worldGraph
      .getMentions({
        projectId: activeProjectId,
        entityId: selectedNode.id,
        entityType: selectedNode.entityType,
      })
      .then((response) => {
        if (cancelled) return;
        if (!response.success || !response.data) {
          setMentions([]);
          return;
        }
        setMentions(response.data);
      })
      .catch(() => {
        if (!cancelled) {
          setMentions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMentionsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, selectedNode]);

  const handleOpenMention = (mention: WorldGraphMention) => {
    requestChapterNavigation({
      chapterId: mention.chapterId,
      query: mention.context,
    });
    if (window.location.hash === "#world-graph") {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  };

  if (!selectedNode && !selectedEdge) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted text-xs text-center p-6">
        <div className="w-12 h-12 rounded-2xl bg-element/50 border border-border/40 flex items-center justify-center">
          <LinkIcon size={20} className="opacity-40" />
        </div>
        <p className="whitespace-pre-line leading-relaxed">{t("world.graph.inspector.emptySelection")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-panel border-l border-border/40 shadow-2xl">
      {selectedNode && (
        <>
          <header className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0 bg-transparent">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent/60 shadow-sm" />
              <span className="text-[10px] font-bold text-muted uppercase tracking-[0.1em]">
                {t(`world.graph.entityTypes.${selectedNode.subType ?? selectedNode.entityType}`, {
                  defaultValue: selectedNode.subType ?? selectedNode.entityType,
                })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => selectNode(null)}
                className="p-1.5 text-muted hover:text-fg hover:bg-element rounded-md transition-all"
                title={t("world.graph.inspector.close", { defaultValue: "Close" })}
              >
                <X size={14} />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            <div className="p-4 flex flex-col gap-5">
              {/* 이름 */}
              <div className="text-[20px] font-bold text-fg break-words w-full px-1">
                {selectedNode.name || t("world.graph.inspector.untitled")}
              </div>

              {/* ── 속성 카드 ── */}
              <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-element/20 p-3">

                {/* 시간/시기 */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted uppercase tracking-wider">
                    <Clock size={11} />
                    <span>{t("world.graph.inspector.attributes.time")}</span>
                  </div>
                  <div className="text-xs text-fg px-1 font-medium">
                    {selectedNode.attributes?.time || <span className="text-muted/50 italic">{t("world.graph.inspector.empty")}</span>}
                  </div>
                </div>

                {/* 위치/지역 */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted uppercase tracking-wider">
                    <MapPin size={11} />
                    <span>{t("world.graph.inspector.attributes.region")}</span>
                  </div>
                  <div className="text-xs text-fg px-1 font-medium">
                    {selectedNode.attributes?.region || <span className="text-muted/50 italic">{t("world.graph.inspector.empty")}</span>}
                  </div>
                </div>

                {/* 태그 */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted uppercase tracking-wider">
                    <Tag size={11} />
                    <span>{t("world.graph.inspector.attributes.tags")}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 px-1 py-1">
                    {Array.isArray(selectedNode.attributes?.tags) && selectedNode.attributes.tags.length > 0 ? (
                      selectedNode.attributes.tags.map((tag: unknown, idx: React.Key) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-full bg-accent/15 border border-accent/20 px-2 py-0.5 text-[11px] font-medium text-accent"
                        >
                          #{String(tag)}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted/50 italic">{t("world.graph.inspector.empty")}</span>
                    )}
                  </div>
                </div>

                {/* 중요도 */}
                <div className="flex items-center justify-between min-h-[28px]">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted uppercase tracking-wider">
                    <Star size={11} />
                    <span>{t("world.graph.inspector.attributes.importance")}</span>
                  </div>
                  <StarRatingReadOnly value={typeof selectedNode.attributes?.importance === "number" ? selectedNode.attributes.importance : 3} />
                </div>
              </div>

              {/* 설명 */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">설명</span>
                <div className="w-full border border-border/40 bg-element/10 text-fg text-xs leading-relaxed p-3 rounded-lg min-h-[80px] break-words">
                  {selectedNode.description || <span className="text-muted/50 italic">{t("world.graph.inspector.empty")}</span>}
                </div>
              </div>

              {/* 탭 네비게이션 */}
              <div className="flex flex-col flex-1 min-h-0 border-t border-border/40 mt-2">
                <div className="flex items-center gap-1 border-b border-border/40 px-2 py-1 bg-surface shrink-0">
                  <button
                    onClick={() => setActiveTab("mentions")}
                    className={cn(
                      "px-3 py-1.5 text-[11px] font-semibold rounded-t-md transition-colors",
                      activeTab === "mentions"
                        ? "text-accent bg-element/50 border-b-2 border-accent"
                        : "text-muted hover:text-fg hover:bg-element/30"
                    )}
                  >
                    {t("world.graph.inspector.mentions")}
                  </button>
                  <button
                    onClick={() => setActiveTab("consistency")}
                    className={cn(
                      "px-3 py-1.5 text-[11px] font-semibold rounded-t-md transition-colors",
                      activeTab === "consistency"
                        ? "text-accent bg-element/50 border-b-2 border-accent"
                        : "text-muted hover:text-fg hover:bg-element/30"
                    )}
                  >
                    설정 검증
                  </button>
                  <button
                    onClick={() => setActiveTab("evidence")}
                    className={cn(
                      "px-3 py-1.5 text-[11px] font-semibold rounded-t-md transition-colors",
                      activeTab === "evidence"
                        ? "text-accent bg-element/50 border-b-2 border-accent"
                        : "text-muted hover:text-fg hover:bg-element/30"
                    )}
                  >
                    근거 수집
                  </button>
                </div>

                {/* 탭 콘텐츠 영역 */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                  {activeTab === "mentions" && (
                    <div className="flex flex-col gap-2">
                      {mentionsLoading && (
                        <p className="text-[11px] text-muted">{t("world.graph.inspector.mentionsLoading")}</p>
                      )}
                      {!mentionsLoading && mentions.length === 0 && (
                        <p className="text-[11px] text-muted/60">{t("world.graph.inspector.mentionsEmpty")}</p>
                      )}
                      {!mentionsLoading &&
                        mentions.map((mention, index) => (
                          <button
                            key={`${mention.chapterId}-${index}`}
                            onClick={() => handleOpenMention(mention)}
                            className="group w-full text-left rounded-lg border border-border/40 bg-element/30 p-3 hover:bg-element hover:border-accent/40 transition-all focus:outline-none focus:ring-1 focus:ring-accent/50"
                          >
                            <p className="text-[11px] font-semibold text-fg/80 truncate group-hover:text-accent transition-colors">
                              {mention.chapterTitle}
                            </p>
                            {mention.context && (
                              <p className="mt-0.5 text-[10px] text-muted line-clamp-2 leading-relaxed">
                                {mention.context}
                              </p>
                            )}
                          </button>
                        ))}
                    </div>
                  )}

                  {activeTab === "consistency" && (
                    <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-element/50 flex flex-col items-center justify-center text-muted/40">
                        <Star size={14} />
                      </div>
                      <p className="text-[11px] text-muted/70">선택된 노드에 대한 설정 검증 내역이 없습니다.</p>
                    </div>
                  )}

                  {activeTab === "evidence" && (
                    <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-element/50 flex flex-col items-center justify-center text-muted/40">
                        <Tag size={14} />
                      </div>
                      <p className="text-[11px] text-muted/70">수집된 근거 자료가 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedEdge && (
        <>
          <header className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0 bg-transparent">
            <div className="flex items-center gap-2">
              <LinkIcon size={12} className="text-accent" />
              <span className="text-[10px] font-bold text-muted uppercase tracking-[0.1em]">
                {t("world.graph.inspector.relationHeader")}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => selectEdge(null)}
                className="p-1.5 text-muted hover:text-fg hover:bg-element rounded-md transition-all"
              >
                <X size={14} />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
            {/* 관계 노드 요약 */}
            <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-element/20 p-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">출발</p>
                <p className="text-sm font-semibold text-fg truncate">{sourceNode?.name ?? "—"}</p>
              </div>
              <div className="text-muted/60 shrink-0">→</div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">도착</p>
                <p className="text-sm font-semibold text-fg truncate">{targetNode?.name ?? "—"}</p>
              </div>
            </div>

            {/* 관계 종류 편집 */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider">관계 종류</p>
              <div className="flex items-center min-h-[36px] px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent font-semibold text-xs tracking-wide">
                {t(`world.graph.relationTypes.${selectedEdge.relation}`, { defaultValue: selectedEdge.relation })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
