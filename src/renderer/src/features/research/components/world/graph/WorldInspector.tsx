import { useMemo, useCallback, useState, useEffect } from "react";
import { X, Link as LinkIcon, Trash2, Tag, MapPin, Clock, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import { api } from "@shared/api";
import { useToast } from "@shared/ui/ToastContext";
import { useDialog } from "@shared/ui/useDialog";
import type { RelationKind, WorldGraphMention } from "@shared/types";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { requestChapterNavigation } from "@renderer/features/workspace/services/chapterNavigation";

const RELATION_KINDS: RelationKind[] = [
  "belongs_to",
  "enemy_of",
  "causes",
  "controls",
  "located_in",
  "violates",
];

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
    tags: string;
    importance: number;
  }>({ name: "", description: "", time: "", region: "", tags: "", importance: 3 });

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
        ? tagsValue.filter((tag): tag is string => typeof tag === "string").join(", ")
        : "",
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

  const handleChange = (field: keyof typeof localNode, value: string | number) => {
    setLocalNode((previous) => ({ ...previous, [field]: value }));
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
        tags: localNode.tags.split(",").map((value) => value.trim()).filter(Boolean),
        importance: localNode.importance as 1 | 2 | 3 | 4 | 5,
      },
    });
  }, [localNode, selectedNode, t, updateGraphNode]);

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
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted text-xs text-center p-5">
        <LinkIcon size={24} className="opacity-30" />
        <p className="whitespace-pre-line">{t("world.graph.inspector.emptySelection")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-panel border-l border-border">
      {selectedNode && (
        <>
          <header className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0 bg-panel">
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
            <div className="p-5 flex flex-col gap-6">
              <input
                className="text-[22px] font-bold text-fg border-none bg-transparent outline-none w-full p-1 -ml-1 rounded-md hover:bg-element focus:bg-element transition-all placeholder:text-muted/40"
                value={localNode.name}
                onChange={(event) => handleChange("name", event.target.value)}
                onBlur={handleBlur}
                placeholder={t("world.graph.inspector.untitled")}
              />

              <div className="flex flex-col gap-1.5 bg-element/30 rounded-lg p-2 border border-border/60">
                <div className="group flex items-center min-h-[30px] rounded-md hover:bg-element transition-colors px-1">
                  <div className="w-[100px] text-[11px] text-muted flex items-center gap-2 font-medium shrink-0">
                    <Clock size={13} />
                    {t("world.graph.inspector.attributes.time")}
                  </div>
                  <input
                    className="flex-1 text-xs text-fg border-none bg-transparent outline-none px-2 py-1 rounded-sm focus:bg-panel min-w-0 transition-all placeholder:text-muted/40"
                    value={localNode.time}
                    onChange={(event) => handleChange("time", event.target.value)}
                    onBlur={handleBlur}
                    placeholder={t("world.graph.inspector.empty")}
                  />
                </div>

                <div className="group flex items-center min-h-[30px] rounded-md hover:bg-element transition-colors px-1">
                  <div className="w-[100px] text-[11px] text-muted flex items-center gap-2 font-medium shrink-0">
                    <MapPin size={13} />
                    {t("world.graph.inspector.attributes.region")}
                  </div>
                  <input
                    className="flex-1 text-xs text-fg border-none bg-transparent outline-none px-2 py-1 rounded-sm focus:bg-panel min-w-0 transition-all placeholder:text-muted/40"
                    value={localNode.region}
                    onChange={(event) => handleChange("region", event.target.value)}
                    onBlur={handleBlur}
                    placeholder={t("world.graph.inspector.empty")}
                  />
                </div>

                <div className="group flex items-center min-h-[30px] rounded-md hover:bg-element transition-colors px-1">
                  <div className="w-[100px] text-[11px] text-muted flex items-center gap-2 font-medium shrink-0">
                    <Tag size={13} />
                    {t("world.graph.inspector.attributes.tags")}
                  </div>
                  <input
                    className="flex-1 text-xs text-fg border-none bg-transparent outline-none px-2 py-1 rounded-sm focus:bg-panel min-w-0 transition-all placeholder:text-muted/40"
                    value={localNode.tags}
                    onChange={(event) => handleChange("tags", event.target.value)}
                    onBlur={handleBlur}
                    placeholder={t("world.graph.inspector.tagsPlaceholder")}
                  />
                </div>

                <div className="group flex items-center min-h-[30px] rounded-md hover:bg-element transition-colors px-1">
                  <div className="w-[100px] text-[11px] text-muted flex items-center gap-2 font-medium shrink-0">
                    <Star size={13} />
                    {t("world.graph.inspector.attributes.importance")}
                  </div>
                  <select
                    className="flex-1 text-xs text-fg border-none bg-transparent outline-none px-2 py-1 rounded-sm focus:bg-panel min-w-0 transition-all cursor-pointer"
                    value={localNode.importance}
                    onChange={(event) => {
                      handleChange("importance", Number(event.target.value));
                      void setTimeout(handleBlur, 0);
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value} className="text-fg bg-panel">
                        {"★".repeat(value)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <textarea
                className="w-full h-[180px] border-none bg-transparent text-fg text-xs leading-relaxed outline-none resize-none p-2 rounded-md hover:bg-element/40 focus:bg-element/60 transition-all custom-scrollbar placeholder:text-muted/40"
                value={localNode.description}
                onChange={(event) => handleChange("description", event.target.value)}
                onBlur={handleBlur}
                placeholder={t("world.graph.inspector.descriptionPlaceholder")}
              />

              <div className="flex flex-col gap-2 pt-4 border-t border-border/60">
                <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Star size={12} className="text-accent" />
                  {t("world.graph.inspector.mentions")}
                </h4>

                {mentionsLoading && (
                  <p className="text-xs text-muted">{t("world.graph.inspector.mentionsLoading")}</p>
                )}

                {!mentionsLoading && mentions.length === 0 && (
                  <p className="text-xs text-muted">{t("world.graph.inspector.mentionsEmpty")}</p>
                )}

                {!mentionsLoading &&
                  mentions.map((mention, index) => (
                    <button
                      key={`${mention.chapterId}-${index}`}
                      type="button"
                      onClick={() => handleOpenMention(mention)}
                      className="text-xs text-muted/80 flex items-center justify-between p-2.5 bg-element/30 rounded-lg border border-border/60 hover:bg-element hover:text-fg hover:border-accent/40 transition-all text-left group"
                    >
                      <span className="flex-1 truncate font-medium">{mention.chapterTitle}</span>
                      <span className="shrink-0 font-bold ml-2 text-[10px] text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                        {t("world.graph.inspector.openMention", { defaultValue: "Open" })}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </>
      )}

      {selectedEdge && (
        <>
          <header className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0 bg-panel">
            <div className="flex items-center gap-2">
              <LinkIcon size={12} className="text-accent" />
              <span className="text-[10px] font-bold text-muted uppercase tracking-[0.1em]">
                {t("world.graph.inspector.relation")}
              </span>
            </div>
            <button
              onClick={() => selectEdge(null)}
              className="p-1.5 text-muted hover:text-fg hover:bg-element rounded-md transition-all"
            >
              <X size={14} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col p-5 gap-6">
            <div className="flex flex-col items-center gap-3 p-4 border border-border/60 bg-element/20 rounded-lg shadow-sm">
              <div className="flex items-center justify-center gap-2 w-full">
                <span className="text-xs text-fg font-bold truncate flex-1 text-right">{sourceNode?.name ?? "?"}</span>
                <div className="flex flex-col items-center shrink-0 px-2">
                  <span className="text-[10px] text-accent font-bold mb-1 uppercase tracking-wider">
                    {t(`world.graph.relationTypes.${selectedEdge.relation}`, { defaultValue: selectedEdge.relation })}
                  </span>
                  <div className="w-12 h-0.5 bg-accent/30 relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-1.5 h-1.5 border-t-2 border-r-2 border-accent/60 rotate-45" />
                  </div>
                </div>
                <span className="text-xs text-fg font-bold truncate flex-1 text-left">{targetNode?.name ?? "?"}</span>
              </div>
            </div>

            {editRelation === null ? (
              <button
                onClick={() => setEditState({ edgeId: selectedEdge.id, relation: selectedEdge.relation })}
                className="flex justify-center items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-element text-fg text-xs font-bold hover:bg-element-hover transition-all"
              >
                {t("world.graph.inspector.changeRelation")}
              </button>
            ) : (
              <div className="flex flex-col gap-3 p-4 bg-element/30 border border-border rounded-lg">
                <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider">
                  {t("world.graph.inspector.selectNewRelation")}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {RELATION_KINDS.map((kind) => (
                    <button
                      key={kind}
                      onClick={() =>
                        setEditState((previous) =>
                          previous
                            ? {
                                ...previous,
                                relation: kind,
                              }
                            : previous,
                        )
                      }
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border",
                        editRelation === kind
                          ? "bg-accent/10 border-accent/30 text-accent"
                          : "bg-transparent border-border text-muted hover:bg-element hover:text-fg",
                      )}
                    >
                      {t(`world.graph.relationTypes.${kind}`, { defaultValue: kind })}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void saveRelation()}
                    className="flex-1 bg-accent text-white text-xs font-bold py-2 rounded-md hover:bg-accent/90 transition-colors"
                  >
                    {t("world.graph.inspector.save")}
                  </button>
                  <button
                    onClick={() => setEditState(null)}
                    className="flex-1 bg-element text-fg text-xs font-medium py-2 rounded-md border border-border hover:bg-element-hover transition-colors"
                  >
                    {t("world.graph.inspector.cancel")}
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1" />

            <div className="border-t border-border/60 pt-4 mt-4">
              <button
                onClick={() => void handleDeleteRelation()}
                className="w-full flex justify-center items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive hover:text-white transition-all border border-destructive/20"
              >
                <Trash2 size={13} /> {t("world.graph.inspector.deleteRelation")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
