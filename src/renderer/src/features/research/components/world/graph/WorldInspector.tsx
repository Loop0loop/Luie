import { useMemo, useCallback, useState, useEffect, useRef, type KeyboardEvent } from "react";
import { X, Link as LinkIcon, Trash2, MapPin, Clock, Star, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import { api } from "@shared/api";
import { useToast } from "@shared/ui/ToastContext";
import { useDialog } from "@shared/ui/useDialog";
import type { RelationKind, WorldGraphMention } from "@shared/types";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { requestChapterNavigation } from "@renderer/features/workspace/services/chapterNavigation";

// ─── Constants ────────────────────────────────────────────────────────────────

const RELATION_KINDS: RelationKind[] = [
  "belongs_to",
  "enemy_of",
  "causes",
  "controls",
  "located_in",
  "violates",
];

const IMPORTANCE_MAX = 5;

/** 웹소설 작가를 위한 타임라인 퀵 프리셋 */
const TIME_PRESETS = ["서막", "전편", "중편", "후편", "에필로그"] as const;
type TimePreset = (typeof TIME_PRESETS)[number];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** ★ 별점 UI */
function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: IMPORTANCE_MAX }, (_, i) => i + 1).map((star) => {
        const filled = star <= (hover ?? value);
        return (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange(star)}
            className="p-0.5 transition-transform hover:scale-110"
            aria-label={`중요도 ${star}`}
          >
            <Star
              size={14}
              className={cn(
                "transition-colors",
                filled ? "fill-amber-400 text-amber-400" : "text-muted/40",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

/** 태그 Chip 입력 UI */
function TagChipInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = useCallback(
    (raw: string) => {
      const trimmed = raw.trim().replace(/^#/, "");
      if (!trimmed || tags.includes(trimmed)) {
        setInputValue("");
        return;
      }
      onChange([...tags, trimmed]);
      setInputValue("");
    },
    [onChange, tags],
  );

  const removeTag = useCallback(
    (tag: string) => {
      onChange(tags.filter((t) => t !== tag));
    },
    [onChange, tags],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" || event.key === ",") {
        event.preventDefault();
        addTag(inputValue);
      } else if (event.key === "Backspace" && !inputValue && tags.length > 0) {
        removeTag(tags[tags.length - 1]);
      }
    },
    [addTag, inputValue, removeTag, tags],
  );

  return (
    <div
      className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-border/50 bg-element/40 focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent/50 transition-all cursor-text min-h-[36px]"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-accent/15 border border-accent/30 px-2 py-0.5 text-[11px] font-medium text-accent"
        >
          #{tag}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              removeTag(tag);
            }}
            className="text-accent/60 hover:text-accent transition-colors"
          >
            <X size={9} strokeWidth={3} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => { if (inputValue) addTag(inputValue); }}
        placeholder={tags.length === 0 ? "태그 입력 후 Enter…" : ""}
        className="flex-1 min-w-[80px] bg-transparent text-[11px] text-fg outline-none placeholder:text-muted/40"
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WorldInspector() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const dialog = useDialog();
  const graphData = useWorldBuildingStore((state) => state.graphData);
  const activeProjectId = useWorldBuildingStore((state) => state.activeProjectId);
  const selectedNodeId = useWorldBuildingStore((state) => state.selectedNodeId);
  const selectedEdgeId = useWorldBuildingStore((state) => state.selectedEdgeId);
  const selectNode = useWorldBuildingStore((state) => state.selectNode);
  const selectEdge = useWorldBuildingStore((state) => state.selectEdge);
  const updateGraphNode = useWorldBuildingStore((state) => state.updateGraphNode);
  const deleteGraphNode = useWorldBuildingStore((state) => state.deleteGraphNode);
  const updateRelation = useWorldBuildingStore((state) => state.updateRelation);
  const deleteRelation = useWorldBuildingStore((state) => state.deleteRelation);

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

  const [localNode, setLocalNode] = useState<{
    name: string;
    description: string;
    time: string;
    region: string;
    tags: string[];
    importance: number;
  }>({ name: "", description: "", time: "", region: "", tags: [], importance: 3 });

  const [mentions, setMentions] = useState<WorldGraphMention[]>([]);
  const [mentionsLoading, setMentionsLoading] = useState(false);

  useEffect(() => {
    if (!selectedNode) return;
    const timeValue = selectedNode.attributes?.time;
    const regionValue = selectedNode.attributes?.region;
    const tagsValue = selectedNode.attributes?.tags;
    const importanceValue = selectedNode.attributes?.importance;
    const nextLocalNode = {
      name: selectedNode.name,
      description: selectedNode.description ?? "",
      time: typeof timeValue === "string" ? timeValue : "",
      region: typeof regionValue === "string" ? regionValue : "",
      tags: Array.isArray(tagsValue)
        ? tagsValue.filter((tag): tag is string => typeof tag === "string")
        : [],
      importance: typeof importanceValue === "number" ? Math.max(1, Math.min(5, importanceValue)) : 3,
    };
    queueMicrotask(() => {
      setLocalNode(nextLocalNode);
    });
  }, [selectedNode]);

  useEffect(() => {
    if (!selectedNode || !activeProjectId) {
      queueMicrotask(() => {
        setMentions([]);
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

  const handleChange = <K extends keyof typeof localNode>(field: K, value: (typeof localNode)[K]) => {
    setLocalNode((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = useCallback(async () => {
    if (!selectedNode) return;
    const currentAttrs = selectedNode.attributes ?? {};

    await updateGraphNode({
      id: selectedNode.id,
      entityType: selectedNode.entityType,
      subType: selectedNode.subType,
      name: localNode.name || t("world.graph.inspector.untitled"),
      description: localNode.description,
      attributes: {
        ...currentAttrs,
        time: localNode.time,
        region: localNode.region,
        tags: localNode.tags,
        importance: localNode.importance as 1 | 2 | 3 | 4 | 5,
      },
    });
  }, [localNode, selectedNode, t, updateGraphNode]);

  /** 중요도 변경 즉시 저장 */
  const handleImportanceChange = useCallback(
    async (value: number) => {
      if (!selectedNode) return;
      setLocalNode((prev) => ({ ...prev, importance: value }));
      const currentAttrs = selectedNode.attributes ?? {};
      await updateGraphNode({
        id: selectedNode.id,
        entityType: selectedNode.entityType,
        subType: selectedNode.subType,
        attributes: {
          ...currentAttrs,
          importance: value as 1 | 2 | 3 | 4 | 5,
        },
      });
    },
    [selectedNode, updateGraphNode],
  );

  /** 태그 변경 즉시 저장 */
  const handleTagsChange = useCallback(
    async (newTags: string[]) => {
      if (!selectedNode) return;
      setLocalNode((prev) => ({ ...prev, tags: newTags }));
      const currentAttrs = selectedNode.attributes ?? {};
      await updateGraphNode({
        id: selectedNode.id,
        entityType: selectedNode.entityType,
        subType: selectedNode.subType,
        attributes: {
          ...currentAttrs,
          tags: newTags,
        },
      });
    },
    [selectedNode, updateGraphNode],
  );

  const handleDeleteNode = useCallback(async () => {
    if (!selectedNode) return;
    const confirmed = await dialog.confirm({
      title: t("world.graph.inspector.deleteNode", { defaultValue: "Delete node" }),
      message: t("world.graph.inspector.deleteNodeConfirm", { name: selectedNode.name }),
      isDestructive: true,
    });
    if (!confirmed) {
      return;
    }
    await deleteGraphNode(selectedNode.id);
  }, [deleteGraphNode, dialog, selectedNode, t]);

  const [editState, setEditState] = useState<{ edgeId: string; relation: RelationKind } | null>(null);
  const editRelation =
    editState && selectedEdgeId && editState.edgeId === selectedEdgeId ? editState.relation : null;

  const saveRelation = useCallback(async () => {
    if (!selectedEdge || !editState || editState.edgeId !== selectedEdge.id) return;
    const updated = await updateRelation({ id: selectedEdge.id, relation: editState.relation });
    if (!updated) {
      showToast(
        t("world.graph.inspector.updateRelationFailed", {
          defaultValue: "Failed to update relation",
        }),
        "error",
      );
      return;
    }
    setEditState(null);
  }, [editState, selectedEdge, showToast, t, updateRelation]);

  const handleDeleteRelation = useCallback(async () => {
    if (!selectedEdge) return;
    const deleted = await deleteRelation(selectedEdge.id);
    if (!deleted) {
      showToast(
        t("world.graph.inspector.deleteRelationFailed", {
          defaultValue: "Failed to delete relation",
        }),
        "error",
      );
      return;
    }
    selectEdge(null);
  }, [deleteRelation, selectEdge, selectedEdge, showToast, t]);

  const handleOpenMention = useCallback((mention: WorldGraphMention) => {
    requestChapterNavigation({
      chapterId: mention.chapterId,
      query: mention.context,
    });
    if (window.location.hash === "#world-graph") {
      window.location.hash = "";
    }
  }, []);

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
    <div className="flex flex-col h-full bg-panel/60 backdrop-blur-xl border-l border-border/40 shadow-2xl">
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
                onClick={() => void handleDeleteNode()}
                className="p-1.5 text-muted hover:text-white hover:bg-destructive rounded-md transition-all"
                title={t("world.graph.inspector.deleteNode", { defaultValue: "Delete node" })}
              >
                <Trash2 size={13} />
              </button>
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
              <input
                className="text-[20px] font-bold text-fg border-none bg-transparent outline-none w-full p-1 -ml-1 rounded-md hover:bg-element focus:bg-element transition-all placeholder:text-muted/40"
                value={localNode.name}
                onChange={(event) => handleChange("name", event.target.value)}
                onBlur={handleBlur}
                placeholder={t("world.graph.inspector.untitled")}
              />

              {/* ── 속성 카드 ── */}
              <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-element/20 p-3">

                {/* 시간/시기 */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted uppercase tracking-wider">
                    <Clock size={11} />
                    <span>{t("world.graph.inspector.attributes.time")}</span>
                  </div>
                  {/* 퀵 프리셋 버튼 */}
                  <div className="flex flex-wrap gap-1">
                    {TIME_PRESETS.map((preset: TimePreset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          handleChange("time", preset);
                          void setTimeout(handleBlur, 0);
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all",
                          localNode.time === preset
                            ? "bg-accent/20 text-accent border-accent/40"
                            : "bg-element/50 text-muted border-border/40 hover:text-fg hover:border-border",
                        )}
                      >
                        {preset}
                      </button>
                    ))}
                    {localNode.time && !TIME_PRESETS.includes(localNode.time as TimePreset) && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-accent/20 text-accent border border-accent/40">
                        {localNode.time}
                      </span>
                    )}
                  </div>
                  <input
                    className="w-full text-xs text-fg bg-element/40 border border-border/40 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all placeholder:text-muted/40"
                    value={localNode.time}
                    onChange={(event) => handleChange("time", event.target.value)}
                    onBlur={handleBlur}
                    placeholder="시간/시기 자유 입력…"
                  />
                </div>

                {/* 위치/지역 */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted uppercase tracking-wider">
                    <MapPin size={11} />
                    <span>{t("world.graph.inspector.attributes.region")}</span>
                  </div>
                  <input
                    className="w-full text-xs text-fg bg-element/40 border border-border/40 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all placeholder:text-muted/40"
                    value={localNode.region}
                    onChange={(event) => handleChange("region", event.target.value)}
                    onBlur={handleBlur}
                    placeholder={t("world.graph.inspector.empty")}
                  />
                </div>

                {/* 태그 */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted uppercase tracking-wider">
                    <Plus size={11} />
                    <span>{t("world.graph.inspector.attributes.tags")}</span>
                  </div>
                  <TagChipInput
                    tags={localNode.tags}
                    onChange={handleTagsChange}
                  />
                </div>

                {/* 중요도 */}
                <div className="flex items-center justify-between min-h-[28px]">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted uppercase tracking-wider">
                    <Star size={11} />
                    <span>{t("world.graph.inspector.attributes.importance")}</span>
                  </div>
                  <StarRating
                    value={localNode.importance}
                    onChange={handleImportanceChange}
                  />
                </div>
              </div>

              {/* 설명 */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">설명</span>
                <textarea
                  className="w-full h-[140px] border border-border/40 bg-element/20 text-fg text-xs leading-relaxed outline-none resize-none p-3 rounded-lg focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all custom-scrollbar placeholder:text-muted/40"
                  value={localNode.description}
                  onChange={(event) => handleChange("description", event.target.value)}
                  onBlur={handleBlur}
                  placeholder={t("world.graph.inspector.descriptionPlaceholder")}
                />
              </div>

              {/* 언급 섹션 */}
              <div className="flex flex-col gap-2 pt-3 border-t border-border/40">
                <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <LinkIcon size={11} className="text-accent" />
                  {t("world.graph.inspector.mentions")}
                </h4>

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
                      className="group w-full text-left rounded-lg border border-border/40 bg-element/30 p-3 hover:bg-element hover:border-accent/40 transition-all"
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
                onClick={() => void handleDeleteRelation()}
                className="p-1.5 text-muted hover:text-white hover:bg-destructive rounded-md transition-all"
                title={t("world.graph.inspector.deleteRelation", { defaultValue: "Delete relation" })}
              >
                <Trash2 size={13} />
              </button>
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
              <div className="flex flex-wrap gap-1.5">
                {RELATION_KINDS.map((kind) => {
                  const isActive = (editRelation ?? selectedEdge.relation) === kind;
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() =>
                        setEditState({ edgeId: selectedEdge.id, relation: kind })
                      }
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all",
                        isActive
                          ? "bg-accent text-white border-accent shadow-sm"
                          : "bg-element/50 border-border/50 text-muted hover:text-fg hover:border-border",
                      )}
                    >
                      {t(`world.graph.relationTypes.${kind}`, { defaultValue: kind })}
                    </button>
                  );
                })}
              </div>
              {editRelation && (
                <button
                  type="button"
                  onClick={() => void saveRelation()}
                  className="w-full mt-1 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors shadow-sm"
                >
                  {t("world.graph.inspector.saveRelation", { defaultValue: "Save" })}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
