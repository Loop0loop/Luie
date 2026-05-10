import { useCallback, useRef } from "react";
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
  type GroupImperativeHandle,
} from "react-resizable-panels";
import { Calendar } from "lucide-react";
import EventDetailView from "@renderer/features/research/components/event/EventDetailView";
import { useTranslation } from "react-i18next";

import {
  useEventManager,
  type EventLike,
} from "@renderer/features/research/components/event/useEventManager";
import { EventSidebarList } from "@renderer/features/research/components/event/EventSidebarList";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useProjectLayoutStore } from "@renderer/features/workspace/stores/projectLayoutStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useShallow } from "zustand/react/shallow";
import {
  clampSidebarWidth,
  getSidebarDefaultWidth,
  getSidebarWidthConfig,
  toPercentSize,
  toPxSize,
} from "@shared/constants/sidebarSizing";
import { useSidebarResizeCommit } from "@renderer/features/workspace/hooks/useSidebarResizeCommit";
import { useFixedPixelPanelGroupLayout } from "@renderer/features/workspace/hooks/useFixedPixelPanelGroupLayout";
import { useCollapsibleSidebar } from "@renderer/features/workspace/hooks/useCollapsibleSidebar";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";

export default function EventManager() {
  const { t } = useTranslation();
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
  const sidebarFeature = "eventSidebar" as const;
  const sidebarConfig = getSidebarWidthConfig(sidebarFeature);
  const sidebarWidth = clampSidebarWidth(
    sidebarFeature,
    sidebarWidths[sidebarFeature] || getSidebarDefaultWidth(sidebarFeature),
  );
  const commitSidebarWidth = useCallback(
    (feature: string, width: number) => {
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
  const { isCollapsed, onResize: handleSidebarResize } =
    useCollapsibleSidebar(baseOnResize);

  const { isLayoutReady } = useFixedPixelPanelGroupLayout({
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
  const shouldHideUntilLayoutReady =
    !enableAnimations &&
    (!uiHasHydrated || !projectLayoutHasHydrated || !isLayoutReady);

  const {
    selectedEventId,
    setSelectedEventId,
    handleAddEvent,
    handleViewAll,
    groupedEvents,
    selectedEvent,
  } = useEventManager(t);

  return (
    <div
      ref={containerRef}
      className="flex w-full h-full bg-canvas overflow-hidden"
      style={{
        visibility: shouldHideUntilLayoutReady ? "hidden" : undefined,
      }}
    >
      <PanelGroup
        groupRef={panelGroupRef}
        orientation="horizontal"
        className="h-full! w-full!"
      >
        {/* LEFT SIDEBAR - Event List */}
        <Panel
          id="sidebar"
          defaultSize={toPxSize(sidebarWidth)}
          minSize={toPxSize(sidebarConfig.minPx)}
          maxSize={toPxSize(sidebarConfig.maxPx)}
          collapsible
          collapsedSize={toPxSize(0)}
          onResize={handleSidebarResize}
          className="bg-sidebar border-r border-border flex flex-col overflow-y-auto"
        >
          <EventSidebarList
            t={t}
            selectedEventId={selectedEventId}
            setSelectedEventId={setSelectedEventId}
            onViewAll={handleViewAll}
            handleAddEvent={handleAddEvent}
            groupedEvents={groupedEvents}
          />
        </Panel>

        {/* Resizer Handle */}
        <PanelResizeHandle
          {...resizeHandleProps}
          className="w-1 shrink-0 bg-border/40 hover:bg-accent focus-visible:bg-accent transition-colors cursor-col-resize z-10 relative"
        ></PanelResizeHandle>

        {/* RIGHT MAIN - Wiki View */}
        <Panel id="main" minSize={toPercentSize(20)}>
          <div className="h-full w-full overflow-hidden flex flex-col">
            {selectedEvent ? (
              <EventDetailView
                key={selectedEvent.id}
                eventId={selectedEvent.id}
              />
            ) : (
              <EventGallery
                groupedEvents={groupedEvents}
                onSelect={setSelectedEventId}
              />
            )}
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}

// Sub-component: Gallery View
function EventGallery({
  groupedEvents,
  onSelect,
}: {
  groupedEvents: Record<string, EventLike[]>;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="border-b-2 border-border mb-6 pb-4">
        <div className="text-2xl font-extrabold text-fg leading-tight">
          {t("event.galleryTitle", "Event Overview")}
        </div>
      </div>

      {Object.entries(groupedEvents).map(([group, events]) => {
        return (
          <div key={group} className="mb-8">
            <div className="text-lg font-bold mb-4 pb-2 border-b-2 text-accent border-b-accent">
              {group}
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col cursor-pointer hover:bg-surface-hover p-2 rounded transition-colors"
                  onClick={() => onSelect(event.id)}
                >
                  <div className="w-full h-32 bg-surface flex items-center justify-center border-b mb-2 rounded border-accent">
                    <Calendar size={40} className="text-accent" />
                  </div>
                  <div className="font-semibold text-sm mb-0.5">
                    {event.name}
                  </div>
                  <div className="text-xs text-subtle">
                    {event.description || t("event.noRole", "No Type")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
