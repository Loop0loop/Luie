/**
 * WorldGraphPanel - 세계관 3패널 레이아웃
 * ├── 좌측: WorldSidebar (검색/필터)
 * ├── 중앙: WorldGraphCanvas (React Flow)
 * └── 우측: WorldInspector (선택된 노드/엣지 상세)
 */

import { useEffect, useCallback, useMemo } from "react";
import { useWorldBuildingStore, useFilteredGraph, type WorldViewMode } from "@renderer/features/research/stores/worldBuildingStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { WorldGraphCanvas } from "./WorldGraphCanvas";
import { WorldSidebar } from "./WorldSidebar";
import { WorldInspector } from "./WorldInspector";

export function WorldGraphPanel() {
    const currentProject = useProjectStore((s) => s.currentProject);
    const {
        loadGraph,
        isLoading,
        error,
        viewMode,
        setViewMode,
        suggestedMode,
        dismissSuggestion,
    } = useWorldBuildingStore();

    const filteredGraph = useFilteredGraph();

    // 프로젝트 변경 시 그래프 로드
    useEffect(() => {
        if (currentProject?.id) {
            void loadGraph(currentProject.id);
        }
    }, [currentProject?.id, loadGraph]);

    const handleModeChange = useCallback(
        (mode: WorldViewMode) => setViewMode(mode),
        [setViewMode],
    );

    const modeLabels: Record<WorldViewMode, string> = useMemo(
        () => ({
            standard: "표준",
            protagonist: "주인공 중심",
            "event-chain": "사건 중심",
            freeform: "자유형",
        }),
        [],
    );

    return (
        <div className="world-graph-root">
            {/* 뷰 모드 바 */}
            <header className="world-graph-modebar">
                {(["standard", "protagonist", "event-chain", "freeform"] as WorldViewMode[]).map((mode) => (
                    <button
                        key={mode}
                        className={`world-graph-mode-btn${viewMode === mode ? " active" : ""}`}
                        onClick={() => handleModeChange(mode)}
                        type="button"
                    >
                        {modeLabels[mode]}
                    </button>
                ))}

                {/* 시스템 제안 배너 */}
                {suggestedMode && (
                    <div className="world-graph-suggestion">
                        <span>
                            {modeLabels[suggestedMode]} 모드로 전환할까요?
                        </span>
                        <button
                            type="button"
                            onClick={() => setViewMode(suggestedMode)}
                            className="world-graph-suggestion-accept"
                        >
                            전환
                        </button>
                        <button
                            type="button"
                            onClick={dismissSuggestion}
                            className="world-graph-suggestion-dismiss"
                        >
                            ✕
                        </button>
                    </div>
                )}
            </header>

            {/* 3패널 레이아웃 */}
            <div className="world-graph-panels">
                {/* 좌측 사이드바 */}
                <aside className="world-graph-sidebar">
                    <WorldSidebar />
                </aside>

                {/* 중앙 캔버스 */}
                <main className="world-graph-canvas-area">
                    {isLoading && (
                        <div className="world-graph-overlay">
                            <span className="world-graph-spinner" />
                            <p>그래프 로딩 중...</p>
                        </div>
                    )}
                    {error && !isLoading && (
                        <div className="world-graph-overlay world-graph-error">
                            <p>오류: {error}</p>
                        </div>
                    )}
                    {!isLoading && !error && (
                        <WorldGraphCanvas nodes={filteredGraph.nodes} edges={filteredGraph.edges} viewMode={viewMode} />
                    )}
                </main>

                {/* 우측 인스펙터 */}
                <aside className="world-graph-inspector">
                    <WorldInspector />
                </aside>
            </div>

            <style>{`
        .world-graph-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--sidebar);
          overflow: hidden;
        }

        /* 모드 바 */
        .world-graph-modebar {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 6px 8px;
          background: var(--sidebar);
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
          flex-wrap: wrap;
        }
        .world-graph-mode-btn {
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          background: transparent;
          border: 1px solid transparent;
          color: var(--muted);
          transition: all 0.15s ease;
        }
        .world-graph-mode-btn:hover {
          background: var(--element-hover);
          color: var(--fg);
        }
        .world-graph-mode-btn.active {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }

        /* 제안 배너 */
        .world-graph-suggestion {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-left: auto;
          padding: 3px 8px;
          background: color-mix(in srgb, var(--accent) 15%, transparent);
          border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
          border-radius: 6px;
          font-size: 11px;
          color: var(--fg);
        }
        .world-graph-suggestion-accept {
          padding: 1px 8px;
          border-radius: 4px;
          background: var(--accent);
          color: #fff;
          font-size: 11px;
          border: none;
          cursor: pointer;
        }
        .world-graph-suggestion-dismiss {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--muted);
          font-size: 11px;
          padding: 0;
        }

        /* 3패널 */
        .world-graph-panels {
          display: flex;
          flex: 1;
          overflow: hidden;
          min-height: 0;
        }
        .world-graph-sidebar {
          width: 200px;
          flex-shrink: 0;
          border-right: 1px solid var(--border);
          overflow-y: auto;
          background: var(--sidebar);
        }
        .world-graph-canvas-area {
          flex: 1;
          position: relative;
          overflow: hidden;
        }
        .world-graph-inspector {
          width: 220px;
          flex-shrink: 0;
          border-left: 1px solid var(--border);
          overflow-y: auto;
          background: var(--sidebar);
        }

        /* 오버레이 */
        .world-graph-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: var(--muted);
          font-size: 13px;
          z-index: 10;
        }
        .world-graph-error {
          color: var(--destructive, #ef4444);
        }
        .world-graph-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: wg-spin 0.8s linear infinite;
        }
        @keyframes wg-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
