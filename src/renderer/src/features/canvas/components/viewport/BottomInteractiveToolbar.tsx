/**
 * BottomInteractiveToolbar — 통합 플로팅 하단 툴바.
 * 
 * 기능:
 *   - Canvas Mode / Graph Mode에 따라 유동적인 3대 액션 배치
 *   - Figma 스타일의 세그먼트 모드 토글 ([ Canvas ] ❖ [ Graph ])
 *   - 에디터 모드로 신속히 빠져나가는 "에디터 복귀" 버튼 지원
 */

import { Plus, FileText, Image, Layers, RefreshCw, Focus, ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCanvasViewStore } from "../../stores";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { cn } from "@shared/types/utils";
import { createLogger } from "@shared/logger";

const logger = createLogger("BottomInteractiveToolbar");

export function BottomInteractiveToolbar() {
  const { t } = useTranslation();
  
  // Zustand Stores
  const activePanel = useCanvasViewStore((state) => state.activePanel);
  const setActivePanel = useCanvasViewStore((state) => state.setActivePanel);
  const setMainView = useUIStore((state) => state.setMainView);

  const isGraphMode = activePanel === "graph";

  const handleExit = () => {
    logger.info("Exiting canvas mode, returning to manuscript editor");
    setMainView({ type: "editor" });
  };

  const handleAction = (actionKey: string) => {
    logger.info("Toolbar action triggered", { actionKey });
  };

  return (
    <div
      className="pointer-events-auto absolute bottom-5 left-1/2 z-30 -translate-x-1/2"
      data-testid="bottom-interactive-toolbar"
    >
      <div className="flex items-center gap-3 rounded-lg border border-border/80 bg-background/85 px-3 py-1.5 shadow-md backdrop-blur-md">
        
        {/* 에디터 복귀 버튼 */}
        <button
          type="button"
          onClick={handleExit}
          title={t("canvas.toolbar.exit")}
          className="flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-muted-foreground transition-all hover:bg-surface-hover hover:text-foreground active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>{t("canvas.toolbar.exit")}</span>
        </button>

        {/* 구분선 */}
        <div className="h-4 w-px bg-border/80" aria-hidden />

        {/* 모드별 동적 액션 목록 */}
        <div className="flex items-center gap-1">
          {!isGraphMode ? (
            <>
              {/* Canvas Mode 3대 액션 */}
              <button
                type="button"
                onClick={() => handleAction("new-block")}
                title={t("canvas.toolbar.newBlock")}
                className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-all hover:bg-surface-hover hover:text-foreground active:scale-95"
              >
                <Plus className="h-4 w-4 text-accent" />
                <span>{t("canvas.toolbar.newBlock")}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction("import-doc")}
                title={t("canvas.toolbar.importDoc")}
                className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-all hover:bg-surface-hover hover:text-foreground active:scale-95"
              >
                <FileText className="h-4 w-4 text-accent" />
                <span>{t("canvas.toolbar.importDoc")}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction("insert-image")}
                title={t("canvas.toolbar.insertImage")}
                className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-all hover:bg-surface-hover hover:text-foreground active:scale-95"
              >
                <Image className="h-4 w-4 text-accent" />
                <span>{t("canvas.toolbar.insertImage")}</span>
              </button>
            </>
          ) : (
            <>
              {/* Graph Mode 3대 액션 */}
              <button
                type="button"
                onClick={() => handleAction("filter-layer")}
                title={t("canvas.toolbar.filterLayer")}
                className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-all hover:bg-surface-hover hover:text-foreground active:scale-95"
              >
                <Layers className="h-4 w-4 text-accent" />
                <span>{t("canvas.toolbar.filterLayer")}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction("ai-sync")}
                title={t("canvas.toolbar.aiSync")}
                className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-all hover:bg-surface-hover hover:text-foreground active:scale-95"
              >
                <RefreshCw className="h-3.5 w-3.5 text-accent" />
                <span>{t("canvas.toolbar.aiSync")}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction("focus-center")}
                title={t("canvas.toolbar.focusCenter")}
                className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-all hover:bg-surface-hover hover:text-foreground active:scale-95"
              >
                <Focus className="h-4 w-4 text-accent" />
                <span>{t("canvas.toolbar.focusCenter")}</span>
              </button>
            </>
          )}
        </div>

        {/* 구분선 */}
        <div className="h-4 w-px bg-border/80" aria-hidden />

        {/* Figma 스타일 세그먼트 토글 */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface-hover border border-border/40 shrink-0">
          <button
            type="button"
            onClick={() => setActivePanel("canvas")}
            className={cn(
              "px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-150",
              !isGraphMode
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("canvas.activity.canvas")}
          </button>
          <span className="text-muted/40 text-[9px] select-none" aria-hidden>❖</span>
          <button
            type="button"
            onClick={() => setActivePanel("graph")}
            className={cn(
              "px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-150",
              isGraphMode
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("canvas.activity.graph")}
          </button>
        </div>

      </div>
    </div>
  );
}
