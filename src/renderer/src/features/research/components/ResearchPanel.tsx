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
import {
  RESEARCH_CATALOG_ITEMS,
  type ResearchCatalogId,
} from "@renderer/features/workspace/constants/researchInformationArchitecture";
import type {
  EntityGallerySortMode,
  EntityGalleryViewMode,
} from "@renderer/features/research/components/wiki/EntityGallery";

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

  const tabs = RESEARCH_CATALOG_ITEMS.map((item) => ({
    id: item.id,
    label: t(item.titleKey),
    icon: RESEARCH_TAB_ICONS[item.id],
  }));
  const primaryTabs = tabs.filter(
    (tab) => tab.id === "character" || tab.id === "faction" || tab.id === "event",
  );
  const canSwitchPrimaryTabs = primaryTabs.some((tab) => tab.id === visibleTab);
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
  const galleryTabs = canSwitchPrimaryTabs ? (
    <>
      <nav
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
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {visibleTab === "character" && (
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
              tabs={galleryTabs}
              onClose={onClose}
            />
          </FeatureErrorBoundary>
        )}
        {visibleTab === "event" && (
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
              tabs={galleryTabs}
              onClose={onClose}
            />
          </FeatureErrorBoundary>
        )}
        {visibleTab === "faction" && (
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
              tabs={galleryTabs}
              onClose={onClose}
            />
          </FeatureErrorBoundary>
        )}
        {visibleTab === "scrap" && <FeatureErrorBoundary featureName="Scrap"><ResearchScrapPanel /></FeatureErrorBoundary>}
        {visibleTab === "plotboard" && <FeatureErrorBoundary featureName="Plotboard"><ResearchPlotboardPanel /></FeatureErrorBoundary>}
        {visibleTab === "untitled" && <FeatureErrorBoundary featureName="Story Line"><UntitledResearchPanel /></FeatureErrorBoundary>}
      </div>
    </div>
  );
}
