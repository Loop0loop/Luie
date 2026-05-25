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
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
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
  const enableAnimations = useEditorStore((state) => state.enableAnimations);

  const isGraphMode = activePanel === "graph";

  const handleExit = () => {
    logger.info("Exiting canvas mode, returning to manuscript editor");
    setMainView({ type: "editor" });
  };

  const handleAction = (actionKey: string) => {
    logger.info("Toolbar action triggered", { actionKey });
  };

  // 애니메이션 클래스 헬퍼
  const transitionClass = enableAnimations ? "transition-all duration-300 ease-in-out" : "transition-none";

  return (
    <div
      className="pointer-events-auto absolute bottom-6 left-1/2 z-30 -translate-x-1/2 select-none"
      data-testid="bottom-interactive-toolbar"
    >
      <div className={cn(
        "flex h-11 items-center gap-2 rounded-full border shadow-2xl backdrop-blur-md px-3 py-1",
        "bg-[#f5f5f5]/95 border-gray-300 text-gray-800 dark:bg-[#2c2c2c]/95 dark:border-[#3d3d3d] dark:text-white",
        transitionClass
      )}>
        
        {/* 1. Figma 스타일 세그먼트 토글 (가장 좌측 배치) */}
        <div className={cn(
          "flex items-center gap-1 p-0.5 rounded-full shrink-0 h-8",
          "bg-[#e0e0e0] border border-gray-300 dark:bg-[#1e1e1e] dark:border-[#3d3d3d]",
          transitionClass
        )}>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setActivePanel("canvas")}
            className={cn(
              "rounded-full text-[11px] font-bold h-7 px-3.5 border-none cursor-pointer",
              transitionClass,
              !isGraphMode
                ? "bg-[#0c8ce9] text-white shadow-md shadow-[#0c8ce9]/20 hover:bg-[#0c8ce9] hover:text-white"
                : "text-[#666666] hover:bg-gray-200/50 hover:text-black dark:text-[#b3b3b3] dark:hover:bg-[#2c2c2c] dark:hover:text-white bg-transparent"
            )}
          >
            {t("canvas.activity.canvas")}
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setActivePanel("graph")}
            className={cn(
              "rounded-full text-[11px] font-bold h-7 px-3.5 border-none cursor-pointer",
              transitionClass,
              isGraphMode
                ? "bg-[#0c8ce9] text-white shadow-md shadow-[#0c8ce9]/20 hover:bg-[#0c8ce9] hover:text-white"
                : "text-[#666666] hover:bg-gray-200/50 hover:text-black dark:text-[#b3b3b3] dark:hover:bg-[#2c2c2c] dark:hover:text-white bg-transparent"
            )}
          >
            {t("canvas.activity.graph")}
          </Button>
        </div>

        {/* 구분선 */}
        <div className="w-px h-5 bg-gray-300 dark:bg-[#3d3d3d]" />

        {/* 2. 모드별 동적 액션 목록 (중앙 배치 + 너비 308px 고정으로 Layout Shift 완전 방지) */}
        <div className="flex items-center gap-1 w-[308px] shrink-0 justify-center">
          {!isGraphMode ? (
            <>
              {/* Canvas Mode 3대 액션 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction("new-block")}
                title={t("canvas.toolbar.newBlock")}
                className={cn(
                  "text-xs font-medium rounded-full h-8 px-1 w-[98px] shrink-0 justify-center gap-1 border-none cursor-pointer bg-transparent",
                  "text-[#666666] hover:text-black hover:bg-gray-200 dark:text-[#b3b3b3] dark:hover:text-white dark:hover:bg-[#3d3d3d]",
                  transitionClass
                )}
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="truncate">{t("canvas.toolbar.newBlock")}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction("import-doc")}
                title={t("canvas.toolbar.importDoc")}
                className={cn(
                  "text-xs font-medium rounded-full h-8 px-1 w-[98px] shrink-0 justify-center gap-1 border-none cursor-pointer bg-transparent",
                  "text-[#666666] hover:text-black hover:bg-gray-200 dark:text-[#b3b3b3] dark:hover:text-white dark:hover:bg-[#3d3d3d]",
                  transitionClass
                )}
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">{t("canvas.toolbar.importDoc")}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction("insert-image")}
                title={t("canvas.toolbar.insertImage")}
                className={cn(
                  "text-xs font-medium rounded-full h-8 px-1 w-[98px] shrink-0 justify-center gap-1 border-none cursor-pointer bg-transparent",
                  "text-[#666666] hover:text-black hover:bg-gray-200 dark:text-[#b3b3b3] dark:hover:text-white dark:hover:bg-[#3d3d3d]",
                  transitionClass
                )}
              >
                <Image className="h-4 w-4 shrink-0" />
                <span className="truncate">{t("canvas.toolbar.insertImage")}</span>
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
                className={cn(
                  "text-xs font-medium rounded-full h-8 px-1 w-[98px] shrink-0 justify-center gap-1 border-none cursor-pointer bg-transparent",
                  "text-[#666666] hover:text-black hover:bg-gray-200 dark:text-[#b3b3b3] dark:hover:text-white dark:hover:bg-[#3d3d3d]",
                  transitionClass
                )}
              >
                <Layers className="h-4 w-4 shrink-0" />
                <span className="truncate">{t("canvas.toolbar.filterLayer")}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction("ai-sync")}
                title={t("canvas.toolbar.aiSync")}
                className={cn(
                  "text-xs font-medium rounded-full h-8 px-1 w-[98px] shrink-0 justify-center gap-1 border-none cursor-pointer bg-transparent",
                  "text-[#666666] hover:text-black hover:bg-gray-200 dark:text-[#b3b3b3] dark:hover:text-white dark:hover:bg-[#3d3d3d]",
                  transitionClass
                )}
              >
                <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t("canvas.toolbar.aiSync")}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction("focus-center")}
                title={t("canvas.toolbar.focusCenter")}
                className={cn(
                  "text-xs font-medium rounded-full h-8 px-1 w-[98px] shrink-0 justify-center gap-1 border-none cursor-pointer bg-transparent",
                  "text-[#666666] hover:text-black hover:bg-gray-200 dark:text-[#b3b3b3] dark:hover:text-white dark:hover:bg-[#3d3d3d]",
                  transitionClass
                )}
              >
                <Focus className="h-4 w-4 shrink-0" />
                <span className="truncate">{t("canvas.toolbar.focusCenter")}</span>
              </Button>
            </>
          )}
        </div>

        {/* 구분선 */}
        <div className="w-px h-5 bg-gray-300 dark:bg-[#3d3d3d]" />

        {/* 3. 에디터 복귀 버튼 (우측 배치) */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExit}
          title={t("canvas.toolbar.exit")}
          className={cn(
            "text-xs font-semibold rounded-full h-8 px-3 gap-1 border-none cursor-pointer bg-transparent shrink-0",
            "text-[#666666] hover:text-black hover:bg-gray-200 dark:text-[#b3b3b3] dark:hover:text-white dark:hover:bg-[#3d3d3d]",
            transitionClass
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          <span>{t("canvas.toolbar.exit")}</span>
        </Button>

      </div>
    </div>
  );
}

