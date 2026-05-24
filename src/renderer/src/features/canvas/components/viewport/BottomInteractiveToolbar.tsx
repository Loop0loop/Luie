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
import { Button } from "@renderer/components/ui/button";
import { Separator } from "@renderer/components/ui/separator";

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
      className="pointer-events-auto absolute bottom-5 left-1/2 z-30 -translate-x-1/2 select-none"
      data-testid="bottom-interactive-toolbar"
    >
      <div className="flex h-11 items-center gap-2 rounded-lg border border-border/80 bg-background/85 px-3 py-1.5 shadow-md backdrop-blur-md">
        
        {/* 에디터 복귀 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExit}
          title={t("canvas.toolbar.exit")}
          className="text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>{t("canvas.toolbar.exit")}</span>
        </Button>

        {/* 구분선 */}
        <Separator orientation="vertical" className="h-4 w-px bg-border/80" />

        {/* 모드별 동적 액션 목록 */}
        <div className="flex items-center gap-1">
          {!isGraphMode ? (
            <>
              {/* Canvas Mode 3대 액션 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction("new-block")}
                title={t("canvas.toolbar.newBlock")}
                className="text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground [&_svg]:text-accent"
              >
                <Plus className="h-4 w-4" />
                <span>{t("canvas.toolbar.newBlock")}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction("import-doc")}
                title={t("canvas.toolbar.importDoc")}
                className="text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground [&_svg]:text-accent"
              >
                <FileText className="h-4 w-4" />
                <span>{t("canvas.toolbar.importDoc")}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction("insert-image")}
                title={t("canvas.toolbar.insertImage")}
                className="text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground [&_svg]:text-accent"
              >
                <Image className="h-4 w-4" />
                <span>{t("canvas.toolbar.insertImage")}</span>
              </Button>
            </>
          ) : (
            <>
              {/* Graph Mode 3대 액션 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction("filter-layer")}
                title={t("canvas.toolbar.filterLayer")}
                className="text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground [&_svg]:text-accent"
              >
                <Layers className="h-4 w-4" />
                <span>{t("canvas.toolbar.filterLayer")}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction("ai-sync")}
                title={t("canvas.toolbar.aiSync")}
                className="text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground [&_svg]:text-accent"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{t("canvas.toolbar.aiSync")}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction("focus-center")}
                title={t("canvas.toolbar.focusCenter")}
                className="text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground [&_svg]:text-accent"
              >
                <Focus className="h-4 w-4" />
                <span>{t("canvas.toolbar.focusCenter")}</span>
              </Button>
            </>
          )}
        </div>

        {/* 구분선 */}
        <Separator orientation="vertical" className="h-4 w-px bg-border/80" />

        {/* Figma 스타일 세그먼트 토글 */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/40 border border-border/40 shrink-0">
          <Button
            variant={!isGraphMode ? "secondary" : "ghost"}
            size="xs"
            onClick={() => setActivePanel("canvas")}
            className={cn(
              "rounded-md text-[10px] font-semibold transition-all duration-150 h-7 px-2.5",
              !isGraphMode
                ? "bg-background text-foreground shadow-sm hover:bg-background"
                : "text-muted-foreground hover:bg-transparent hover:text-foreground"
            )}
          >
            {t("canvas.activity.canvas")}
          </Button>
          <span className="text-muted-foreground/30 text-[9px] select-none px-1" aria-hidden>❖</span>
          <Button
            variant={isGraphMode ? "secondary" : "ghost"}
            size="xs"
            onClick={() => setActivePanel("graph")}
            className={cn(
              "rounded-md text-[10px] font-semibold transition-all duration-150 h-7 px-2.5",
              isGraphMode
                ? "bg-background text-foreground shadow-sm hover:bg-background"
                : "text-muted-foreground hover:bg-transparent hover:text-foreground"
            )}
          >
            {t("canvas.activity.graph")}
          </Button>
        </div>

      </div>
    </div>
  );
}

