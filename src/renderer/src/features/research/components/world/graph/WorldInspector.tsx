import { useMemo, useCallback, useState, useEffect } from "react";
import { X, Link as LinkIcon, Trash2, Tag, MapPin, Clock, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import type { RelationKind } from "@shared/types";

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
    const {
        graphData,
        selectedNodeId,
        selectedEdgeId,
        selectNode,
        selectEdge,
        updateWorldEntity,
        deleteWorldEntity,
        updateRelation,
        deleteRelation,
    } = useWorldBuildingStore();

    const selectedNode = useMemo(
        () => (selectedNodeId ? graphData?.nodes.find((n) => n.id === selectedNodeId) : null),
        [graphData, selectedNodeId],
    );

    const selectedEdge = useMemo(
        () => (selectedEdgeId ? graphData?.edges.find((e) => e.id === selectedEdgeId) : null),
        [graphData, selectedEdgeId],
    );

    const sourceNode = useMemo(
        () => (selectedEdge ? graphData?.nodes.find((n) => n.id === selectedEdge.sourceId) : null),
        [graphData, selectedEdge],
    );

    const targetNode = useMemo(
        () => (selectedEdge ? graphData?.nodes.find((n) => n.id === selectedEdge.targetId) : null),
        [graphData, selectedEdge],
    );

    // 노드 로컬 편집 상태 (Notion-like 인라인 에디팅)
    const [localNode, setLocalNode] = useState<{
        name: string;
        description: string;
        time: string;
        region: string;
        tags: string;
        importance: number;
    }>({ name: "", description: "", time: "", region: "", tags: "", importance: 3 });

    // 선택 노드 변경 시 로컬 상태 동기화
    useEffect(() => {
        if (selectedNode) {
            setLocalNode({
                name: selectedNode.name,
                description: selectedNode.description ?? "",
                time: (selectedNode.attributes?.time as string) ?? "",
                region: (selectedNode.attributes?.region as string) ?? "",
                tags: Array.isArray(selectedNode.attributes?.tags)
                    ? selectedNode.attributes.tags.join(", ")
                    : (((selectedNode.attributes?.tags as unknown) as string) ?? ""),
                importance: (selectedNode.attributes?.importance as number) ?? 3,
            });
        }
    }, [selectedNode]);

    // 필드 변경 핸들러
    const handleChange = (field: keyof typeof localNode, value: string | number) => {
        setLocalNode((prev) => ({ ...prev, [field]: value }));
    };

    // 포커스 아웃 (onBlur) 시 자동 저장
    const handleBlur = useCallback(async () => {
        if (!selectedNode) return;
        const currentAttrs = selectedNode.attributes ?? {};

        await updateWorldEntity({
            id: selectedNode.id,
            name: localNode.name || t("world.graph.inspector.untitled"),
            description: localNode.description,
            attributes: {
                ...currentAttrs,
                time: localNode.time,
                region: localNode.region,
                tags: localNode.tags.split(",").map(t => t.trim()).filter(Boolean),
                importance: localNode.importance as 1 | 2 | 3 | 4 | 5 | undefined,
            },
        });
    }, [selectedNode, localNode, updateWorldEntity]);

    const handleDeleteNode = useCallback(async () => {
        if (!selectedNode) return;
        if (!window.confirm(t("world.graph.inspector.deleteNodeConfirm", { name: selectedNode.name }))) return;
        await deleteWorldEntity(selectedNode.id);
    }, [selectedNode, deleteWorldEntity, t]);

    // 관계 편집
    const [editRelation, setEditRelation] = useState<RelationKind | null>(null);

    const saveRelation = useCallback(async () => {
        if (!selectedEdge || !editRelation) return;
        await updateRelation({ id: selectedEdge.id, relation: editRelation });
        setEditRelation(null);
    }, [selectedEdge, editRelation, updateRelation]);

    const handleDeleteRelation = useCallback(async () => {
        if (!selectedEdge) return;
        await deleteRelation(selectedEdge.id);
        selectEdge(null);
    }, [selectedEdge, deleteRelation, selectEdge]);

    if (!selectedNode && !selectedEdge) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted text-xs text-center p-5">
                <LinkIcon size={24} className="opacity-30" />
                <p className="whitespace-pre-line">{t("world.graph.inspector.emptySelection")}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-sidebar/40 backdrop-blur-3xl border-l border-border/40 font-sans shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.1)]">
            {/* 노드 인스펙터 */}
            {selectedNode && (
                <>
                    <header className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0 bg-sidebar/60">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-accent/60 shadow-sm" />
                            <span className="text-[10px] font-bold text-muted uppercase tracking-[0.1em]">
                                {t(`world.graph.entityTypes.${selectedNode.subType ?? selectedNode.entityType}`, {
                                    defaultValue: selectedNode.subType ?? selectedNode.entityType
                                })}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => void handleDeleteNode()} className="p-1.5 text-muted hover:text-white hover:bg-destructive rounded-md transition-all shadow-sm border border-transparent hover:border-destructive/50" title="노드 삭제">
                                <Trash2 size={13} />
                            </button>
                            <button onClick={() => selectNode(null)} className="p-1.5 text-muted hover:text-fg hover:bg-element-hover rounded-md transition-all border border-transparent hover:border-border/60" title="닫기">
                                <X size={14} />
                            </button>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                        <div className="p-5 flex flex-col gap-6">
                            {/* Title (Header) */}
                            <div className="flex flex-col">
                                <input
                                    className="text-[22px] font-bold text-fg border-none bg-transparent outline-none w-full p-1 -ml-1 rounded-md hover:bg-element-hover focus:bg-element-hover focus:ring-1 focus:ring-accent/30 transition-all placeholder:text-muted/40"
                                    value={localNode.name}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                    onBlur={handleBlur}
                                    placeholder={t("world.graph.inspector.untitled")}
                                />
                            </div>

                            {/* Attributes Grid (Notion-like Properties) */}
                            <div className="flex flex-col gap-1.5 bg-element/30 rounded-lg p-2 border border-border/40">

                                {/* Time */}
                                <div className="group flex items-center min-h-[30px] rounded-md hover:bg-element-hover transition-colors px-1">
                                    <div className="w-[100px] text-[11px] text-muted flex items-center gap-2 font-medium shrink-0">
                                        <Clock size={13} className="text-muted/70 group-hover:text-muted transition-colors" /> {t("world.graph.inspector.attributes.time")}
                                    </div>
                                    <input className="flex-1 text-xs text-fg border-none bg-transparent outline-none px-2 py-1 rounded-sm focus:bg-element focus:ring-1 focus:ring-accent/40 min-w-0 transition-all placeholder:text-muted/30" value={localNode.time} onChange={(e) => handleChange("time", e.target.value)} onBlur={handleBlur} placeholder={t("world.graph.inspector.empty")} />
                                </div>

                                {/* Region */}
                                <div className="group flex items-center min-h-[30px] rounded-md hover:bg-element-hover transition-colors px-1">
                                    <div className="w-[100px] text-[11px] text-muted flex items-center gap-2 font-medium shrink-0">
                                        <MapPin size={13} className="text-muted/70 group-hover:text-muted transition-colors" /> {t("world.graph.inspector.attributes.region")}
                                    </div>
                                    <input className="flex-1 text-xs text-fg border-none bg-transparent outline-none px-2 py-1 rounded-sm focus:bg-element focus:ring-1 focus:ring-accent/40 min-w-0 transition-all placeholder:text-muted/30" value={localNode.region} onChange={(e) => handleChange("region", e.target.value)} onBlur={handleBlur} placeholder={t("world.graph.inspector.empty")} />
                                </div>

                                {/* Tags */}
                                <div className="group flex items-center min-h-[30px] rounded-md hover:bg-element-hover transition-colors px-1">
                                    <div className="w-[100px] text-[11px] text-muted flex items-center gap-2 font-medium shrink-0">
                                        <Tag size={13} className="text-muted/70 group-hover:text-muted transition-colors" /> {t("world.graph.inspector.attributes.tags")}
                                    </div>
                                    <input className="flex-1 text-xs text-fg border-none bg-transparent outline-none px-2 py-1 rounded-sm focus:bg-element focus:ring-1 focus:ring-accent/40 min-w-0 transition-all placeholder:text-muted/30" value={localNode.tags} onChange={(e) => handleChange("tags", e.target.value)} onBlur={handleBlur} placeholder={t("world.graph.inspector.tagsPlaceholder")} />
                                </div>

                                {/* Importance */}
                                <div className="group flex items-center min-h-[30px] rounded-md hover:bg-element-hover transition-colors px-1">
                                    <div className="w-[100px] text-[11px] text-muted flex items-center gap-2 font-medium shrink-0">
                                        <Star size={13} className="text-muted/70 group-hover:text-accent transition-colors" /> {t("world.graph.inspector.attributes.importance")}
                                    </div>
                                    <div className="flex-1 relative flex items-center">
                                        <select className="w-full text-xs text-accent border-none bg-transparent outline-none px-2 py-1 rounded-sm focus:bg-element focus:ring-1 focus:ring-accent/40 min-w-0 transition-all cursor-pointer appearance-none font-bold" value={localNode.importance} onChange={(e) => { handleChange("importance", Number(e.target.value)); void setTimeout(handleBlur, 0); }}>
                                            {[1, 2, 3, 4, 5].map(v => <option key={v} value={v} className="text-fg bg-app">{"★".repeat(v)}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Description (Body Editor) */}
                            <div className="flex flex-col flex-1 mt-2 mb-2">
                                <textarea
                                    className="w-full h-[200px] border-none bg-transparent text-fg text-xs leading-relaxed outline-none resize-none p-2 rounded-md hover:bg-element/50 focus:bg-element/80 transition-all custom-scrollbar placeholder:text-muted/40"
                                    value={localNode.description}
                                    onChange={(e) => handleChange("description", e.target.value)}
                                    onBlur={handleBlur}
                                    placeholder={t("world.graph.inspector.descriptionPlaceholder")}
                                />
                            </div>

                            {/* Mentions (원고 내 등장) */}
                            <div className="flex flex-col gap-2 pt-4 border-t border-border/40">
                                <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                                    <Star size={12} className="text-accent" /> {t("world.graph.inspector.mentions", { defaultValue: "원고 출현 (Mentions)" })}
                                </h4>
                                <button className="text-xs text-muted/70 flex items-center justify-between p-2.5 bg-element/30 rounded-lg border border-border/40 cursor-pointer hover:bg-element hover:text-fg hover:border-accent/40 transition-all text-left group">
                                    <span className="flex-1 truncate font-medium">제1장. 어둠 속의 조우</span>
                                    <span className="shrink-0 font-bold ml-2 text-[10px] text-accent opacity-0 group-hover:opacity-100 transition-opacity">이동 →</span>
                                </button>
                                <button className="text-xs text-muted/70 flex items-center justify-between p-2.5 bg-element/30 rounded-lg border border-border/40 cursor-pointer hover:bg-element hover:text-fg hover:border-accent/40 transition-all text-left group">
                                    <span className="flex-1 truncate font-medium">제3장. 드러난 진실</span>
                                    <span className="shrink-0 font-bold ml-2 text-[10px] text-accent opacity-0 group-hover:opacity-100 transition-opacity">이동 →</span>
                                </button>
                                <p className="text-[10px] text-muted/50 text-center mt-1 px-2 leading-relaxed">
                                    문서 에디터 연동 준비 상태입니다.<br />클릭 시 해당 원고의 언급 위치로 점프합니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* 엣지 인스펙터 */}
            {selectedEdge && (
                <>
                    <header className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0 bg-sidebar/60">
                        <div className="flex items-center gap-2">
                            <LinkIcon size={12} className="text-accent" />
                            <span className="text-[10px] font-bold text-muted uppercase tracking-[0.1em]">{t("world.graph.inspector.relation")}</span>
                        </div>
                        <button onClick={() => selectEdge(null)} className="p-1.5 text-muted hover:text-fg hover:bg-element-hover rounded-md transition-all border border-transparent hover:border-border/60" title="닫기">
                            <X size={14} />
                        </button>
                    </header>

                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col p-5 gap-6">

                        {/* 관계 요약 표시 */}
                        <div className="flex flex-col items-center gap-3 p-4 border border-border/40 bg-element/30 rounded-lg shadow-sm">
                            <div className="flex items-center justify-center gap-2 w-full">
                                <span className="text-xs text-fg font-bold truncate flex-1 text-right">{sourceNode?.name ?? "?"}</span>
                                <div className="flex flex-col items-center shrink-0 px-2 animate-pulse-slow">
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

                        {/* 편집 모드 */}
                        {editRelation === null ? (
                            <button onClick={() => setEditRelation(selectedEdge.relation)} className="flex justify-center items-center gap-1.5 px-4 py-2 mt-2 rounded-lg border border-border/60 bg-element text-fg text-xs font-bold shadow-sm hover:shadow hover:-translate-y-0.5 transition-all">
                                {t("world.graph.inspector.changeRelation")}
                            </button>
                        ) : (
                            <div className="flex flex-col gap-3 p-4 bg-element/50 border border-border/60 rounded-lg">
                                <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">{t("world.graph.inspector.selectNewRelation")}</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {RELATION_KINDS.map((kind) => (
                                        <button
                                            key={kind}
                                            onClick={() => setEditRelation(kind)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border",
                                                editRelation === kind
                                                    ? "bg-accent/10 border-accent/30 text-accent shadow-sm"
                                                    : "bg-transparent border-border/40 text-muted hover:bg-element hover:text-fg"
                                            )}
                                        >
                                            {t(`world.graph.relationTypes.${kind}`, { defaultValue: kind })}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <button onClick={() => void saveRelation()} className="flex-1 bg-accent text-white text-xs font-bold py-2 rounded-md hover:bg-accent/90 transition-colors shadow-sm">{t("world.graph.inspector.save")}</button>
                                    <button onClick={() => setEditRelation(null)} className="flex-1 bg-element text-fg text-xs font-medium py-2 rounded-md border border-border/60 hover:bg-element-hover transition-colors">{t("world.graph.inspector.cancel")}</button>
                                </div>
                            </div>
                        )}

                        <div className="flex-1" />

                        {/* 삭제 영역 하단 고정 */}
                        <div className="border-t border-border/40 pt-4 mt-4">
                            <button onClick={() => void handleDeleteRelation()} className="w-full flex justify-center items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive hover:text-white transition-all border border-destructive/20 hover:border-destructive shadow-sm">
                                <Trash2 size={13} /> {t("world.graph.inspector.deleteRelation")}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
