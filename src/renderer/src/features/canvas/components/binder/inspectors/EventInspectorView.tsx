import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useCanvasViewStore } from "@renderer/features/canvas/stores";
import EventDetailView from "@renderer/features/research/components/event/EventDetailView";

interface EventInspectorViewProps {
  nodeId: string;
}

export default function EventInspectorView({ nodeId }: EventInspectorViewProps) {
  const { t } = useTranslation();
  const clearSelection = useCanvasViewStore((s) => s.clearSelection);

  return (
    <div className="relative flex h-full flex-col overflow-y-auto bg-panel">
      <div className="absolute top-4 right-4 z-10">
        <button
          type="button"
          onClick={clearSelection}
          className="rounded-control p-1 text-muted transition-colors hover:bg-surface-hover hover:text-fg"
          title={t("canvas.node.deselect")}
          aria-label={t("canvas.node.deselect")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <EventDetailView eventId={nodeId} />
    </div>
  );
}
