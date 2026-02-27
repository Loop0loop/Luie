import { useMemo, useCallback, useState, useEffect } from "react";
import { X, Link, Trash2, Tag, MapPin, Clock, Star } from "lucide-react";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import type { RelationKind } from "@shared/types";

const RELATION_LABELS: Record<RelationKind, string> = {
    belongs_to: "소속",
    enemy_of: "적대",
    causes: "원인",
    controls: "통제",
    located_in: "위치",
    violates: "위반",
};

const RELATION_KINDS = Object.entries(RELATION_LABELS) as [RelationKind, string][];

export function WorldInspector() {
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
                tags: (selectedNode.attributes?.tags as string) ?? "",
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
        // 값이 같으면 저장 생략 (선택적 최적화 가능)
        
        await updateWorldEntity({
            id: selectedNode.id,
            name: localNode.name || "제목 없음",
            description: localNode.description,
            attributes: {
                ...currentAttrs,
                time: localNode.time,
                region: localNode.region,
                tags: localNode.tags,
                importance: localNode.importance,
            },
        });
    }, [selectedNode, localNode, updateWorldEntity]);

    const handleDeleteNode = useCallback(async () => {
        if (!selectedNode) return;
        if (!window.confirm(`"${selectedNode.name}"을 삭제할까요?`)) return;
        await deleteWorldEntity(selectedNode.id);
    }, [selectedNode, deleteWorldEntity]);

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
            <div className="inspector-empty">
                <Link size={24} className="inspector-empty-icon" />
                <p>노드나 관계를 클릭하면<br />세부 정보가 표시됩니다.</p>
            </div>
        );
    }

    return (
        <div className="inspector-root">
            {/* 노드 인스펙터 */}
            {selectedNode && (
                <>
                    <header className="inspector-header">
                        <span className="inspector-type">{selectedNode.subType ?? selectedNode.entityType}</span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => void handleDeleteNode()} className="inspector-icon-btn text-destructive" title="삭제"><Trash2 size={13} /></button>
                            <button onClick={() => selectNode(null)} className="inspector-icon-btn" title="닫기"><X size={14} /></button>
                        </div>
                    </header>

                    <div className="inspector-body notion-like">
                        {/* Title */}
                        <input 
                            className="notion-title"
                            value={localNode.name}
                            onChange={(e) => handleChange("name", e.target.value)}
                            onBlur={handleBlur}
                            placeholder="이름 (제목)"
                        />

                        {/* Attributes (Properties) */}
                        <div className="notion-properties">
                            <div className="notion-prop-row">
                                <div className="notion-prop-label"><Clock size={12}/> 시간</div>
                                <input className="notion-prop-input" value={localNode.time} onChange={(e) => handleChange("time", e.target.value)} onBlur={handleBlur} placeholder="비어 있음" />
                            </div>
                            <div className="notion-prop-row">
                                <div className="notion-prop-label"><MapPin size={12}/> 지역</div>
                                <input className="notion-prop-input" value={localNode.region} onChange={(e) => handleChange("region", e.target.value)} onBlur={handleBlur} placeholder="비어 있음" />
                            </div>
                            <div className="notion-prop-row">
                                <div className="notion-prop-label"><Tag size={12}/> 태그</div>
                                <input className="notion-prop-input" value={localNode.tags} onChange={(e) => handleChange("tags", e.target.value)} onBlur={handleBlur} placeholder="쉼표로 구분" />
                            </div>
                            <div className="notion-prop-row">
                                <div className="notion-prop-label"><Star size={12}/> 중요도</div>
                                <select className="notion-prop-select" value={localNode.importance} onChange={(e) => { handleChange("importance", Number(e.target.value)); setTimeout(handleBlur, 0); }}>
                                    {[1,2,3,4,5].map(v => <option key={v} value={v}>{"★".repeat(v)}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Description (Body) */}
                        <div className="notion-desc-container">
                            <textarea
                                className="notion-textarea custom-scrollbar"
                                value={localNode.description}
                                onChange={(e) => handleChange("description", e.target.value)}
                                onBlur={handleBlur}
                                placeholder="설명을 입력하세요..."
                                rows={10}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* 엣지 인스펙터 */}
            {selectedEdge && (
                <>
                    <header className="inspector-header">
                        <span className="inspector-type">관계 (엣지)</span>
                        <button onClick={() => selectEdge(null)} className="inspector-icon-btn"><X size={14} /></button>
                    </header>

                    <div className="inspector-body">
                        <div className="edge-summary">
                            <span className="edge-node">{sourceNode?.name ?? "?"}</span>
                            <span className="edge-arrow">→</span>
                            <span className="edge-badge">{RELATION_LABELS[selectedEdge.relation]}</span>
                            <span className="edge-arrow">→</span>
                            <span className="edge-node">{targetNode?.name ?? "?"}</span>
                        </div>

                        {editRelation === null ? (
                            <button onClick={() => setEditRelation(selectedEdge.relation)} className="notion-btn mt-2">유형 변경</button>
                        ) : (
                            <div className="flex flex-col gap-2 mt-2">
                                <select value={editRelation} onChange={(e) => setEditRelation(e.target.value as RelationKind)} className="notion-select">
                                    {RELATION_KINDS.map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                                <div className="flex gap-2">
                                    <button onClick={() => void saveRelation()} className="notion-btn primary flex-1">저장</button>
                                    <button onClick={() => setEditRelation(null)} className="notion-btn flex-1">취소</button>
                                </div>
                            </div>
                        )}

                        <button onClick={() => void handleDeleteRelation()} className="notion-btn danger mt-4"><Trash2 size={12}/> 관계 삭제</button>
                    </div>
                </>
            )}
        </div>
    );
}

            <style>{`
        .inspector-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;
          gap: 12px; color: var(--muted); font-size: 12px; text-align: center; padding: 20px;
        }
        .inspector-empty-icon { opacity: 0.3; }

        .inspector-root { display: flex; flex-direction: column; height: 100%; font-size: 13px; }
        .inspector-header {
          display: flex; align-items: center; justify-content: space-between; padding: 8px 12px;
          border-bottom: 1px solid var(--border); flex-shrink: 0;
        }
        .inspector-type { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
        .inspector-icon-btn {
          background: none; border: none; cursor: pointer; color: var(--muted); padding: 4px; border-radius: 4px;
        }
        .inspector-icon-btn:hover { background: var(--element-hover); color: var(--fg); }

        .inspector-body { padding: 16px 14px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; flex: 1; }
        
        /* Notion-like Styles */
        .notion-title {
          font-size: 20px; font-weight: 700; color: var(--fg); border: none; background: transparent; 
          outline: none; width: 100%; padding: 4px; margin-left: -4px; border-radius: 4px;
        }
        .notion-title:hover { background: var(--element-hover); }
        .notion-title:focus { background: transparent; }

        .notion-properties { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
        .notion-prop-row { display: flex; align-items: center; min-height: 28px; }
        .notion-prop-label { width: 90px; font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 6px; }
        .notion-prop-input, .notion-prop-select {
          flex: 1; border: none; background: transparent; color: var(--fg); font-size: 13px; padding: 4px 6px;
          border-radius: 4px; outline: none; min-width: 0;
        }
        .notion-prop-input:hover, .notion-prop-select:hover { background: var(--element-hover); }
        .notion-prop-input:focus, .notion-prop-select:focus { background: var(--element); outline: 1px solid var(--border); }
        .notion-prop-select { cursor: pointer; -webkit-appearance: none; appearance: none; }

        .notion-desc-container { flex: 1; display: flex; flex-direction: column; margin-top: 8px; }
        .notion-textarea {
          width: 100%; flex: 1; border: none; background: transparent; color: var(--fg); font-size: 14px; 
          line-height: 1.6; outline: none; resize: none; padding: 4px; margin-left: -4px; border-radius: 4px;
        }
        .notion-textarea:hover { background: var(--element-hover); }
        .notion-textarea:focus { background: transparent; }

        .edge-summary { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; background: var(--element); padding: 8px 10px; border-radius: 6px; }
        .edge-node { font-size: 12px; color: var(--fg); font-weight: 500; }
        .edge-arrow { color: var(--muted); font-size: 12px; }
        .edge-badge { padding: 2px 8px; border-radius: 12px; background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent); font-size: 11px; font-weight: 600; }
        
        .notion-btn {
          padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border); background: var(--element); 
          color: var(--fg); font-size: 12px; cursor: pointer; transition: all 0.1s; display: flex; justify-content: center; align-items: center; gap: 6px;
        }
        .notion-btn:hover { background: var(--element-hover); }
        .notion-btn.primary { background: var(--accent); color: white; border-color: var(--accent); }
        .notion-btn.primary:hover { opacity: 0.9; }
        .notion-btn.danger { color: var(--destructive); border-color: var(--destructive); }
        .notion-btn.danger:hover { background: color-mix(in srgb, var(--destructive) 10%, transparent); }
        .notion-select { padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border); background: var(--element); color: var(--fg); font-size: 12px; outline: none; }
      `}</style>
