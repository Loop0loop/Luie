import { useState, useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { type TFunction } from "i18next";
import { useEventStore } from "@renderer/features/research/stores/eventStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";

export type EventLike = {
  id: string;
  name: string;
  description?: string | null;
  attributes?: unknown;
};

export function useEventManager(t: TFunction) {
  const currentProject = useProjectStore((state) => state.currentItem);
  const {
    items: events,
    currentItem: currentEventFromStore,
    loadAll: loadEvents,
    create: createEvent,
    update: updateEvent,
    setCurrent: setCurrentEvent,
  } = useEventStore(
    useShallow((state) => ({
      items: state.items,
      currentItem: state.currentItem,
      loadAll: state.loadAll,
      create: state.create,
      update: state.update,
      setCurrent: state.setCurrent,
    })),
  );

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Sync with global store selection
  useEffect(() => {
    if (
      currentEventFromStore?.id &&
      currentEventFromStore.id !== selectedEventId
    ) {
      const syncTimer = window.setTimeout(() => {
        setSelectedEventId(currentEventFromStore.id);
      }, 0);
      return () => window.clearTimeout(syncTimer);
    }
    return undefined;
  }, [currentEventFromStore, selectedEventId]);

  useEffect(() => {
    if (currentProject) {
      loadEvents(currentProject.id);
    }
  }, [currentProject, loadEvents]);

  useEffect(() => {
    if (!selectedEventId) {
      return;
    }
    if ((events as EventLike[]).some((item) => item.id === selectedEventId)) {
      return;
    }
    const clearTimer = window.setTimeout(() => {
      setSelectedEventId(null);
    }, 0);
    return () => window.clearTimeout(clearTimer);
  }, [events, selectedEventId]);

  const handleAddEvent = async () => {
    if (currentProject) {
      const newEvt = await createEvent({
        projectId: currentProject.id,
        name: t("event.defaults.name", "New Event"),
        description: t("event.uncategorized", "Uncategorized"),
        attributes: {},
      });
      if (newEvt) {
        setSelectedEventId(newEvt.id);
      }
    }
  };

  const handleViewAll = () => {
    setCurrentEvent(null);
    setSelectedEventId(null);
  };

  // Grouping Logic
  const groupedEvents = useMemo(() => {
    const groups: Record<string, EventLike[]> = {};
    const list = events as EventLike[];

    list.forEach((evt) => {
      const group =
        evt.description?.trim() || t("event.uncategorized", "Uncategorized");
      if (!groups[group]) groups[group] = [];
      groups[group].push(evt);
    });

    return groups;
  }, [events, t]);

  // Selected Event Data
  const selectedEvent = useMemo(
    () => (events as EventLike[]).find((e) => e.id === selectedEventId),
    [events, selectedEventId],
  );

  return {
    selectedEventId,
    setSelectedEventId,
    handleAddEvent,
    handleViewAll,
    groupedEvents,
    selectedEvent,
    updateEvent,
  };
}
