import { create } from "zustand";
import type {
  Event,
  EventCreateInput,
  EventUpdateInput,
} from "@shared/types";
import { withProjectScopedGetAll } from "@renderer/shared/store/createCRUDStore";
import { createWorldEntityCRUDStore } from "@renderer/shared/store/createWorldEntityCRUDStore";
import { api } from "@shared/api";

interface EventAliases {
  loadEvents: (projectId: string) => Promise<void>;
  loadEvent: (id: string) => Promise<void>;
  createEvent: (input: EventCreateInput) => Promise<void>;
  updateEvent: (input: EventUpdateInput) => Promise<void>;
  deleteEvent: (id: string) => Promise<boolean>;
  setCurrentEvent: (event: Event | null) => void;
  events: Event[];
  currentEvent: Event | null;
}

export const useEventStore = create(
  createWorldEntityCRUDStore<Event, EventCreateInput, EventUpdateInput, EventAliases>({
    apiClient: withProjectScopedGetAll(api.event),
    entityName: "Event",
    methodPrefix: "Event",
    aliasItemsKey: "events",
    aliasCurrentKey: "currentEvent",
  }),
);
