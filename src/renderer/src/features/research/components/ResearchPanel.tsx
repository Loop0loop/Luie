import React from "react";
import { useTranslation } from "react-i18next";
import { User, Calendar, Menu, Shield, BookOpen, GitBranch, Workflow } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import CharacterManager from "@renderer/features/research/components/CharacterManager";
import EventManager from "@renderer/features/research/components/event/EventManager";
import FactionManager from "@renderer/features/research/components/faction/FactionManager";
import {
  ResearchPlotboardPanel,
  ResearchScrapPanel,
  UntitledResearchPanel,
} from "@renderer/features/research/components/ResearchCatalogPanels";
import { cn } from "@shared/types/utils";
import { FeatureErrorBoundary } from "@renderer/shared/error-boundaries/FeatureErrorBoundary";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import {
  RESEARCH_CATALOG_ITEMS,
  type ResearchCatalogId,
} from "@renderer/features/workspace/constants/researchInformationArchitecture";
import type {
  EntityGallerySortMode,
  EntityGalleryViewMode,
} from "@renderer/features/research/components/wiki/EntityGallery";

// NOTE: 탭 컨텐츠 전환. 항상 오른쪽에서 스르륵 들어온다. duration-700은 transition-duration만
// 바꾸므로 animate-in(기본 150ms)에 효과가 없다 — animation-duration/timing-function을
// 임의 속성으로 직접 지정해 부드러운 감속 이징을 준다.
const TAB_ENTER_ANIMATION =
  "animate-in slide-in-from-right-4 fade-in [animation-duration:700ms] [animation-timing-function:cubic-bezier(0.16,1,0.3,1)]";

export type ResearchPanelTab =
  | "character"
  | "event"
  | "faction"
  | "world"
  | "scrap"
  | "analysis"
  | "synopsis"
  | "plotboard"
  | "untitled"
  | "canvas"
  | "snapshot"
  | "trash";

interface ResearchPanelProps {
  activeTab: ResearchPanelTab;
  onClose?: () => void;
  onTabChange?: (tab: ResearchPanelTab) => void;
}

type PrimaryResearchTab = "character" | "event" | "faction";

type GalleryState = {
  query: string;
  viewMode: EntityGalleryViewMode;
  sortMode: EntityGallerySortMode;
};

const INITIAL_GALLERY_STATES: Record<PrimaryResearchTab, GalleryState> = {
  character: { query: "", viewMode: "grid", sortMode: "group" },
  faction: { query: "", viewMode: "grid", sortMode: "group" },
  event: { query: "", viewMode: "grid", sortMode: "group" },
};

const RESEARCH_TAB_ICONS: Record<ResearchCatalogId, React.ElementType> = {
  character: User,
  event: Calendar,
  faction: Shield,
  scrap: BookOpen,
  plotboard: GitBranch,
  untitled: Workflow,
};

