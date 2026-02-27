import { type ReactNode } from 'react';
import WindowBar from '@renderer/features/workspace/components/WindowBar';
import { PanelRightClose, PanelRightOpen, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { useUIStore } from '@renderer/features/workspace/stores/uiStore';
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
import { useSidebarResizeCommit } from "@renderer/features/workspace/hooks/useSidebarResizeCommit";

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
    sidebarWidths,
    setSidebarOpen,
    setContextOpen,
    setSidebarWidth,
  } = useUIStore();

  const handleSidebarResize = useSidebarResizeCommit("mainSidebar", setSidebarWidth);
  const handleContextResize = useSidebarResizeCommit("mainContext", setSidebarWidth);
  const mainSidebarConfig = getSidebarWidthConfig("mainSidebar");
  const mainContextConfig = getSidebarWidthConfig("mainContext");

  const sidebarWidth = clampSidebarWidth(
    "mainSidebar",
    sidebarWidths["mainSidebar"] || getSidebarDefaultWidth("mainSidebar"),
  );

  const contextWidth = clampSidebarWidth(
    "mainContext",
    sidebarWidths["mainContext"] || getSidebarDefaultWidth("mainContext"),
  );

  return (
    <div className="flex flex-col h-screen bg-app text-fg">
      <WindowBar />

      <PanelGroup orientation="horizontal" className="flex flex-1 overflow-hidden relative w-full h-full">
        {/* Sidebar */}
        {isSidebarOpen && (
          <Panel
            id="sidebar-panel"
            defaultSize={toPxSize(sidebarWidth)}
            minSize={toPxSize(mainSidebarConfig.minPx)}
            maxSize={toPxSize(mainSidebarConfig.maxPx)}
            onResize={handleSidebarResize}
            className="bg-sidebar border-r border-border overflow-hidden flex flex-col z-10"
          >
            {sidebar}
          </Panel>
        )}

        {isSidebarOpen && (
          <PanelResizeHandle className="w-1 bg-border/40 hover:bg-accent/50 active:bg-accent/80 transition-colors cursor-col-resize z-20 relative" />
        )}

        {/* Main Content */}
        <Panel id="main-content-panel" className="flex-1 min-w-0 bg-app relative flex flex-col z-0">
          <EditorDropZones />
          <div className="flex items-center px-4 py-2 h-12 shrink-0">
            <button
              className="bg-transparent border-none text-muted cursor-pointer p-2 rounded-md flex items-center justify-center transition-all hover:bg-active hover:text-fg"
              onClick={() => setSidebarOpen(!isSidebarOpen)}
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
              onClick={() => setContextOpen(!isContextOpen)}
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
              <Panel defaultSize={toPercentSize(60)} minSize={toPercentSize(20)} className="min-w-0 bg-canvas relative flex flex-col">
                {children}
              </Panel>
              {additionalPanels}
            </PanelGroup>
          </div>
          <StatusFooter onOpenExport={onOpenExport} />
        </Panel>

        {isContextOpen && (
          <PanelResizeHandle className="w-1 bg-border/40 hover:bg-accent/50 active:bg-accent/80 transition-colors cursor-col-resize z-20 relative" />
        )}

        {/* Context Panel */}
        {isContextOpen && (
          <Panel
            id="context-panel"
            defaultSize={toPxSize(contextWidth)}
            minSize={toPxSize(mainContextConfig.minPx)}
            maxSize={toPxSize(mainContextConfig.maxPx)}
            onResize={handleContextResize}
            className="bg-panel border-l border-border overflow-hidden flex flex-col z-10"
          >
            {contextPanel}
          </Panel>
        )}
      </PanelGroup>
    </div>
  );
}
