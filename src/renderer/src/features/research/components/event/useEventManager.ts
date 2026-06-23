import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { type TFunction } from "i18next";
import { useEventStore } from "@renderer/features/research/stores/eventStore";
import { useEntityManager } from "@renderer/features/research/hooks/useEntityManager";

export type EventLike = {
  id: string;
  name: string;
  description?: string | null;
  attributes?: unknown;
};

export function useEventManager(t: TFunction) {
  const { items, currentItem, loadAll, create, update, setCurrent } =
    useEventStore(
      useShallow((state) => ({
        items: state.items as EventLike[],
        currentItem: state.currentItem,
        loadAll: state.loadAll,
        create: state.create,
        update: state.update,
        setCurrent: state.setCurrent,
      })),
    );

  const {
    currentProject,
    selectedId: selectedEventId,
    setSelectedId: setSelectedEventId,
    selectedItem: selectedEvent,
    grouped: groupedEvents,
    handleViewAll,
  } = useEntityManager<EventLike>({
    store: {
      items,
      currentItem,
      loadAll,
      setCurrent: setCurrent as (item: EventLike | null) => void,
    },
    uncategorizedKey: "event.uncategorized",
    t,
  });

  const handleAddEvent = useCallback(async () => {
    if (!currentProject) return;
    const newEvt = await create({
      projectId: currentProject.id,
      name: t("event.defaults.name", "New Event"),
      description: t("event.uncategorized", "Uncategorized"),
      attributes: {},
    });
    if (newEvt) {
      setSelectedEventId(newEvt.id);
    }
  }, [create, currentProject, setSelectedEventId, t]);

  return {
    selectedEventId,
    setSelectedEventId,
    handleAddEvent,
    handleViewAll,
    groupedEvents,
    selectedEvent,
    updateEvent: update,
  };
}
