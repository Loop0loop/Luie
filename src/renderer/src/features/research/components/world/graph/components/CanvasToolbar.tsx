import { Clock3, StickyNote, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@renderer/components/ui/button";

type CanvasToolbarProps = {
  onCreateBlock?: () => void;
  onOpenTimelinePalette: () => void;
  onCreateNote: () => void;
};

export function CanvasToolbar({
  onCreateBlock,
  onOpenTimelinePalette,
  onCreateNote,
}: CanvasToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-white/10 bg-popover/90 p-1.5 shadow-2xl backdrop-blur">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-xl text-fg/55 hover:bg-white/8 hover:text-fg/90"
          title={t("research.graph.canvas.toolbar.newEntityBlock")}
          onClick={onCreateBlock}
        >
          <Plus className="h-4.5 w-4.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-xl text-fg/55 hover:bg-white/8 hover:text-fg/90"
          title={t("research.graph.canvas.toolbar.timelineBlock")}
          onClick={onOpenTimelinePalette}
        >
          <Clock3 className="h-4.5 w-4.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-xl text-fg/55 hover:bg-white/8 hover:text-fg/90"
          title={t("research.graph.canvas.toolbar.memoBlock")}
          onClick={onCreateNote}
        >
          <StickyNote className="h-4.5 w-4.5" />
        </Button>
      </div>
    </div>
  );
}
