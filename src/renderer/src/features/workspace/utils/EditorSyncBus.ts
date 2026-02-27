type AppEventType = "FOCUS_ENTITY" | "JUMP_TO_MENTION";

type EventPayloads = {
    FOCUS_ENTITY: { entityId: string };
    JUMP_TO_MENTION: { entityId: string };
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
