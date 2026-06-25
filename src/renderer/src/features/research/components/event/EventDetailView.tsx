import { Calendar } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { EntityDetailView } from "@renderer/features/research/components/wiki/EntityDetailView";
import { useEventStore } from "@renderer/features/research/stores/eventStore";

const EVENT_SECTIONS = [
  { id: "overview", labelKey: "overview", fallback: "Overview" },
  { id: "timeline", labelKey: "timeline", fallback: "Timeline" },
  { id: "locations", labelKey: "locations", fallback: "Locations" },
  { id: "participants", labelKey: "participants", fallback: "Participants" },
  { id: "notes", labelKey: "notes", fallback: "Notes" },
];

interface EventDetailViewProps {
  eventId?: string;
}

export default function EventDetailView({ eventId }: EventDetailViewProps) {
  const { currentItem, updateEvent, loadEvent } = useEventStore(
    useShallow((state) => ({
      currentItem: state.currentItem,
      updateEvent: state.updateEvent,
      loadEvent: state.loadEvent,
    })),
  );

  return (
    <EntityDetailView
      entity={currentItem}
      entityId={eventId}
      entityKind="event"
      icon={<Calendar size={80} color="var(--border-active)" />}
      loadEntity={loadEvent}
      updateEntity={updateEvent}
      prefix="event"
      sections={EVENT_SECTIONS}
      storagePrefix="event-view-mode"
      noSelectionFallback="No Event Selected"
      templateFallback="Basic Event"
    />
  );
}
