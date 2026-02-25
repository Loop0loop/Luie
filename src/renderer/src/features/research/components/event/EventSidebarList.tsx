import { useState } from "react";
import { type TFunction } from "i18next";
import { Home, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { EVENT_GROUP_COLORS } from "@shared/constants";
import { cn } from "@shared/types/utils";
import type { EventLike } from "@renderer/features/research/components/event/useEventManager";

interface EventSidebarListProps {
    t: TFunction;
    selectedEventId: string | null;
    setSelectedEventId: (id: string | null) => void;
    handleAddEvent: () => void;
    groupedEvents: Record<string, EventLike[]>;
}

export function EventSidebarList({
    t,
    selectedEventId,
    setSelectedEventId,
    handleAddEvent,
    groupedEvents,
}: EventSidebarListProps) {
    return (
        <div className="flex flex-col h-full bg-sidebar border-r border-border overflow-y-auto">
            <div className="px-4 py-3 bg-(--namu-blue) text-white font-bold flex justify-between items-center shrink-0">
                <button
                    className="flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity bg-transparent border-none p-1 text-white cursor-pointer"
                    onClick={() => setSelectedEventId(null)}
                    title={t("event.viewAllTitle", "View All")}
                >
                    <Home size={18} />
                    <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 700 }}>
                        {t("event.sectionTitle", "Events")}
                    </span>
                </button>

                <button
                    className="flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity bg-transparent border-none p-1 text-white cursor-pointer"
                    onClick={() => handleAddEvent()}
                    title={t("event.addTitle", "Add Event")}
                >
                    <Plus size={18} />
                </button>
            </div>

            <div className="flex flex-col w-full overflow-y-auto">
                {Object.entries(groupedEvents).map(([group, evts]) => (
                    <EventGroup
                        key={group}
                        t={t}
                        title={group}
                        color={EVENT_GROUP_COLORS[group] || EVENT_GROUP_COLORS["Uncategorized"]}
                        events={evts}
                        selectedId={selectedEventId}
                        onSelect={setSelectedEventId}
                    />
                ))}
            </div>
        </div>
    );
}

function EventGroup({
    t,
    title,
    color,
    events,
    selectedId,
    onSelect
}: {
    t: TFunction;
    title: string;
    color: string;
    events: EventLike[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div>
            <div
                className="px-4 py-2 text-xs font-bold text-muted bg-surface border-b border-border cursor-pointer flex items-center gap-2 select-none"
                onClick={() => setIsOpen(!isOpen)}
                style={{ borderLeft: `4px solid ${color}` }}
            >
                {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span>{title} ({events.length})</span>
            </div>

            {isOpen && (
                <div className="flex flex-col">
                    {events.map(evt => (
                        <div
                            key={evt.id}
                            className={cn(
                                "px-4 py-2.5 border-b border-border cursor-pointer text-sm text-fg flex flex-col transition-colors hover:bg-surface-hover",
                                selectedId === evt.id && "bg-(--namu-hover-bg) border-l-[3px] text-(--namu-blue)"
                            )}
                            onClick={() => onSelect(evt.id)}
                            style={selectedId === evt.id ? { borderLeftColor: color } : {}}
                        >
                            <span className="font-semibold mb-0.5">{evt.name}</span>
                            <span className="text-[11px] text-subtle">{evt.description || t("event.noRole", "No Type")}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
