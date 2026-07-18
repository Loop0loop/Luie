import { Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import FactionDetailView from "@renderer/features/research/components/faction/FactionDetailView";
import { useFactionManager } from "@renderer/features/research/components/faction/useFactionManager";
import {
  EntityGallery,
  type EntityGallerySortMode,
  type EntityGalleryViewMode,
} from "@renderer/features/research/components/wiki/EntityGallery";

type FactionManagerProps = {
  query?: string;
  onQueryChange?: (query: string) => void;
  viewMode?: EntityGalleryViewMode;
  onViewModeChange?: (viewMode: EntityGalleryViewMode) => void;
  sortMode?: EntityGallerySortMode;
  onSortModeChange?: (sortMode: EntityGallerySortMode) => void;
};

export default function FactionManager({
  query,
  onQueryChange,
  viewMode,
  onViewModeChange,
  sortMode,
  onSortModeChange,
}: FactionManagerProps) {
  const { t } = useTranslation();
  const {
    setSelectedFactionId,
    handleAddFaction,
    handleViewAll,
    groupedFactions,
    selectedFaction,
  } = useFactionManager(t);

  return (
    <>
      {selectedFaction ? (
        <FactionDetailView
          key={selectedFaction.id}
          factionId={selectedFaction.id}
          onBack={handleViewAll}
        />
      ) : (
        <EntityGallery
          groups={groupedFactions}
          onSelect={setSelectedFactionId}
          title={t("faction.galleryTitle", "Faction Overview")}
          noDescriptionLabel={t("faction.noRole", "No Type")}
          icon={Shield}
          onAdd={handleAddFaction}
          query={query}
          onQueryChange={onQueryChange}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          sortMode={sortMode}
          onSortModeChange={onSortModeChange}
        />
      )}
    </>
  );
}
