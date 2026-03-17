import { Clock3, StickyNote, Plus } from "lucide-react";
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
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-white/8 bg-[#151920]/90 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-xl text-fg/55 hover:bg-white/8 hover:text-fg/90"
          title="새 엔티티 블럭"
          onClick={onCreateBlock}
        >
          <Plus className="h-4.5 w-4.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-xl text-fg/55 hover:bg-white/8 hover:text-fg/90"
          title="타임라인 블럭"
          onClick={onOpenTimelinePalette}
        >
          <Clock3 className="h-4.5 w-4.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-10 w-10 rounded-xl text-fg/55 hover:bg-white/8 hover:text-fg/90"
          title="메모 블럭"
          onClick={onCreateNote}
        >
          <StickyNote className="h-4.5 w-4.5" />
        </Button>
      </div>
    </div>
  );
}
