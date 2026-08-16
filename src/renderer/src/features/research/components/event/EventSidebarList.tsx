import { type TFunction } from "i18next";

import {
  EntitySidebarList,
  type EntitySidebarGroup,
} from "@renderer/features/research/components/shared/EntitySidebarList";
import type { EventLike } from "@renderer/features/research/components/event/useEventManager";

interface EventSidebarListProps {
  t: TFunction;
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  onViewAll: () => void;
  handleAddEvent: () => void;
  groupedEvents: Record<string, EventLike[]>;
}

export function EventSidebarList({
  t,
  selectedEventId,
  setSelectedEventId,
  onViewAll,
  handleAddEvent,
  groupedEvents,
}: EventSidebarListProps) {
  const groups: EntitySidebarGroup[] = Object.entries(groupedEvents).map(
    ([key, evts]) => ({
      key,
      title: key,
      items: evts.map((evt) => ({
        id: evt.id,
        name: evt.name,
        description: evt.description,
      })),
    }),
  );

  return (
    <EntitySidebarList
      title={t("event.sectionTitle", "Events")}
      onViewAll={onViewAll}
      viewAllLabel={t("event.viewAllTitle", "View All")}
      onAdd={handleAddEvent}
      addLabel={t("event.addTitle", "Add Event")}
      groups={groups}
      selectedId={selectedEventId}
      onSelect={setSelectedEventId}
      emptyDescriptionLabel={t("event.noRole", "No Type")}
    />
  );
}
