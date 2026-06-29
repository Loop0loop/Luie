import { useCallback, useRef, type ReactNode } from "react";
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
  type GroupImperativeHandle,
} from "react-resizable-panels";
import { useShallow } from "zustand/react/shallow";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { SidebarCollapseStrip } from "@renderer/features/workspace/components/SidebarCollapseStrip";
import { SidebarPeekContent } from "@renderer/features/workspace/components/SidebarPeekContent";
import { useCollapsibleSidebar } from "@renderer/features/workspace/hooks/useCollapsibleSidebar";
import {
  getCollapsibleSidebarPanelSize,
  shouldHideCollapsibleSidebarLayout,
} from "@renderer/features/workspace/hooks/useCollapsibleSidebar";
import { useFixedPixelPanelGroupLayout } from "@renderer/features/workspace/hooks/useFixedPixelPanelGroupLayout";
import { useSidebarResizeCommit } from "@renderer/features/workspace/hooks/useSidebarResizeCommit";
import { useProjectLayoutStore } from "@renderer/features/workspace/stores/projectLayoutStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import {
  clampSidebarWidth,
  getSidebarDefaultWidth,
  getSidebarWidthConfig,
  toPercentSize,
  toPxSize,
} from "@renderer/shared/constants/sidebarSizing";

type SidebarFeature = "characterSidebar" | "eventSidebar" | "factionSidebar";

type PeekGroup = {
  name: string;
  items: Array<{
    id: string;
    label: string;
    sublabel?: string;
  }>;
};

type EntityManagerShellProps = {
  sidebarFeature: SidebarFeature;
  peekGroups: PeekGroup[];
  selectedId: string | null | undefined;
  onSelect: (id: string) => void;
  addLabel: string;
  onAdd: () => void;
  sidebar: ReactNode;
  children: ReactNode;
};

export function EntityManagerShell({
  sidebarFeature,
  peekGroups,
  selectedId,
  onSelect,
  addLabel,
  onAdd,
  sidebar,
  children,
}: EntityManagerShellProps) {
  const { sidebarWidths, setSidebarWidth, uiHasHydrated } = useUIStore(
    useShallow((state) => ({
      sidebarWidths: state.sidebarWidths,
      setSidebarWidth: state.setSidebarWidth,
      uiHasHydrated: state.hasHydrated,
    })),
  );
  const currentProjectId = useProjectStore((state) => state.currentProject?.id);
  const projectLayoutHasHydrated = useProjectLayoutStore(
    (state) => state.hasHydrated,
  );
  const upsertProjectLayout = useProjectLayoutStore(
    (state) => state.upsertProjectLayout,
  );
  const sidebarConfig = getSidebarWidthConfig(sidebarFeature);
  const sidebarWidth = clampSidebarWidth(
    sidebarFeature,
    sidebarWidths[sidebarFeature] || getSidebarDefaultWidth(sidebarFeature),
  );
  console.warn("[wprobe:render]", sidebarFeature, "stored=", sidebarWidths[sidebarFeature], "used=", sidebarWidth);
  const commitSidebarWidth = useCallback(
    (feature: string, width: number) => {
      console.warn("[wprobe:commit]", feature, width);
      setSidebarWidth(feature, width);
      if (!currentProjectId || !uiHasHydrated || !projectLayoutHasHydrated) {
        return;
      }
      upsertProjectLayout(currentProjectId, {
        sidebarWidths: {
          [feature]: width,
        },
      });
    },
    [
      currentProjectId,
      projectLayoutHasHydrated,
      setSidebarWidth,
      uiHasHydrated,
      upsertProjectLayout,
    ],
  );
  const { onResize: baseOnResize, resizeHandleProps } =
    useSidebarResizeCommit(sidebarFeature, commitSidebarWidth, {
      initialWidth: sidebarWidth,
    });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelGroupRef = useRef<GroupImperativeHandle | null>(null);
  const enableAnimations = useEditorStore((state) => state.enableAnimations);
  const {
    isCollapsed,
    isHydrated: isCollapseHydrated,
    onResize: rawHandleSidebarResize,
    toggle,
  } = useCollapsibleSidebar(sidebarFeature, baseOnResize);
  const handleSidebarResize = (panelSize: { inPixels?: number; asPercentage?: number }) => {
    console.warn("[wprobe:onResize]", sidebarFeature, "px=", panelSize.inPixels, "pct=", panelSize.asPercentage, "restoring=", document.documentElement.getAttribute("data-layout-restoring"));
    rawHandleSidebarResize(panelSize as never);
  };

  const { hasCompletedInitialLayout } = useFixedPixelPanelGroupLayout({
    containerRef,
    groupRef: panelGroupRef,
    fixedPanels: [
      {
        id: "sidebar",
        widthPx: sidebarWidth,
        minPx: sidebarConfig.minPx,
        maxPx: sidebarConfig.maxPx,
        collapsed: isCollapsed,
      },
    ],
    flexPanelId: "main",
    flexPanelMinPercent: 20,
  });
  const shouldHideUntilLayoutReady = shouldHideCollapsibleSidebarLayout({
    enableAnimations,
    uiHasHydrated,
    projectLayoutHasHydrated,
    isLayoutReady: hasCompletedInitialLayout,
    isCollapseHydrated,
  });

  return (
    <div
      className="relative flex w-full h-full bg-app overflow-hidden"
      style={{
        visibility: shouldHideUntilLayoutReady ? "hidden" : undefined,
      }}
    >
      <SidebarCollapseStrip isCollapsed={isCollapsed} onToggle={toggle}>
        <SidebarPeekContent
          groups={peekGroups}
          selectedId={selectedId}
          onSelect={onSelect}
          addLabel={addLabel}
          onAdd={onAdd}
        />
      </SidebarCollapseStrip>

      <div ref={containerRef} className="flex-1 min-w-0 h-full overflow-hidden">
        <PanelGroup
          groupRef={panelGroupRef}
          orientation="horizontal"
          className="h-full! w-full!"
        >
          <Panel
            id="sidebar"
            defaultSize={getCollapsibleSidebarPanelSize(
              isCollapsed,
              sidebarWidth,
            )}
            minSize={toPxSize(sidebarConfig.minPx)}
            maxSize={toPxSize(sidebarConfig.maxPx)}
            collapsible
            collapsedSize={toPxSize(0)}
            onResize={handleSidebarResize}
            className="bg-sidebar border-r border-border flex flex-col overflow-y-auto"
          >
            {sidebar}
          </Panel>

          <PanelResizeHandle
            {...resizeHandleProps}
            className="w-1 shrink-0 bg-border/40 hover:bg-accent focus-visible:bg-accent transition-colors cursor-col-resize z-10 relative"
          />

          <Panel id="main" minSize={toPercentSize(20)}>
            <div className="h-full w-full overflow-hidden flex flex-col">
              {children}
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
