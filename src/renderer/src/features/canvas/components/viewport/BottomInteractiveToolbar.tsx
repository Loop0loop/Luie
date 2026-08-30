import { Plus, FileText, Image, Layers, RefreshCw, Focus, ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCanvasViewStore } from "../../stores";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { cn } from "@shared/types/utils";
import { createLogger } from "@shared/logger";
import { Button } from "@renderer/components/ui/button";
import { useToast } from "@shared/ui/ToastContext";

const logger = createLogger("BottomInteractiveToolbar");

export function BottomInteractiveToolbar() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  
  const activePanel = useCanvasViewStore((state) => state.activePanel);
  const setActivePanel = useCanvasViewStore((state) => state.setActivePanel);
  const setMainView = useUIStore((state) => state.setMainView);
  const enableAnimations = useEditorStore((state) => state.enableAnimations);
  const currentProjectId = useProjectStore((state) => state.currentProject?.id);

  const isGraphMode = activePanel === "graph";

  const handleExit = () => {
    logger.info("Exiting canvas mode, returning to manuscript editor");
    setMainView({ type: "editor" });
  };

  const handleAction = async (actionKey: string) => {
    logger.info("Toolbar action triggered", { actionKey });

    switch (actionKey) {
      case "new-block": {
        // TODO: memo 생성 API가 준비되면 canvas memo node를 추가한다.
        showToast(t("canvas.toolbar.comingSoon"), "info");
        break;
      }

      case "insert-image": {
        showToast(t("canvas.toolbar.comingSoon"), "info");
        break;
      }

      case "filter-layer": {
        useUIStore.getState().toggleLeftSidebar();
        break;
      }

      case "ai-sync": {
        if (!currentProjectId) {
          showToast(t("canvas.toolbar.error.noProject"), "error");
          return;
        }
        try {
          await useWorldBuildingStore.getState().loadGraph(currentProjectId);
          showToast(t("canvas.toolbar.success.synced"), "success");
        } catch (error) {
          logger.error("Failed to sync", error);
          showToast(t("canvas.toolbar.error.syncFailed"), "error");
        }
        break;
      }

      case "focus-center": {
        useCanvasViewStore.getState().clearSelection();
        break;
      }

      default:
        logger.warn("Unknown action", { actionKey });
    }
  };

  const transitionClass = enableAnimations
    ? "transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-300 ease-in-out"
    : "transition-none";

  return (
    <div
      className="pointer-events-auto absolute bottom-10 left-1/2 z-30 -translate-x-1/2 select-none"
      data-testid="bottom-interactive-toolbar"
    >
      <div className={cn(
        "canvas-floating-toolbar flex h-11 items-center gap-2 rounded-full px-3 py-1 text-fg",
        transitionClass
      )}>

        <div className={cn(
          "flex items-center gap-0.5 p-0.5 rounded-full shrink-0 h-8",
          "bg-canvas-control-hover border border-canvas-chrome-border",
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
                ? "bg-canvas-control-active text-fg shadow-xs border border-canvas-control-active-border"
                : "text-muted hover:bg-canvas-control-hover hover:text-fg bg-transparent"
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
                ? "bg-canvas-control-active text-fg shadow-xs border border-canvas-control-active-border"
                : "text-muted hover:bg-canvas-control-hover hover:text-fg bg-transparent"
            )}
          >
            {t("canvas.activity.graph")}
          </Button>
        </div>

        <div className="w-px h-4 bg-canvas-divider" />

        <div className="flex items-center gap-1 w-[308px] shrink-0 justify-center">
          {!isGraphMode ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction("new-block")}
                title={t("canvas.toolbar.newBlock")}
                className={cn(
                  "text-xs font-medium rounded-full h-8 px-1 w-[98px] shrink-0 justify-center gap-1 border-none cursor-pointer bg-transparent",
                  "text-muted hover:text-fg hover:bg-surface-hover",
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
                  "text-muted hover:text-fg hover:bg-surface-hover",
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
                  "text-muted hover:text-fg hover:bg-surface-hover",
                  transitionClass
                )}
              >
                <Image className="h-4 w-4 shrink-0" />
                <span className="truncate">{t("canvas.toolbar.insertImage")}</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAction("filter-layer")}
                title={t("canvas.toolbar.filterLayer")}
                className={cn(
                  "text-xs font-medium rounded-full h-8 px-1 w-[98px] shrink-0 justify-center gap-1 border-none cursor-pointer bg-transparent",
                  "text-muted hover:text-fg hover:bg-surface-hover",
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
                  "text-muted hover:text-fg hover:bg-surface-hover",
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
                  "text-muted hover:text-fg hover:bg-surface-hover",
                  transitionClass
                )}
              >
                <Focus className="h-4 w-4 shrink-0" />
                <span className="truncate">{t("canvas.toolbar.focusCenter")}</span>
              </Button>
            </>
          )}
        </div>

        <div className="w-px h-4 bg-canvas-divider" />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleExit}
          title={t("canvas.toolbar.exit")}
          className={cn(
            "text-xs font-semibold rounded-full h-8 px-3 gap-1 border-none cursor-pointer bg-transparent shrink-0",
            "text-muted hover:text-fg hover:bg-surface-hover",
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
