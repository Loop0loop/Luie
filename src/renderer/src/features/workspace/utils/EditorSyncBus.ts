import type { WorldEntitySourceType, WorldEntityType } from "@shared/types";

type AppEventType = "FOCUS_ENTITY" | "JUMP_TO_MENTION" | "SPAWN_GRAPH_DRAFT_NODE" | "OPEN_COMMAND_PALETTE";

type EventPayloads = {
    FOCUS_ENTITY: { entityId: string };
    JUMP_TO_MENTION: { entityId: string };
    SPAWN_GRAPH_DRAFT_NODE: {
        entityType?: WorldEntitySourceType;
        subType?: WorldEntityType | "Note";
        instant?: boolean;
        position?: { x: number; y: number };
    };
    OPEN_COMMAND_PALETTE: { mode: "Event" | "Note" };
};

type EventCallback<T extends AppEventType> = (payload: EventPayloads[T]) => void;

class EditorSyncBusClass {
    private listeners: { [K in AppEventType]?: EventCallback<K>[] } = {};

    on<T extends AppEventType>(event: T, callback: EventCallback<T>) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event]!.push(callback);
    }

    off<T extends AppEventType>(event: T, callback: EventCallback<T>) {
        const listeners = this.listeners[event];
        if (!listeners) return;
        const index = listeners.indexOf(callback);
        if (index >= 0) {
            listeners.splice(index, 1);
        }
    }

    emit<T extends AppEventType>(event: T, payload: EventPayloads[T]) {
        if (!this.listeners[event]) return;
        this.listeners[event]!.forEach((cb) => cb(payload));
    }
}

export const EditorSyncBus = new EditorSyncBusClass();
