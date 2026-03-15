import { Boxes, Clock3, FilePlus2, StickyNote } from "lucide-react";
import { Button } from "@renderer/components/ui/button";

type CanvasToolbarProps = {
  onCreateBlock: () => void;
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
      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-[#151920]/92 p-2 shadow-[0_18px_55px_rgba(0,0,0,0.38)] backdrop-blur">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-11 w-11 rounded-xl bg-white/5 text-fg/75 hover:bg-white/10 hover:text-fg"
          title="블럭 생성"
          onClick={onCreateBlock}
        >
          <Boxes className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-11 w-11 rounded-xl bg-white/5 text-fg/75 hover:bg-white/10 hover:text-fg"
          title="타임라인 팔레트"
          onClick={onOpenTimelinePalette}
        >
          <Clock3 className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-11 w-11 rounded-xl bg-white/5 text-fg/75 hover:bg-white/10 hover:text-fg"
          title="새 노트"
          onClick={onCreateNote}
        >
          <StickyNote className="h-5 w-5" />
        </Button>
        <div className="ml-1 flex items-center gap-2 rounded-xl border border-white/10 bg-[#10141a] px-3 py-2">
          <FilePlus2 className="h-4 w-4 text-fg/55" />
          <div className="text-[11px] leading-4 text-fg/55">
            <p>Canvas nav</p>
            <p>블럭 / 타임라인 / 노트</p>
          </div>
        </div>
      </div>
    </div>
  );
}
