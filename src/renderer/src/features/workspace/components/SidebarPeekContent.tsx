import { Plus } from "lucide-react";

type PeekItem = {
  id: string;
  label: string;
  sublabel?: string;
};

type PeekGroup = {
  name: string;
  items: PeekItem[];
};

type SidebarPeekContentProps = {
  groups: PeekGroup[];
  selectedId: string | null | undefined;
  onSelect: (id: string) => void;
  addLabel?: string;
  onAdd?: () => void;
};

/**
 * Condensed TOC-style list for the sidebar hover peek.
 *
 * Structure:
 *   [+ 추가 버튼]
 *   * 태그명
 *       1. 항목
 *       2. 항목
 */
export function SidebarPeekContent({
  groups,
  selectedId,
  onSelect,
  addLabel,
  onAdd,
}: SidebarPeekContentProps) {
  return (
    <div className="py-2 select-none">
      {/* Add button */}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="w-full flex items-center gap-1.5 px-3 py-1.5 mb-2 text-[11px] text-muted/70 hover:text-fg transition-colors"
        >
          <Plus size={11} />
          <span>{addLabel ?? "추가"}</span>
        </button>
      )}

      {/* Groups */}
      {groups.map(({ name, items }, groupIdx) => (
        <div key={name} className={groupIdx > 0 ? "mt-2" : ""}>
          {/* * 태그명 */}
          <div className="flex items-center gap-1 px-3 py-0.5">
            <span className="text-[10px] text-muted/40">*</span>
            <span className="text-[10px] font-semibold text-muted/60 truncate">
              {name}
            </span>
          </div>

          {/* 1. 항목명 */}
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={[
                "w-full text-left flex items-start gap-1.5 pl-6 pr-3 py-[2px]",
                "text-[11px] leading-snug transition-colors",
                item.id === selectedId
                  ? "text-accent font-medium"
                  : "text-fg/55 hover:text-fg",
              ].join(" ")}
            >
              <span className="text-[9px] text-muted/35 shrink-0 w-3.5 text-right tabular-nums mt-px">
                {i + 1}.
              </span>
              <span className="min-w-0 flex flex-col">
                <span className="truncate">{item.label}</span>
                {item.sublabel && (
                  <span className="truncate text-[10px] text-fg/30 font-normal mt-px">
                    {item.sublabel}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
