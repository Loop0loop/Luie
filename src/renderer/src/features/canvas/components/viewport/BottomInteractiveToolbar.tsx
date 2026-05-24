/**
 * BottomInteractiveToolbar — 통합 플로팅 하단 툴바.
 * 
 * 기능:
 *   - Canvas Mode / Graph Mode에 따라 유동적인 3대 액션 배치
 *   - Figma 스타일의 세그먼트 모드 토글 ([ Canvas ] [ Graph ])
 *   - 에디터 모드로 신속히 빠져나가는 "에디터 복귀" 버튼 지원
 */

import { Plus, FileText, Image, Layers, RefreshCw, Focus, ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCanvasViewStore } from "../../stores";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { cn } from "@shared/types/utils";
import { createLogger } from "@shared/logger";
import { Button } from "@renderer/components/ui/button";

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
      className="pointer-events-auto absolute bottom-6 left-1/2 z-30 -translate-x-1/2 select-none"
      data-testid="bottom-interactive-toolbar"
    >
      <div className="flex h-11 items-center gap-2 rounded-full border border-[#3d3d3d] bg-[#2c2c2c]/95 px-3 py-1 shadow-2xl backdrop-blur-md">
        
        {/* 에디터 복귀 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExit}
          title={t("canvas.toolbar.exit")}
          className="text-xs font-semibold text-[#b3b3b3] hover:text-white hover:bg-[#3d3d3d] rounded-full transition-colors h-8 px-3 gap-1 border-none cursor-pointer bg-transparent"
        >
          <ChevronLeft className="h-4 w-4 text-[#b3b3b3]" />
          <span>{t("canvas.toolbar.exit")}</span>
        </Button>

        {/* 구분선 */}
        <div className="w-px h-5 bg-[#3d3d3d]" />

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
                className="text-xs font-medium text-[#b3b3b3] hover:text-white hover:bg-[#3d3d3d] rounded-full transition-colors h-8 px-3 gap-1.5 border-none cursor-pointer bg-transparent"
              >
                <Plus className="h-4 w-4 text-[#b3b3b3] group-hover:text-white" />
                <span>{t("canvas.toolbar.newBlock")}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction("import-doc")}
                title={t("canvas.toolbar.importDoc")}
                className="text-xs font-medium text-[#b3b3b3] hover:text-white hover:bg-[#3d3d3d] rounded-full transition-colors h-8 px-3 gap-1.5 border-none cursor-pointer bg-transparent"
              >
                <FileText className="h-4 w-4 text-[#b3b3b3] group-hover:text-white" />
                <span>{t("canvas.toolbar.importDoc")}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction("insert-image")}
                title={t("canvas.toolbar.insertImage")}
                className="text-xs font-medium text-[#b3b3b3] hover:text-white hover:bg-[#3d3d3d] rounded-full transition-colors h-8 px-3 gap-1.5 border-none cursor-pointer bg-transparent"
              >
                <Image className="h-4 w-4 text-[#b3b3b3] group-hover:text-white" />
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
                className="text-xs font-medium text-[#b3b3b3] hover:text-white hover:bg-[#3d3d3d] rounded-full transition-colors h-8 px-3 gap-1.5 border-none cursor-pointer bg-transparent"
              >
                <Layers className="h-4 w-4 text-[#b3b3b3] group-hover:text-white" />
                <span>{t("canvas.toolbar.filterLayer")}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction("ai-sync")}
                title={t("canvas.toolbar.aiSync")}
                className="text-xs font-medium text-[#b3b3b3] hover:text-white hover:bg-[#3d3d3d] rounded-full transition-colors h-8 px-3 gap-1 border-none cursor-pointer bg-transparent"
              >
                <RefreshCw className="h-3.5 w-3.5 text-[#b3b3b3] group-hover:text-white" />
                <span>{t("canvas.toolbar.aiSync")}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction("focus-center")}
                title={t("canvas.toolbar.focusCenter")}
                className="text-xs font-medium text-[#b3b3b3] hover:text-white hover:bg-[#3d3d3d] rounded-full transition-colors h-8 px-3 gap-1.5 border-none cursor-pointer bg-transparent"
              >
                <Focus className="h-4 w-4 text-[#b3b3b3] group-hover:text-white" />
                <span>{t("canvas.toolbar.focusCenter")}</span>
              </Button>
            </>
          )}
        </div>

        {/* 구분선 */}
        <div className="w-px h-5 bg-[#3d3d3d]" />

        {/* Figma 스타일 세그먼트 토글 */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-[#1e1e1e] border border-[#3d3d3d] shrink-0 h-9">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setActivePanel("canvas")}
            className={cn(
              "rounded-full text-[11px] font-bold transition-all duration-200 h-7 px-3.5 border-none cursor-pointer",
              !isGraphMode
                ? "bg-[#0c8ce9] text-white shadow-md shadow-[#0c8ce9]/20 hover:bg-[#0c8ce9] hover:text-white"
                : "text-[#b3b3b3] hover:bg-[#2c2c2c] hover:text-white bg-transparent"
            )}
          >
            {t("canvas.activity.canvas")}
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setActivePanel("graph")}
            className={cn(
              "rounded-full text-[11px] font-bold transition-all duration-200 h-7 px-3.5 border-none cursor-pointer",
              isGraphMode
                ? "bg-[#0c8ce9] text-white shadow-md shadow-[#0c8ce9]/20 hover:bg-[#0c8ce9] hover:text-white"
                : "text-[#b3b3b3] hover:bg-[#2c2c2c] hover:text-white bg-transparent"
            )}
          >
            {t("canvas.activity.graph")}
          </Button>
        </div>

      </div>
    </div>
  );
}

