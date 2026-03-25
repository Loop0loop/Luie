import { create } from "zustand";
import type { Event } from "@shared/types";
import {
    createAliasSetter,
    createCRUDSlice,
    withProjectScopedGetAll,
} from "@renderer/shared/store/createCRUDStore";
import type { CRUDStore } from "@renderer/shared/store/createCRUDStore";
import {
    type EventCreateInput,
    type EventUpdateInput,
} from "@shared/types";
import { api } from "@shared/api";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { refreshWorldGraph } from "@renderer/features/research/utils/worldGraphRefresh";
import { runWithProjectLock } from "@renderer/features/research/utils/projectMutationLock";

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
    deleteEvent: (id: string) => Promise<boolean>;
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
    const mutationLocks = new Set<string>();

    const apiClient = withProjectScopedGetAll(api.event);

    const crudSlice = createCRUDSlice<
        Event,
        EventCreateInput,
        EventUpdateInput
    >(apiClient, "Event")(setWithAlias, _get, store);

    const reloadCurrentGraph = async (projectId?: string | null) => {
        await refreshWorldGraph(
            projectId ?? useProjectStore.getState().currentItem?.id,
        );
    };

    const createEventWithSync = async (input: EventCreateInput) => {
        const projectId =
            input.projectId ?? useProjectStore.getState().currentItem?.id;
        if (!projectId) {
            return null;
        }

        return await runWithProjectLock(mutationLocks, projectId, async () => {
            const created = await crudSlice.create({
                ...input,
                projectId,
            });
            if (!created) {
                return null;
            }
            await reloadCurrentGraph(projectId);
            return created;
        });
    };

    const updateEventWithSync = async (input: EventUpdateInput) => {
        const projectId = useProjectStore.getState().currentItem?.id;
        if (!projectId) {
            return;
        }

        await runWithProjectLock(mutationLocks, projectId, async () => {
            await crudSlice.update(input);
            await reloadCurrentGraph(projectId);
        });
    };

    const deleteEventWithSync = async (id: string) => {
        const projectId = useProjectStore.getState().currentItem?.id;
        if (!projectId) {
            return false;
        }

        return (
            (await runWithProjectLock(mutationLocks, projectId, async () => {
                const deleted = await crudSlice.delete(id);
                if (!deleted) {
                    return false;
                }
                await reloadCurrentGraph(projectId);
                return true;
            })) ?? false
        );
    };

    return {
        ...crudSlice,
        create: createEventWithSync,
        update: updateEventWithSync,
        delete: deleteEventWithSync,
        loadEvents: (projectId: string) => crudSlice.loadAll(projectId),
        loadEvent: (id: string) => crudSlice.loadOne(id),
        createEvent: async (input: EventCreateInput) => {
            await createEventWithSync(input);
        },
        updateEvent: async (input: EventUpdateInput) => {
            await updateEventWithSync(input);
        },
        deleteEvent: async (id: string) => await deleteEventWithSync(id),
        setCurrentEvent: (event: Event | null) =>
            crudSlice.setCurrent(event),

        events: crudSlice.items,
        currentEvent: crudSlice.currentItem,
    };
});
