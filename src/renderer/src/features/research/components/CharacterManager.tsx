import { useCallback, useRef } from "react";
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
  type GroupImperativeHandle,
} from "react-resizable-panels";
import { User } from "lucide-react";
import WikiDetailView from "@renderer/features/research/components/wiki/WikiDetailView";
import { useTranslation } from "react-i18next";

import {
  useCharacterManager,
  type CharacterLike,
} from "@renderer/features/research/components/character/useCharacterManager";
import { CharacterSidebarList } from "@renderer/features/research/components/character/CharacterSidebarList";
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
} from "@renderer/shared/constants/sidebarSizing";
import { useSidebarResizeCommit } from "@renderer/features/workspace/hooks/useSidebarResizeCommit";
import { useFixedPixelPanelGroupLayout } from "@renderer/features/workspace/hooks/useFixedPixelPanelGroupLayout";
import {
  getCollapsibleSidebarPanelSize,
  shouldHideCollapsibleSidebarLayout,
  useCollapsibleSidebar,
} from "@renderer/features/workspace/hooks/useCollapsibleSidebar";
import { SidebarCollapseStrip } from "@renderer/features/workspace/components/SidebarCollapseStrip";
import { SidebarPeekContent } from "@renderer/features/workspace/components/SidebarPeekContent";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { useTermStore } from "@renderer/features/research/stores/termStore";

export default function CharacterManager() {
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
  const sidebarFeature = "characterSidebar" as const;
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
  const {
    isCollapsed,
    isHydrated: isCollapseHydrated,
    onResize: handleSidebarResize,
    toggle,
  } = useCollapsibleSidebar(sidebarFeature, baseOnResize);

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
  const shouldHideUntilLayoutReady = shouldHideCollapsibleSidebarLayout({
    enableAnimations,
    uiHasHydrated,
    projectLayoutHasHydrated,
    isLayoutReady,
    isCollapseHydrated,
  });

  const {
    selectedCharacterId,
    setSelectedCharacterId,
    isTemplateModalOpen,
    setIsTemplateModalOpen,
    handleAddCharacter,
    handleViewAll,
    groupedCharacters,
    selectedChar,
  } = useCharacterManager(t);

  const allTerms = useTermStore((s) => s.terms);
  const projectTerms = allTerms.filter(
    (term) => term.projectId === currentProjectId,
  );

  const peekGroups = [
    ...Object.entries(groupedCharacters).map(([name, chars]) => ({
      name,
      items: chars.map((c) => ({
        id: c.id,
        label: c.name,
        sublabel: c.description ?? undefined,
      })),
    })),
    ...(projectTerms.length > 0
      ? [
          {
            name: t("world.term.label", "고유명사"),
            items: projectTerms.map((term) => ({
              id: term.id,
              label: term.term,
              sublabel: term.definition ?? undefined,
            })),
          },
        ]
      : []),
  ];

  return (
    <div
      className="relative flex w-full h-full bg-canvas overflow-hidden"
      style={{
        visibility: shouldHideUntilLayoutReady ? "hidden" : undefined,
      }}
    >
      {/* Toggle strip — in flex flow; peek content shown on hover when collapsed */}
      <SidebarCollapseStrip isCollapsed={isCollapsed} onToggle={toggle}>
        <SidebarPeekContent
          groups={peekGroups}
          selectedId={selectedCharacterId}
          onSelect={setSelectedCharacterId}
          addLabel="캐릭터 추가"
          onAdd={handleAddCharacter}
        />
      </SidebarCollapseStrip>

      {/* PanelGroup wrapper — containerRef excludes strip width */}
      <div ref={containerRef} className="flex-1 min-w-0 h-full overflow-hidden">
        <PanelGroup
          groupRef={panelGroupRef}
          orientation="horizontal"
          className="h-full! w-full!"
        >
          {/* LEFT SIDEBAR - Character List */}
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
            <CharacterSidebarList
              t={t}
              selectedCharacterId={selectedCharacterId}
              setSelectedCharacterId={setSelectedCharacterId}
              onViewAll={handleViewAll}
              isTemplateModalOpen={isTemplateModalOpen}
              setIsTemplateModalOpen={setIsTemplateModalOpen}
              handleAddCharacter={handleAddCharacter}
              groupedCharacters={groupedCharacters}
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
              {selectedChar ? (
                <WikiDetailView
                  key={selectedChar.id}
                  characterId={selectedChar.id}
                />
              ) : (
                <CharacterGallery
                  groupedCharacters={groupedCharacters}
                  onSelect={setSelectedCharacterId}
                />
              )}
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

// Sub-component: Gallery View
function CharacterGallery({
  groupedCharacters,
  onSelect,
}: {
  groupedCharacters: Record<string, CharacterLike[]>;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="border-b-2 border-border mb-6 pb-4">
        <div className="text-2xl font-extrabold text-fg leading-tight">
          {t("character.galleryTitle")}
        </div>
      </div>

      {Object.entries(groupedCharacters).map(([group, chars]) => {
        return (
          <div key={group} className="mb-8">
            <div className="text-lg font-bold mb-4 pb-2 border-b-2 text-accent border-b-accent">
              {group}
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6">
              {chars.map((char) => (
                <div
                  key={char.id}
                  className="flex flex-col cursor-pointer hover:bg-surface-hover p-2 rounded transition-colors"
                  onClick={() => onSelect(char.id)}
                >
                  <div className="w-full h-32 bg-surface flex items-center justify-center border-b mb-2 rounded border-accent">
                    <User size={40} className="text-accent" />
                  </div>
                  <div className="font-semibold text-sm mb-0.5">
                    {char.name}
                  </div>
                  <div className="text-xs text-subtle">
                    {char.description || t("character.noRole")}
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
