import { Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import EventDetailView from "@renderer/features/research/components/event/EventDetailView";
import { EventSidebarList } from "@renderer/features/research/components/event/EventSidebarList";
import { useEventManager } from "@renderer/features/research/components/event/useEventManager";
import { EntityGallery } from "@renderer/features/research/components/wiki/EntityGallery";
import { EntityManagerShell } from "@renderer/features/research/components/wiki/EntityManagerShell";

export default function EventManager() {
  const { t } = useTranslation();
  const {
    selectedEventId,
    setSelectedEventId,
    handleAddEvent,
    handleViewAll,
    groupedEvents,
    selectedEvent,
  } = useEventManager(t);

  return (
    <EntityManagerShell
      sidebarFeature="eventSidebar"
      peekGroups={Object.entries(groupedEvents).map(([name, events]) => ({
        name,
        items: events.map((event) => ({
          id: event.id,
          label: event.name,
          sublabel: event.description ?? undefined,
        })),
      }))}
      selectedId={selectedEventId}
      onSelect={setSelectedEventId}
      addLabel="사건 추가"
      onAdd={handleAddEvent}
      sidebar={
        <EventSidebarList
          t={t}
          selectedEventId={selectedEventId}
          setSelectedEventId={setSelectedEventId}
          onViewAll={handleViewAll}
          handleAddEvent={handleAddEvent}
          groupedEvents={groupedEvents}
        />
      }
    >
      {selectedEvent ? (
        <EventDetailView key={selectedEvent.id} eventId={selectedEvent.id} />
      ) : (
        <EntityGallery
          groups={groupedEvents}
          onSelect={setSelectedEventId}
          title={t("event.galleryTitle", "Event Overview")}
          noDescriptionLabel={t("event.noRole", "No Type")}
          icon={Calendar}
        />
      )}
    </EntityManagerShell>
  );
}
