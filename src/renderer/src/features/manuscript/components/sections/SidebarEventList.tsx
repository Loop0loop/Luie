import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Plus } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useEventStore } from "@renderer/features/research/stores/eventStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { cn } from "@shared/types/utils";
import { DraggableItem } from "@shared/ui/DraggableItem";

type EventLike = {
  id: string;
  name: string;
  description?: string | null;
};

export default function SidebarEventList() {
  const { t } = useTranslation();
  const currentProject = useProjectStore((state) => state.currentItem);
  const {
    items: events,
    loadAll: loadEvents,
    create: createEvent,
  } = useEventStore(
    useShallow((state) => ({
      items: state.items,
      loadAll: state.loadAll,
      create: state.create,
    })),
  );
  const mainView = useUIStore((state) => state.mainView);
  const setMainView = useUIStore((state) => state.setMainView);
  const selectedEventId =
    mainView.type === "event" && mainView.id ? mainView.id : null;

  useEffect(() => {
    if (currentProject) {
      void loadEvents(currentProject.id);
    }
  }, [currentProject, loadEvents]);

  const handleAddEvent = async () => {
    if (!currentProject) return;
    const created = await createEvent({
      projectId: currentProject.id,
      name: t("event.defaults.name", "New Event"),
      description: t("event.uncategorized", "Uncategorized"),
      attributes: {},
    });
    if (created?.id) {
      setMainView({ type: "event", id: created.id });
    }
  };

  return (
    <div className="flex flex-col h-full bg-sidebar/50">
      <div className="flex items-center justify-end px-2 py-1 gap-1 border-b border-border/20">
        <button
          className="p-1 hover:bg-white/10 rounded text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => void handleAddEvent()}
          title={t("event.addTitle", "Add Event")}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {events.length === 0 && (
          <div className="p-4 text-xs text-muted text-center italic">
            {t("event.noSelection", "No Event Selected")}
          </div>
        )}

        {(events as EventLike[]).map((event) => (
          <DraggableItem
            key={event.id}
            id={`event-${event.id}`}
            data={{ type: "event", id: event.id, title: event.name }}
          >
            <div
              className={cn(
                "pl-4 pr-3 py-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors border-l-2 border-transparent",
                selectedEventId === event.id &&
                  "bg-accent/10 text-accent border-accent",
              )}
              onClick={() => setMainView({ type: "event", id: event.id })}
            >
              <Calendar className="w-3.5 h-3.5 opacity-70" />
              <span className="truncate">{event.name}</span>
            </div>
          </DraggableItem>
        ))}
      </div>
    </div>
  );
}
