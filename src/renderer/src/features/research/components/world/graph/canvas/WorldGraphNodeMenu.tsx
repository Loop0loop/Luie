import { Focus, BookOpen, Link2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface WorldGraphNodeMenuProps {
  left: number;
  top: number;
  onFocus: () => void;
  onDelete: () => void;
  onJumpToMention?: () => void;
}

const Separator = () => (
  <div className="my-1 h-px w-full bg-border/30" />
);

export function WorldGraphNodeMenu({
  left,
  top,
  onFocus,
  onDelete,
  onJumpToMention,
}: WorldGraphNodeMenuProps) {
  const { t } = useTranslation();

  return (
    <div
      className="absolute z-20 w-48 overflow-hidden rounded-xl border border-border/50 bg-panel/98 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
      style={{ left, top }}
    >
      <div className="p-1.5">
        <button
          type="button"
          onClick={onFocus}
          className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all hover:bg-element"
        >
          <Focus size={13} className="shrink-0 text-muted-foreground/60 group-hover:text-fg" />
          <span className="text-[12px] text-fg/80 group-hover:text-fg">
            {t("world.graph.canvas.focusNode", "집중 보기")}
          </span>
        </button>

        {onJumpToMention && (
          <button
            type="button"
            onClick={onJumpToMention}
            className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all hover:bg-element"
          >
            <BookOpen size={13} className="shrink-0 text-muted-foreground/60 group-hover:text-fg" />
            <span className="text-[12px] text-fg/80 group-hover:text-fg">
              {t("world.graph.canvas.jumpToMention", "편집기에서 보기")}
            </span>
          </button>
        )}

        <button
          type="button"
          disabled
          className="group flex w-full cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 py-2 text-left opacity-40"
        >
          <Link2 size={13} className="shrink-0 text-muted-foreground/60" />
          <span className="text-[12px] text-fg/80">
            {t("world.graph.canvas.addRelation", "연결 추가")}
          </span>
          <span className="ml-auto text-[9px] text-muted-foreground/40">곧</span>
        </button>

        <Separator />

        <button
          type="button"
          onClick={onDelete}
          className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all hover:bg-destructive/10"
        >
          <Trash2 size={13} className="shrink-0 text-destructive/70 group-hover:text-destructive" />
          <span className="text-[12px] text-destructive/80 group-hover:text-destructive">
            {t("world.graph.canvas.deleteNode", "삭제")}
          </span>
        </button>
      </div>
    </div>
  );
}
