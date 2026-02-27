/**
 * WorldSidebar - 좌측 사이드바
 * 엔티티 타입/관계 필터 + 검색
 */

import { useCallback, useMemo } from "react";
import { Search } from "lucide-react";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import type { RelationKind } from "@shared/types";

import { NODE_COLORS } from "./CustomEntityNode";

const ENTITY_TYPES: { key: string; label: string }[] = [
  { key: "Character", label: "인물" },
  { key: "Faction", label: "세력" },
  { key: "Event", label: "사건" },
  { key: "Place", label: "장소" },
  { key: "Concept", label: "개념" },
  { key: "Rule", label: "규칙" },
  { key: "Item", label: "사물" },
  { key: "Term", label: "기타 용어" },
];

const RELATION_KINDS: { key: RelationKind; label: string }[] = [
  { key: "belongs_to", label: "소속" },
  { key: "enemy_of", label: "적대" },
  { key: "causes", label: "원인" },
  { key: "controls", label: "통제" },
  { key: "located_in", label: "위치" },
  { key: "violates", label: "위반" },
];

import { useFilteredGraph } from "@renderer/features/research/stores/worldBuildingStore";

export function WorldSidebar() {
  const { filter, setFilter, resetFilter, graphData, selectNode } = useWorldBuildingStore();
  const { nodes: filteredNodes } = useFilteredGraph();

  const nodeCount = useMemo(() => graphData?.nodes.length ?? 0, [graphData]);
  const edgeCount = useMemo(() => graphData?.edges.length ?? 0, [graphData]);

  const onSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setFilter({ searchQuery: e.target.value }),
    [setFilter],
  );

  const toggleEntityType = useCallback(
    (entityType: string) => {
      setFilter({
        entityTypes: filter.entityTypes.includes(entityType)
          ? filter.entityTypes.filter((t) => t !== entityType)
          : [...filter.entityTypes, entityType],
      });
    },
    [filter.entityTypes, setFilter],
  );

  const toggleRelationKind = useCallback(
    (kind: RelationKind) => {
      setFilter({
        relationKinds: filter.relationKinds.includes(kind)
          ? filter.relationKinds.filter((k) => k !== kind)
          : [...filter.relationKinds, kind],
      });
    },
    [filter.relationKinds, setFilter],
  );

  return (
    <div className="world-sidebar-root">
      {/* 요약 */}
      <div className="world-sidebar-summary">
        <span>{nodeCount} 엔티티</span>
        <span className="world-sidebar-dot">·</span>
        <span>{edgeCount} 관계</span>
      </div>

      {/* 검색 */}
      <div className="world-sidebar-search">
        <Search size={12} className="world-sidebar-search-icon" />
        <input
          type="text"
          placeholder="엔티티 검색..."
          value={filter.searchQuery}
          onChange={onSearchChange}
          className="world-sidebar-search-input"
        />
      </div>

      {/* 엔티티 타입 필터 */}
      <section className="world-sidebar-section">
        <h6 className="world-sidebar-label">엔티티 유형</h6>
        <div className="grid grid-cols-2 gap-1 mt-1">
          {ENTITY_TYPES.map(({ key, label }) => {
            const text = NODE_COLORS[key]?.text ?? NODE_COLORS["WorldEntity"].text;
            return (
              <label key={key} className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-element-hover transition-colors border border-transparent">
                <input
                  type="checkbox"
                  checked={filter.entityTypes.includes(key)}
                  onChange={() => toggleEntityType(key)}
                  className="accent-accent flex-shrink-0"
                />
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: text }}
                />
                <span className="text-[11px] text-fg font-medium truncate">{label}</span>
              </label>
            );
          })}
        </div>
      </section>

      {/* 관계 종류 필터 */}
      <section className="world-sidebar-section">
        <h6 className="world-sidebar-label">관계 종류</h6>
        {RELATION_KINDS.map(({ key, label }) => (
          <label key={key} className="world-sidebar-filter-row">
            <input
              type="checkbox"
              checked={filter.relationKinds.includes(key)}
              onChange={() => toggleRelationKind(key)}
              className="world-sidebar-checkbox"
            />
            <span className="world-sidebar-filter-label">{label}</span>
          </label>
        ))}
      </section>

      {/* 필터 초기화 */}
      <button
        type="button"
        onClick={resetFilter}
        className="world-sidebar-reset"
      >
        필터 초기화
      </button>

      {/* 엔티티 라이브러리 목록 */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col p-2 gap-1 border-t border-border mt-2 custom-scrollbar">
        <h6 className="text-[10px] font-semibold text-muted uppercase tracking-wider px-1 mb-1 mt-1 shrink-0">
          라이브러리 목록 ({filteredNodes.length})
        </h6>
        {filteredNodes.map((node) => {
          const displayType = node.subType ?? node.entityType;
          const bg = NODE_COLORS[displayType]?.bg ?? NODE_COLORS["WorldEntity"].bg;
          const text = NODE_COLORS[displayType]?.text ?? NODE_COLORS["WorldEntity"].text;
          const border = NODE_COLORS[displayType]?.border ?? NODE_COLORS["WorldEntity"].border;

          return (
            <div
              key={node.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/reactflow", JSON.stringify(node));
                e.dataTransfer.effectAllowed = "move";
              }}
              onClick={() => selectNode(node.id)}
              className="flex items-center justify-between p-1.5 rounded cursor-grab active:cursor-grabbing hover:shadow-sm transition-all text-[11px] border shrink-0"
              style={{ backgroundColor: bg, borderColor: border, color: text }}
            >
              <span className="truncate font-semibold flex-1 pr-2">{node.name}</span>
              <span className="text-[9px] opacity-70 border border-current px-1 rounded whitespace-nowrap shrink-0">
                {ENTITY_TYPES.find((t) => t.key === displayType)?.label ?? displayType}
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        .world-sidebar-root {
          display: flex;
          flex-direction: column;
          gap: 0;
          padding: 10px 8px;
          height: 100%;
          font-family: var(--font-sans, sans-serif);
        }
        .world-sidebar-summary {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: var(--muted);
          padding: 0 2px 8px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 8px;
        }
        .world-sidebar-dot { opacity: 0.4; }

        .world-sidebar-search {
          position: relative;
          margin-bottom: 10px;
        }
        .world-sidebar-search-icon {
          position: absolute;
          left: 8px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--muted);
        }
        .world-sidebar-search-input {
          width: 100%;
          padding: 5px 8px 5px 26px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--element);
          color: var(--fg);
          font-size: 11px;
          outline: none;
          box-sizing: border-box;
        }
        .world-sidebar-search-input:focus {
          border-color: var(--accent);
        }

        .world-sidebar-section {
          margin-bottom: 12px;
        }
        .world-sidebar-label {
          font-size: 10px;
          font-weight: 600;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin: 0 0 6px;
        }
        .world-sidebar-filter-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 3px 4px;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.1s;
        }
        .world-sidebar-filter-row:hover {
          background: var(--element-hover);
        }
        .world-sidebar-checkbox {
          accent-color: var(--accent);
          width: 12px;
          height: 12px;
          cursor: pointer;
        }
        .world-sidebar-filter-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .world-sidebar-filter-label {
          font-size: 11px;
          color: var(--fg);
        }

        .world-sidebar-reset {
          margin-top: auto;
          padding: 5px 10px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted);
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s;
          width: 100%;
        }
        .world-sidebar-reset:hover {
          background: var(--element-hover);
          color: var(--fg);
        }
      `}</style>
    </div>
  );
}
