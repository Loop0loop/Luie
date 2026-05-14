import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ReactFlowProvider } from "reactflow";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { CanvasLayout } from "./layout/CanvasLayout";
import { CanvasSidebar } from "./sidebar/CanvasSidebar";
import { CanvasToolbar } from "./stage/CanvasToolbar";
import { CanvasStage } from "./stage/CanvasStage";
import { CanvasBinderBar } from "./binder/CanvasBinderBar";
import { useCanvasData } from "./hooks/useCanvasData";

/**
 * Canvas 진입점.
 *
 * 외부 import 경로(`./canvas/WorldCanvasPanel`)는 그대로 유지.
 * 내부는 새 구조 — Sidebar | Stage | BinderBar 3분할 + react-flow 노드.
 *
 * Provider 범위:
 *   - ReactFlowProvider는 Sidebar(Outline)와 BinderBar에서도 useReactFlow를
 *     사용할 수 있어야 하므로 패널 전체를 감싼다.
 *
 * 데이터 흐름:
 *   useCanvasData()  →  worldBuildingStore + canvasUiStore + projectStore
 *                    ↓
 *     graphNodes  →  Sidebar (Outline) / Binder (Inspector)
 *     nodes/edges →  CanvasStage
 *
 * 에러/로딩 상태는 본 컴포넌트에서 처리한다 (캔버스 셸은 항상 보이고,
 * 메시지는 Stage 영역의 오버레이로).
 */
export function WorldCanvasPanel() {
  const { t } = useTranslation();
  const { projectId, nodes, edges, graphNodes, isLoading, error } =
    useCanvasData();

  const updatePosition = useWorldBuildingStore(
    (s) => s.updateWorldEntityPosition,
  );
  const loadGraph = useWorldBuildingStore((s) => s.loadGraph);

  const handleNodeMoved = useCallback(
    (id: string, x: number, y: number) => {
      void updatePosition({ id, positionX: x, positionY: y });
    },
    [updatePosition],
  );

  const handleRetry = useCallback(() => {
    if (projectId) void loadGraph(projectId);
  }, [loadGraph, projectId]);

  return (
    <ReactFlowProvider>
      <CanvasLayout
        sidebar={<CanvasSidebar graphNodes={graphNodes} />}
        main={
          <div className="flex h-full min-h-0 flex-col">
            <CanvasToolbar />
            <div className="relative flex-1 min-h-0">
              <CanvasStage
                nodes={nodes}
                edges={edges}
                onNodeMoved={handleNodeMoved}
              />

              {/* 에러 오버레이 */}
              {error ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="pointer-events-auto flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-background/90 px-4 py-3 shadow-sm backdrop-blur-sm">
                    <p className="text-[12px] text-muted-foreground">
                      {t("canvas.empty.error")}
                    </p>
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="rounded-md border border-border/60 bg-background px-2.5 py-1 text-[11px] text-foreground transition-colors hover:bg-muted"
                    >
                      {t("canvas.empty.retry")}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* 로딩 인디케이터 */}
              {isLoading && !error ? (
                <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] text-muted-foreground shadow-sm backdrop-blur-sm">
                  {t("loading")}
                </div>
              ) : null}
            </div>
          </div>
        }
        binder={<CanvasBinderBar graphNodes={graphNodes} />}
      />
    </ReactFlowProvider>
  );
}
