import React from "react";
import { useTranslation } from "react-i18next";
import { Globe, User, Sparkles, FileText, BookOpen, Calendar, Shield } from "lucide-react";
import CharacterManager from "@renderer/features/research/components/CharacterManager";
import EventManager from "@renderer/features/research/components/event/EventManager";
import FactionManager from "@renderer/features/research/components/faction/FactionManager";
import MemoSection from "@renderer/features/research/components/MemoSection";
import WorldSection from "@renderer/features/research/components/WorldSection";
import AnalysisSection from "@renderer/features/research/components/AnalysisSection";
import SynopsisSection from "@renderer/features/research/components/SynopsisSection";
import { cn } from "@shared/types/utils";
import { FeatureErrorBoundary } from "@renderer/shared/error-boundaries/FeatureErrorBoundary";
import { useAnalysisStore } from "@renderer/features/research/stores/analysisStore";
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

export default function ResearchPanel({
  activeTab,
  onClose,
  onTabChange,
}: ResearchPanelProps) {
  const { t } = useTranslation();
  const viewMode = useAnalysisStore((state) => state.viewMode);
  const [localTabState, setLocalTabState] = React.useState({
    sourceTab: activeTab,
    tab: activeTab,
  });
  const [galleryStates, setGalleryStates] = React.useState(
    INITIAL_GALLERY_STATES,
  );
  const visibleTab = onTabChange
    ? activeTab
    : localTabState.sourceTab === activeTab
      ? localTabState.tab
      : activeTab;

  // 플로팅으로 전환되면 사이드바의 분석 패널은 닫는다 (플로팅 창으로 치환)
  React.useEffect(() => {
    if (visibleTab === "analysis" && viewMode === "floatingView") {
      onClose?.();
    }
  }, [visibleTab, viewMode, onClose]);

  const tabs: { id: "character" | "event" | "faction" | "world" | "synopsis" | "scrap" | "analysis"; icon: React.ElementType; label: string }[] = [
    { id: 'character', label: t("research.title.characters", "Characters"), icon: User },
    { id: 'event', label: t("research.title.events", "Events"), icon: Calendar },
    { id: 'faction', label: t("research.title.factions", "Factions"), icon: Shield },
    { id: 'world', label: t("research.title.world", "World"), icon: Globe },
    { id: 'synopsis', label: t("sidebar.item.synopsis", "Synopsis"), icon: FileText },
    { id: 'scrap', label: t("research.title.scrap", "Scrap"), icon: BookOpen },
    { id: 'analysis', label: t("research.title.analysis", "Analysis"), icon: Sparkles }
  ];
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
    <nav
      className="flex h-full min-w-0 items-center gap-1"
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
              "relative flex h-7 items-center rounded-control px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
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
  ) : undefined;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-sidebar">
      <div className="relative flex flex-1 flex-col overflow-hidden bg-app">
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
            />
          </FeatureErrorBoundary>
        )}
        {visibleTab === "world" && <FeatureErrorBoundary featureName="World"><WorldSection /></FeatureErrorBoundary>}
        {visibleTab === "scrap" && <FeatureErrorBoundary featureName="Scrap"><MemoSection /></FeatureErrorBoundary>}
        {visibleTab === "analysis" && viewMode === "fixView" && (
          <FeatureErrorBoundary featureName="Analysis">
            <AnalysisSection />
          </FeatureErrorBoundary>
        )}
        {visibleTab === "synopsis" && <FeatureErrorBoundary featureName="Synopsis"><SynopsisSection /></FeatureErrorBoundary>}
      </div>
    </div>
  );
}
