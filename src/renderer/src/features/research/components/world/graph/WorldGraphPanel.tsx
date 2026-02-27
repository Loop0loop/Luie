/**
 * WorldGraphPanel - 세계관 3패널 레이아웃
 * ├── 좌측: WorldSidebar (검색/필터)
 * ├── 중앙: WorldGraphCanvas (React Flow)
 * └── 우측: WorldInspector (선택된 노드/엣지 상세)
 */

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useWorldBuildingStore, useFilteredGraph } from "@renderer/features/research/stores/worldBuildingStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { WorldGraphCanvas } from "./WorldGraphCanvas";
import { WorldSidebar } from "./WorldSidebar";
import { WorldInspector } from "./WorldInspector";

export function WorldGraphPanel() {
  const { t } = useTranslation();
  const currentProjectId = useProjectStore((s) => s.currentProject?.id);
  const loadGraph = useWorldBuildingStore((s) => s.loadGraph);
  const isLoading = useWorldBuildingStore((s) => s.isLoading);
  const error = useWorldBuildingStore((s) => s.error);
  const viewMode = useWorldBuildingStore((s) => s.viewMode);

  const filteredGraph = useFilteredGraph();
  const requestedProjectIdRef = useRef<string | null>(null);
  const loadGraphRef = useRef(loadGraph);

  useEffect(() => {
    loadGraphRef.current = loadGraph;
  }, [loadGraph]);

  // 프로젝트 변경 시 그래프 로드
  useEffect(() => {
    if (!currentProjectId) {
      requestedProjectIdRef.current = null;
      return;
    }

    if (requestedProjectIdRef.current === currentProjectId) {
      return;
    }

    requestedProjectIdRef.current = currentProjectId;
    void loadGraphRef.current(currentProjectId).catch(() => {
      if (requestedProjectIdRef.current === currentProjectId) {
        requestedProjectIdRef.current = null;
      }
    });
  }, [currentProjectId]);

  return (
    <div className="h-full overflow-hidden bg-sidebar">
      <div className="flex h-full min-h-0 overflow-hidden">
        <aside className="w-[220px] shrink-0 overflow-y-auto border-r border-border bg-sidebar">
          <WorldSidebar />
        </aside>

        <main className="relative min-w-0 flex-1 overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-sm text-muted">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
              <p>{t("world.graph.loading")}</p>
            </div>
          )}
          {error && !isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-destructive">
              <p>{t("world.graph.errorPrefix")}: {error}</p>
            </div>
          )}
          {!isLoading && !error && (
            <WorldGraphCanvas nodes={filteredGraph.nodes} edges={filteredGraph.edges} viewMode={viewMode} />
          )}
        </main>

        <aside className="w-[280px] shrink-0 overflow-y-auto border-l border-border bg-sidebar">
          <WorldInspector />
        </aside>
      </div>
    </div>
  );
}