export default function ResearchPanel({
  activeTab,
  onClose,
  onTabChange,
}: ResearchPanelProps) {
  const { t } = useTranslation();
  const [localTabState, setLocalTabState] = React.useState({
    sourceTab: activeTab,
    tab: activeTab,
  });
  const [galleryStates, setGalleryStates] = React.useState(
    INITIAL_GALLERY_STATES,
  );
  const normalizeTab = (tab: ResearchPanelTab): ResearchPanelTab => {
    if (tab === "world") return "scrap";
    if (tab === "synopsis") return "plotboard";
    if (tab === "analysis") return "untitled";
    return tab;
  };
  const normalizedActiveTab = normalizeTab(activeTab);
  const normalizedLocalTab = normalizeTab(localTabState.tab);
  const visibleTab = onTabChange
    ? normalizedActiveTab
    : localTabState.sourceTab === activeTab
      ? normalizedLocalTab
      : normalizedActiveTab;
  const enableAnimations = useEditorStore((state) => state.enableAnimations);

  const tabs = RESEARCH_CATALOG_ITEMS.map((item) => ({
    id: item.id,
    label: t(item.titleKey),
    icon: RESEARCH_TAB_ICONS[item.id],
  }));
  const primaryTabs = tabs.filter(
    (tab) => tab.id === "character" || tab.id === "faction" || tab.id === "event",
  );
  const canSwitchPrimaryTabs = primaryTabs.some((tab) => tab.id === visibleTab);

  // NOTE: primary 탭(등장인물/사건/세력)은 keep-alive다. 탭 전환마다 매니저를
  // 해체/재마운트하면 수백 개 DOM 노드 재생성이 전환 애니메이션 도중 메인 스레드를
  // 점유해 슬라이드가 끊기고, 그 창의 클릭이 유실됐다. 한 번 연 탭은 마운트 유지하고
  // 표시만 전환한다(숨긴 패널은 display:none이라 레이아웃 비용 없음).
  const [visitedPrimaryTabs, setVisitedPrimaryTabs] = React.useState<
    ReadonlySet<string>
  >(() => new Set(canSwitchPrimaryTabs ? [visibleTab] : []));
  if (canSwitchPrimaryTabs && !visitedPrimaryTabs.has(visibleTab)) {
    setVisitedPrimaryTabs(new Set([...visitedPrimaryTabs, visibleTab]));
  }

  const selectTab = (tab: ResearchPanelTab) => {
    if (onTabChange) {
      onTabChange(tab);
      return;
    }
    setLocalTabState({ sourceTab: activeTab, tab });
  };
  const updateGalleryState = (
    tab: PrimaryResearchTab,
    patch: Partial<GalleryState>,
  ) => {
    setGalleryStates((states) => ({
      ...states,
      [tab]: { ...states[tab], ...patch },
    }));
  };
  // NOTE: 탭 바는 매니저(gallery) 내부에 두면 탭 전환마다 매니저 리마운트와 함께
  // 해체·재생성된다 → 헤더가 깜빡이고("되다 만" 느낌) 재생성 도중의 클릭이 유실됐다.
  // ResearchPanel 레벨에 고정 행으로 올려 절대 리마운트되지 않게 한다.
  const primaryTabsNav = canSwitchPrimaryTabs ? (
    <>
      <nav
        data-testid="research-tab-nav"
        className="flex min-w-0 items-center gap-1 overflow-x-auto no-scrollbar @max-[680px]:hidden"
        aria-label={t("sidebar.section.research", "자료")}
        role="tablist"
      >
        {primaryTabs.map((tab) => {
          const isActive = visibleTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "relative flex h-7 shrink-0 items-center whitespace-nowrap rounded-control px-2.5 text-xs font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-element text-fg shadow-xs font-semibold"
                  : "text-muted hover:bg-surface-hover hover:text-fg",
              )}
              title={tab.label}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="hidden size-7 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-hover hover:text-fg @max-[680px]:flex"
            aria-label={t("sidebar.section.research", "자료")}
          >
            <Menu className="icon-sm" aria-hidden="true" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            className="z-dropdown min-w-32 rounded-panel border border-border bg-panel p-1 shadow-panel"
            sideOffset={4}
          >
            {primaryTabs.map((tab) => (
              <DropdownMenu.Item
                key={tab.id}
                className={cn(
                  "cursor-pointer rounded-control px-2.5 py-2 text-xs outline-hidden hover:bg-surface-hover focus:bg-surface-hover",
                  visibleTab === tab.id ? "text-accent" : "text-fg",
                )}
                onSelect={() => selectTab(tab.id)}
              >
                {tab.label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  ) : undefined;

  return (
    <div className="research-surface flex h-full w-full flex-col overflow-hidden">
      {canSwitchPrimaryTabs && (
        <div
          className="flex shrink-0 items-center gap-2 bg-sidebar px-4 py-1.5"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          {primaryTabsNav}
        </div>
      )}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {visitedPrimaryTabs.has("character") && (
          <div
            data-testid="research-tab-content-character"
            className={cn(
              "min-h-0 flex-1 flex-col",
              visibleTab === "character" ? "flex" : "hidden",
              visibleTab === "character" &&
                enableAnimations &&
                TAB_ENTER_ANIMATION,
            )}
          >
            <FeatureErrorBoundary featureName="Characters">
              <CharacterManager
                query={galleryStates.character.query}
                onQueryChange={(query) => updateGalleryState("character", { query })}
                viewMode={galleryStates.character.viewMode}
                onViewModeChange={(viewMode) =>
                  updateGalleryState("character", { viewMode })
                }
                sortMode={galleryStates.character.sortMode}
                onSortModeChange={(sortMode) =>
                  updateGalleryState("character", { sortMode })
                }
                onClose={onClose}
              />
            </FeatureErrorBoundary>
          </div>
        )}
        {visitedPrimaryTabs.has("event") && (
          <div
            data-testid="research-tab-content-event"
            className={cn(
              "min-h-0 flex-1 flex-col",
              visibleTab === "event" ? "flex" : "hidden",
              visibleTab === "event" &&
                enableAnimations &&
                TAB_ENTER_ANIMATION,
            )}
          >
            <FeatureErrorBoundary featureName="Events">
              <EventManager
                query={galleryStates.event.query}
                onQueryChange={(query) => updateGalleryState("event", { query })}
                viewMode={galleryStates.event.viewMode}
                onViewModeChange={(viewMode) =>
                  updateGalleryState("event", { viewMode })
                }
                sortMode={galleryStates.event.sortMode}
                onSortModeChange={(sortMode) =>
                  updateGalleryState("event", { sortMode })
                }
                onClose={onClose}
              />
            </FeatureErrorBoundary>
          </div>
        )}
        {visitedPrimaryTabs.has("faction") && (
          <div
            data-testid="research-tab-content-faction"
            className={cn(
              "min-h-0 flex-1 flex-col",
              visibleTab === "faction" ? "flex" : "hidden",
              visibleTab === "faction" &&
                enableAnimations &&
                TAB_ENTER_ANIMATION,
            )}
          >
            <FeatureErrorBoundary featureName="Factions">
              <FactionManager
                query={galleryStates.faction.query}
                onQueryChange={(query) => updateGalleryState("faction", { query })}
                viewMode={galleryStates.faction.viewMode}
                onViewModeChange={(viewMode) =>
                  updateGalleryState("faction", { viewMode })
                }
                sortMode={galleryStates.faction.sortMode}
                onSortModeChange={(sortMode) =>
                  updateGalleryState("faction", { sortMode })
                }
                onClose={onClose}
              />
            </FeatureErrorBoundary>
          </div>
        )}
        {visibleTab === "scrap" && (
          <div
            data-testid="research-tab-content-scrap"
            className={cn("flex min-h-0 flex-1 flex-col", enableAnimations && TAB_ENTER_ANIMATION)}
          >
            <FeatureErrorBoundary featureName="Scrap"><ResearchScrapPanel onClose={onClose} /></FeatureErrorBoundary>
          </div>
        )}
        {visibleTab === "plotboard" && (
          <div
            data-testid="research-tab-content-plotboard"
            className={cn("flex min-h-0 flex-1 flex-col", enableAnimations && TAB_ENTER_ANIMATION)}
          >
            <FeatureErrorBoundary featureName="Plotboard"><ResearchPlotboardPanel onClose={onClose} /></FeatureErrorBoundary>
          </div>
        )}
        {visibleTab === "untitled" && (
          <div
            data-testid="research-tab-content-untitled"
            className={cn("flex min-h-0 flex-1 flex-col", enableAnimations && TAB_ENTER_ANIMATION)}
          >
            <FeatureErrorBoundary featureName="Story Line"><UntitledResearchPanel /></FeatureErrorBoundary>
          </div>
        )}
      </div>
    </div>
  );
}
