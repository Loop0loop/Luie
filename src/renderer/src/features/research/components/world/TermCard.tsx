
import { cn } from "@shared/types/utils";
import type { Term } from "@shared/types";
import type { TFunction } from "i18next";
import { X } from "lucide-react";
import { useSortable } from '@dnd-kit/sortable';
import { CSS as dndCSS } from '@dnd-kit/utilities';

export const TermCard = ({
  item,
  isOverlay = false,
  onSelect,
  onDelete,
  t,
}: {
  item: Term;
  isOverlay?: boolean;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  t: TFunction;
}) => {
  return (
    <div
      className={cn(
        "group flex flex-col justify-between p-4 bg-element border border-border rounded-xl relative shadow-sm transition-all overflow-hidden h-full",
        isOverlay ? "cursor-grabbing shadow-xl border-accent scale-105 z-50 bg-element-hover" : "hover:bg-element-hover hover:border-accent/40 hover:-translate-y-1 hover:shadow-md cursor-grab"
      )}
      onClick={onSelect ? () => onSelect(item.id) : undefined}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between">
          <span className="font-bold text-base text-fg leading-tight line-clamp-2 pr-6">
            {item.term}
          </span>
        </div>

        {item.category && (
          <span className="inline-flex self-start items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-active text-fg/80 border border-border/50">
            {item.category}
          </span>
        )}

        <div className="text-xs text-muted-foreground line-clamp-3 leading-relaxed opacity-80">
          {item.definition || t("world.term.noDefinition")}
        </div>
      </div>

      {onDelete && !isOverlay && (
        <button
          className="absolute top-3 right-3 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive text-muted transition-all cursor-pointer"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          title={t("common.delete")}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export const SortableTermItem = ({
  item,
  onSelect,
  onDelete,
  t,
}: {
  item: Term;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  t: TFunction;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: dndCSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="h-full">
      <TermCard item={item} onSelect={onSelect} onDelete={onDelete} t={t} />
    </div>
  );
};
