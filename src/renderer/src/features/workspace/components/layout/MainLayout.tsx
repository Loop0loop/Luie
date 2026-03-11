import { type ReactNode, useState, useEffect } from 'react';
import WindowBar from '@renderer/features/workspace/components/WindowBar';
import { PanelRightClose, PanelRightOpen, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { useUIStore } from '@renderer/features/workspace/stores/uiStore';
import { useShallow } from "zustand/react/shallow";
import { useTranslation } from "react-i18next";
import { EditorDropZones } from "@shared/ui/EditorDropZones";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import StatusFooter from "@shared/ui/StatusFooter";
import {
  getLayoutSurfaceConfig,
  getLayoutSurfaceDefaultRatio,
  toPanelPercentSize,
  toPanelPixelSize,
} from "@shared/constants/layoutSizing";
import { toPercentSize } from "@shared/constants/sidebarSizing";
import { useLayoutPersist } from "@renderer/features/workspace/hooks/useLayoutPersist";

interface MainLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  contextPanel?: ReactNode;
  additionalPanels?: ReactNode;
  additionalPanelIds?: string[];
  onOpenExport?: () => void;
}

export default function MainLayout({
  children,
  sidebar,
  contextPanel,
  additionalPanels,
  additionalPanelIds = [],
  onOpenExport,
}: MainLayoutProps) {
  const { t } = useTranslation();
  const {
    isSidebarOpen,
    isContextOpen,
    layoutSurfaceRatios,
    toggleLeftSidebar,
    setRegionOpen,
  } = useUIStore(
    useShallow((state) => ({
      isSidebarOpen: state.regions.leftSidebar.open,
      isContextOpen: state.regions.rightPanel.open,
      layoutSurfaceRatios: state.layoutSurfaceRatios,
      toggleLeftSidebar: state.toggleLeftSidebar,
      setRegionOpen: state.setRegionOpen,
    }))
  );

  const mainSidebarConfig = getLayoutSurfaceConfig("default.sidebar");
  const mainContextConfig = getLayoutSurfaceConfig("default.panel");

  const onLayoutChanged = useLayoutPersist([
    { id: "sidebar-panel", surface: "default.sidebar" },
    { id: "context-panel", surface: "default.panel" },
  ]);

  const enableAnimations = useEditorStore((state) => state.enableAnimations);

  const [localSidebarOpen, setLocalSidebarOpen] = useState(isSidebarOpen);
  const [localContextOpen, setLocalContextOpen] = useState(isContextOpen);
  const [isSidebarClosing, setIsSidebarClosing] = useState(false);
  const [isContextClosing, setIsContextClosing] = useState(false);

  if (isSidebarOpen && !localSidebarOpen) {
    setLocalSidebarOpen(true);
    setIsSidebarClosing(false);
  }

  useEffect(() => {
    if (!isSidebarOpen && localSidebarOpen) {
      if (enableAnimations) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsSidebarClosing(true);
        const timer = setTimeout(() => {
          setLocalSidebarOpen(false);
          setIsSidebarClosing(false);
        }, 200);
        return () => clearTimeout(timer);
      } else {
        setLocalSidebarOpen(false);
        return undefined;
      }
    }
    return undefined;
  }, [isSidebarOpen, enableAnimations, localSidebarOpen]);

  if (isContextOpen && !localContextOpen) {
    setLocalContextOpen(true);
    setIsContextClosing(false);
  }

  useEffect(() => {
    if (!isContextOpen && localContextOpen) {
      if (enableAnimations) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsContextClosing(true);
        const timer = setTimeout(() => {
          setLocalContextOpen(false);
          setIsContextClosing(false);
        }, 200);
        return () => clearTimeout(timer);
      } else {
        setLocalContextOpen(false);
        return undefined;
      }
    }
    return undefined;
  }, [isContextOpen, enableAnimations, localContextOpen]);

  const sidebarRatio =
    layoutSurfaceRatios["default.sidebar"] ?? getLayoutSurfaceDefaultRatio("default.sidebar");
  const contextRatio =
    layoutSurfaceRatios["default.panel"] ?? getLayoutSurfaceDefaultRatio("default.panel");

  return (
    <div className="flex flex-col h-screen bg-app text-fg">
      <WindowBar />

      <PanelGroup
        id="main-layout-group"
        orientation="horizontal"
        className="flex flex-1 overflow-hidden relative w-full h-full"
        onLayoutChanged={onLayoutChanged}
      >
        {/* Sidebar */}
        {localSidebarOpen && (
          <Panel
            id="sidebar-panel"
            defaultSize={toPanelPercentSize(sidebarRatio)}
            minSize={toPanelPixelSize(mainSidebarConfig.minPx)}
            maxSize={toPanelPixelSize(mainSidebarConfig.maxPx)}
            className={`bg-sidebar border-r border-border overflow-hidden flex flex-col z-10 ${
              enableAnimations
                ? isSidebarClosing
                  ? "animate-out slide-out-to-left fade-out duration-200"
                  : "animate-in slide-in-from-left fade-in duration-200"
                : ""
            }`}
          >
            {sidebar}
          </Panel>
        )}

        {localSidebarOpen && (
          <PanelResizeHandle data-separator-feature="default.sidebar" className="w-1 bg-border/40 hover:bg-accent/50 active:bg-accent/80 transition-colors cursor-col-resize z-20 relative" />
        )}

        {/* Main Content */}
        <Panel
          id="main-content-panel"
          className="flex-1 min-w-0 bg-app relative flex flex-col z-0"
        >
          <EditorDropZones />
          <div className="flex items-center px-4 py-2 h-12 shrink-0">
            <button
              className="bg-transparent border-none text-muted cursor-pointer p-2 rounded-md flex items-center justify-center transition-colors duration-150 hover:bg-active hover:text-fg"
              onClick={toggleLeftSidebar}
              title={isSidebarOpen ? t("mainLayout.tooltip.sidebarCollapse") : t("mainLayout.tooltip.sidebarExpand")}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="icon-xl" />
              ) : (
                <PanelLeftOpen className="icon-xl" />
              )}
            </button>

            <div className="flex-1" />

            <button
              className="bg-transparent border-none text-muted cursor-pointer p-2 rounded-md flex items-center justify-center transition-colors duration-150 hover:bg-active hover:text-fg"
              onClick={() => setRegionOpen("rightPanel", !isContextOpen)}
              title={isContextOpen ? t("mainLayout.tooltip.contextCollapse") : t("mainLayout.tooltip.contextExpand")}
            >
              {isContextOpen ? (
                <PanelRightClose className="icon-xl" />
              ) : (
                <PanelRightOpen className="icon-xl" />
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col">
            <PanelGroup
              id="main-layout-content-group"
              orientation="horizontal"
              className="flex w-full h-full flex-1 overflow-hidden relative"
            >
              <Panel
                id="main-primary-content"
                defaultSize={toPercentSize(50)}
                minSize={toPercentSize(20)}
                className="min-w-0 bg-canvas relative flex flex-col"
              >
                {children}
              </Panel>
              {additionalPanels}
              {additionalPanelIds.length === 0 && (
                <Panel
                  id="main-content-placeholder"
                  defaultSize={0}
                  minSize={0}
                  maxSize={0}
                  className="pointer-events-none overflow-hidden opacity-0"
                />
              )}
            </PanelGroup>
          </div>
          <StatusFooter onOpenExport={onOpenExport} />
        </Panel>

        {localContextOpen && (
          <PanelResizeHandle data-separator-feature="default.panel" className="w-1 bg-border/40 hover:bg-accent/50 active:bg-accent/80 transition-colors cursor-col-resize z-20 relative" />
        )}

        {/* Context Panel */}
        {localContextOpen && (
          <Panel
            id="context-panel"
            defaultSize={toPanelPercentSize(contextRatio)}
            minSize={toPanelPixelSize(mainContextConfig.minPx)}
            maxSize={toPanelPixelSize(mainContextConfig.maxPx)}
            className={`bg-panel border-l border-border overflow-hidden flex flex-col z-10 ${
              enableAnimations
                ? isContextClosing
                  ? "animate-out slide-out-to-right fade-out duration-200"
                  : "animate-in slide-in-from-right fade-in duration-200"
                : ""
            }`}
          >
            {contextPanel}
          </Panel>
        )}

        {!localSidebarOpen && !localContextOpen && (
          <Panel
            id="main-layout-placeholder"
            defaultSize={0}
            minSize={0}
            maxSize={0}
            className="pointer-events-none overflow-hidden opacity-0"
          />
        )}
      </PanelGroup>
    </div>
  );
}
