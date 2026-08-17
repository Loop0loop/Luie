import { Calendar } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import EventDetailView from "@renderer/features/research/components/event/EventDetailView";
import { useEventManager } from "@renderer/features/research/components/event/useEventManager";
import {
  EntityGallery,
  type EntityGallerySortMode,
  type EntityGalleryViewMode,
} from "@renderer/features/research/components/wiki/EntityGallery";

type EventManagerProps = {
  query?: string;
  onQueryChange?: (query: string) => void;
  viewMode?: EntityGalleryViewMode;
  onViewModeChange?: (viewMode: EntityGalleryViewMode) => void;
  sortMode?: EntityGallerySortMode;
  onSortModeChange?: (sortMode: EntityGallerySortMode) => void;
  tabs?: ReactNode;
  onClose?: () => void;
};

export default function EventManager({
  query,
  onQueryChange,
  viewMode,
  onViewModeChange,
  sortMode,
  onSortModeChange,
  tabs,
  onClose,
}: EventManagerProps) {
  const { t } = useTranslation();
  const {
    setSelectedEventId,
    handleAddEvent,
    handleViewAll,
    groupedEvents,
    selectedEvent,
  } = useEventManager(t);

  return (
    <>
      {selectedEvent ? (
        <EventDetailView
          key={selectedEvent.id}
          eventId={selectedEvent.id}
          onBack={handleViewAll}
        />
      ) : (
        <EntityGallery
          groups={groupedEvents}
          onSelect={setSelectedEventId}
          title={t("event.galleryTitle", "Event Overview")}
          noDescriptionLabel={t("event.noRole", "No Type")}
          icon={Calendar}
          onAdd={handleAddEvent}
          query={query}
          onQueryChange={onQueryChange}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          sortMode={sortMode}
          onSortModeChange={onSortModeChange}
          tabs={tabs}
          onClose={onClose}
        />
      )}
    </>
  );
}
