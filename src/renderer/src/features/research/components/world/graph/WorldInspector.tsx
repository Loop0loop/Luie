/**
 * WorldInspector - 우측 인스펙터
 * 선택된 노드(엔티티) 또는 엣지(관계)의 상세 정보 및 편집
 */

import { useMemo, useCallback, useState } from "react";
import { X, Link, Trash2 } from "lucide-react";
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

    // 노드 편집 상태
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [isEditingNode, setIsEditingNode] = useState(false);

    const startEditNode = useCallback(() => {
        if (!selectedNode) return;
        setEditName(selectedNode.name);
        setEditDesc(selectedNode.description ?? "");
        setIsEditingNode(true);
    }, [selectedNode]);

    const saveNode = useCallback(async () => {
        if (!selectedNode) return;
        await updateWorldEntity({
            id: selectedNode.id,
            name: editName,
            description: editDesc,
        });
        setIsEditingNode(false);
    }, [selectedNode, editName, editDesc, updateWorldEntity]);

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
            <div className="world-inspector-empty">
                <Link size={20} className="world-inspector-empty-icon" />
                <p>노드나 관계를 클릭하면<br />세부 정보가 표시됩니다.</p>
            </div>
        );
    }

    return (
        <div className="world-inspector-root">
            {/* 노드 인스펙터 */}
            {selectedNode && (
                <>
                    <header className="world-inspector-header">
                        <span className="world-inspector-type">{selectedNode.subType ?? selectedNode.entityType}</span>
                        <button
                            type="button"
                            onClick={() => selectNode(null)}
                            className="world-inspector-close"
                            aria-label="닫기"
                        >
                            <X size={12} />
                        </button>
                    </header>

                    {!isEditingNode ? (
                        <div className="world-inspector-body">
                            <h3 className="world-inspector-name">{selectedNode.name}</h3>
                            {selectedNode.description && (
                                <p className="world-inspector-desc">{selectedNode.description}</p>
                            )}
                            {selectedNode.attributes?.importance && (
                                <div className="world-inspector-attr">
                                    <span className="world-inspector-attr-label">중요도</span>
                                    <span className="world-inspector-attr-value">
                                        {"★".repeat(selectedNode.attributes.importance as number)}
                                    </span>
                                </div>
                            )}
                            {selectedNode.attributes?.time && (
                                <div className="world-inspector-attr">
                                    <span className="world-inspector-attr-label">시간</span>
                                    <span className="world-inspector-attr-value">{selectedNode.attributes.time as string}</span>
                                </div>
                            )}
                            {selectedNode.attributes?.region && (
                                <div className="world-inspector-attr">
                                    <span className="world-inspector-attr-label">지역</span>
                                    <span className="world-inspector-attr-value">{selectedNode.attributes.region as string}</span>
                                </div>
                            )}
                            <div className="world-inspector-actions">
                                <button
                                    type="button"
                                    onClick={startEditNode}
                                    className="world-inspector-btn world-inspector-btn-primary"
                                >
                                    편집
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleDeleteNode()}
                                    className="world-inspector-btn world-inspector-btn-danger"
                                >
                                    <Trash2 size={11} /> 삭제
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="world-inspector-body">
                            <label className="world-inspector-field-label">이름</label>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="world-inspector-input"
                            />
                            <label className="world-inspector-field-label">설명</label>
                            <textarea
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="world-inspector-textarea"
                                rows={4}
                            />
                            <div className="world-inspector-actions">
                                <button
                                    type="button"
                                    onClick={() => void saveNode()}
                                    className="world-inspector-btn world-inspector-btn-primary"
                                >
                                    저장
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditingNode(false)}
                                    className="world-inspector-btn"
                                >
                                    취소
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* 엣지 인스펙터 */}
            {selectedEdge && (
                <>
                    <header className="world-inspector-header">
                        <span className="world-inspector-type">관계</span>
                        <button
                            type="button"
                            onClick={() => selectEdge(null)}
                            className="world-inspector-close"
                            aria-label="닫기"
                        >
                            <X size={12} />
                        </button>
                    </header>

                    <div className="world-inspector-body">
                        <div className="world-inspector-relation-summary">
                            <span className="world-inspector-relation-node">{sourceNode?.name ?? "?"}</span>
                            <span className="world-inspector-relation-arrow">→</span>
                            <span className="world-inspector-relation-badge">
                                {RELATION_LABELS[selectedEdge.relation]}
                            </span>
                            <span className="world-inspector-relation-arrow">→</span>
                            <span className="world-inspector-relation-node">{targetNode?.name ?? "?"}</span>
                        </div>

                        {/* 관계 변경 */}
                        {editRelation === null ? (
                            <button
                                type="button"
                                onClick={() => setEditRelation(selectedEdge.relation)}
                                className="world-inspector-btn world-inspector-btn-primary"
                                style={{ width: "100%", marginTop: 8 }}
                            >
                                관계 변경
                            </button>
                        ) : (
                            <div className="world-inspector-relation-edit">
                                <select
                                    value={editRelation}
                                    onChange={(e) => setEditRelation(e.target.value as RelationKind)}
                                    className="world-inspector-select"
                                >
                                    {RELATION_KINDS.map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                                <div className="world-inspector-actions" style={{ marginTop: 6 }}>
                                    <button
                                        type="button"
                                        onClick={() => void saveRelation()}
                                        className="world-inspector-btn world-inspector-btn-primary"
                                    >
                                        저장
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditRelation(null)}
                                        className="world-inspector-btn"
                                    >
                                        취소
                                    </button>
                                </div>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => void handleDeleteRelation()}
                            className="world-inspector-btn world-inspector-btn-danger"
                            style={{ width: "100%", marginTop: 4 }}
                        >
                            <Trash2 size={11} /> 관계 삭제
                        </button>
                    </div>
                </>
            )}

            <style>{`
        .world-inspector-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 10px;
          color: var(--muted);
          font-size: 11px;
          text-align: center;
          padding: 20px;
          line-height: 1.5;
        }
        .world-inspector-empty-icon { opacity: 0.3; }

        .world-inspector-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          font-family: var(--font-sans, sans-serif);
          font-size: 12px;
        }
        .world-inspector-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .world-inspector-type {
          font-size: 10px;
          font-weight: 600;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .world-inspector-close {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--muted);
          padding: 2px;
          border-radius: 3px;
          display: flex;
          align-items: center;
        }
        .world-inspector-close:hover { background: var(--element-hover); color: var(--fg); }

        .world-inspector-body {
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
          flex: 1;
        }
        .world-inspector-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--fg);
          margin: 0;
          line-height: 1.3;
        }
        .world-inspector-desc {
          font-size: 11px;
          color: var(--muted);
          margin: 0;
          line-height: 1.5;
        }
        .world-inspector-attr {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 6px;
          background: var(--element);
          border-radius: 5px;
        }
        .world-inspector-attr-label { font-size: 10px; color: var(--muted); }
        .world-inspector-attr-value { font-size: 11px; color: var(--fg); font-weight: 500; }

        .world-inspector-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .world-inspector-btn {
          padding: 4px 10px;
          border-radius: 5px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--fg);
          font-size: 11px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.15s;
          flex: 1;
          justify-content: center;
        }
        .world-inspector-btn:hover { background: var(--element-hover); }
        .world-inspector-btn-primary {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }
        .world-inspector-btn-primary:hover { opacity: 0.85; }
        .world-inspector-btn-danger {
          color: var(--destructive, #ef4444);
          border-color: var(--destructive, #ef4444);
        }
        .world-inspector-btn-danger:hover { background: color-mix(in srgb, #ef4444 12%, transparent); }

        .world-inspector-field-label {
          font-size: 10px;
          font-weight: 600;
          color: var(--muted);
          display: block;
        }
        .world-inspector-input,
        .world-inspector-select {
          width: 100%;
          padding: 5px 8px;
          border-radius: 5px;
          border: 1px solid var(--border);
          background: var(--element);
          color: var(--fg);
          font-size: 11px;
          outline: none;
          box-sizing: border-box;
        }
        .world-inspector-input:focus,
        .world-inspector-select:focus { border-color: var(--accent); }
        .world-inspector-textarea {
          width: 100%;
          padding: 5px 8px;
          border-radius: 5px;
          border: 1px solid var(--border);
          background: var(--element);
          color: var(--fg);
          font-size: 11px;
          resize: vertical;
          outline: none;
          box-sizing: border-box;
          font-family: inherit;
        }
        .world-inspector-textarea:focus { border-color: var(--accent); }

        .world-inspector-relation-summary {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
          background: var(--element);
          padding: 6px 8px;
          border-radius: 6px;
        }
        .world-inspector-relation-node {
          font-size: 11px;
          color: var(--fg);
          font-weight: 500;
        }
        .world-inspector-relation-arrow { color: var(--muted); font-size: 10px; }
        .world-inspector-relation-badge {
          padding: 1px 6px;
          border-radius: 10px;
          background: color-mix(in srgb, var(--accent) 20%, transparent);
          color: var(--accent);
          font-size: 10px;
          font-weight: 600;
        }
        .world-inspector-relation-edit {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
      `}</style>
        </div>
    );
}
