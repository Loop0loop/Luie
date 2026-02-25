import { create } from "zustand";
import type { Event } from "@shared/types";
import {
    createAliasSetter,
    createCRUDSlice,
    withProjectScopedGetAll,
} from "@shared/utils/createCRUDStore";
import type { CRUDStore } from "@shared/utils/createCRUDStore";
import {
    type EventCreateInput,
    type EventUpdateInput,
} from "@shared/types";
import { api } from "@shared/api";

type BaseEventStore = CRUDStore<
    Event,
    EventCreateInput,
    EventUpdateInput
>;

interface EventStore extends BaseEventStore {
    loadEvents: (projectId: string) => Promise<void>;
    loadEvent: (id: string) => Promise<void>;
    createEvent: (input: EventCreateInput) => Promise<void>;
    updateEvent: (input: EventUpdateInput) => Promise<void>;
    deleteEvent: (id: string) => Promise<void>;
    setCurrentEvent: (event: Event | null) => void;

    events: Event[];
    currentEvent: Event | null;
}

export const useEventStore = create<EventStore>((set, _get, store) => {
    const setWithAlias = createAliasSetter<EventStore, Event>(
        set,
        "events",
        "currentEvent",
    );

    const apiClient = withProjectScopedGetAll(api.event);

    const crudSlice = createCRUDSlice<
        Event,
        EventCreateInput,
        EventUpdateInput
    >(apiClient, "Event")(setWithAlias, _get, store);

    return {
        ...crudSlice,
        loadEvents: (projectId: string) => crudSlice.loadAll(projectId),
        loadEvent: (id: string) => crudSlice.loadOne(id),
        createEvent: async (input: EventCreateInput) => {
            await crudSlice.create(input);
        },
        updateEvent: async (input: EventUpdateInput) => {
            await crudSlice.update(input);
        },
        deleteEvent: (id: string) => crudSlice.delete(id),
        setCurrentEvent: (event: Event | null) =>
            crudSlice.setCurrent(event),

        events: crudSlice.items,
        currentEvent: crudSlice.currentItem,
    };
});
