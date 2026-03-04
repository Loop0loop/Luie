import { type ReactNode, useMemo } from 'react';
import WindowBar from '@renderer/features/workspace/components/WindowBar';
import { PanelRightClose, PanelRightOpen, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { useUIStore } from '@renderer/features/workspace/stores/uiStore';
import { useShallow } from "zustand/react/shallow";
import { useTranslation } from "react-i18next";
import { EditorDropZones } from "@shared/ui/EditorDropZones";
import StatusFooter from "@shared/ui/StatusFooter";
import {
  clampSidebarWidth,
  getSidebarDefaultWidth,
  getSidebarWidthConfig,
  toPercentSize,
  toPxSize,
} from "@shared/constants/sidebarSizing";
import { useLayoutPersist } from "@renderer/features/workspace/hooks/useLayoutPersist";

interface MainLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  contextPanel?: ReactNode;
  additionalPanels?: ReactNode;
  onOpenExport?: () => void;
}

export default function MainLayout({ children, sidebar, contextPanel, additionalPanels, onOpenExport }: MainLayoutProps) {
  const { t } = useTranslation();
  const {
    isSidebarOpen,
    isContextOpen,
    regions,
    sidebarWidths,
    hasHydrated,
    toggleLeftSidebar,
    setRegionOpen,
  } = useUIStore(
    useShallow((state) => ({
      isSidebarOpen: state.regions.leftSidebar.open,
      isContextOpen: state.regions.rightPanel.open,
      regions: state.regions,
      sidebarWidths: state.sidebarWidths,
      hasHydrated: state.hasHydrated,
      toggleLeftSidebar: state.toggleLeftSidebar,
      setRegionOpen: state.setRegionOpen,
    }))
  );

  const mainSidebarConfig = getSidebarWidthConfig("mainSidebar");
  const mainContextConfig = getSidebarWidthConfig("mainContext");

  const onLayoutChanged = useLayoutPersist([
    { id: "sidebar-panel", feature: "mainSidebar" },
    { id: "context-panel", feature: "mainContext" },
  ]);

  const sidebarWidth = clampSidebarWidth(
    "mainSidebar",
    regions.leftSidebar.widthPx ??
      sidebarWidths["mainSidebar"] ??
      getSidebarDefaultWidth("mainSidebar"),
  );
  const sidebarDefaultSize = useMemo(
    () => toPxSize(sidebarWidth),
    [isSidebarOpen],
  );

  const contextWidth = clampSidebarWidth(
    "mainContext",
    sidebarWidths["mainContext"] || getSidebarDefaultWidth("mainContext"),
  );
  const contextDefaultSize = useMemo(
    () => toPxSize(contextWidth),
    [isContextOpen],
  );

  return (
    <div className="flex flex-col h-screen bg-app text-fg">
      <WindowBar />

      <PanelGroup
        key={hasHydrated ? "main-layout-hydrated" : "main-layout-cold"}
        orientation="horizontal"
        className="flex flex-1 overflow-hidden relative w-full h-full"
        onLayoutChanged={onLayoutChanged}
      >
        {/* Sidebar */}
        {isSidebarOpen && (
          <Panel
            id="sidebar-panel"
            defaultSize={sidebarDefaultSize}
            minSize={toPxSize(mainSidebarConfig.minPx)}
            maxSize={toPxSize(mainSidebarConfig.maxPx)}
            className="bg-sidebar border-r border-border overflow-hidden flex flex-col z-10"
          >
            {sidebar}
          </Panel>
        )}

        {isSidebarOpen && (
          <PanelResizeHandle data-separator-feature="mainSidebar" className="w-1 bg-border/40 hover:bg-accent/50 active:bg-accent/80 transition-colors cursor-col-resize z-20 relative" />
        )}

        {/* Main Content */}
        <Panel id="main-content-panel" className="flex-1 min-w-0 bg-app relative flex flex-col z-0">
          <EditorDropZones />
          <div className="flex items-center px-4 py-2 h-12 shrink-0">
            <button
              className="bg-transparent border-none text-muted cursor-pointer p-2 rounded-md flex items-center justify-center transition-all hover:bg-active hover:text-fg"
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
              className="bg-transparent border-none text-muted cursor-pointer p-2 rounded-md flex items-center justify-center transition-all hover:bg-active hover:text-fg"
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
            <PanelGroup orientation="horizontal" className="flex w-full h-full flex-1 overflow-hidden relative">
              <Panel defaultSize={toPercentSize(50)} minSize={toPercentSize(20)} className="min-w-0 bg-canvas relative flex flex-col">
                {children}
              </Panel>
              {additionalPanels}
            </PanelGroup>
          </div>
          <StatusFooter onOpenExport={onOpenExport} />
        </Panel>

        {isContextOpen && (
          <PanelResizeHandle data-separator-feature="mainContext" className="w-1 bg-border/40 hover:bg-accent/50 active:bg-accent/80 transition-colors cursor-col-resize z-20 relative" />
        )}

        {/* Context Panel */}
        {isContextOpen && (
          <Panel
            id="context-panel"
            defaultSize={contextDefaultSize}
            minSize={toPxSize(mainContextConfig.minPx)}
            maxSize={toPxSize(mainContextConfig.maxPx)}
            className="bg-panel border-l border-border overflow-hidden flex flex-col z-10"
          >
            {contextPanel}
          </Panel>
        )}
      </PanelGroup>
    </div>
  );
}
