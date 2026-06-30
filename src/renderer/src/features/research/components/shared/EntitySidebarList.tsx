import { useState, type ReactNode } from "react";
import { Home, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@shared/types/utils";

export type EntitySidebarRow = {
  id: string;
  name: string;
  description?: string | null;
};

export type EntitySidebarGroup = {
  key: string;
  title: string;
  items: EntitySidebarRow[];
};

interface EntitySidebarListProps {
  title: string;
  onViewAll: () => void;
  viewAllLabel: string;
  onAdd: () => void;
  addLabel: string;
  groups: EntitySidebarGroup[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  emptyDescriptionLabel: string;
  /** Optional content rendered under the header (e.g. a search box). */
  belowHeader?: ReactNode;
}

/**
 * Shared list shell for Character / Event / Faction sidebars.
 * Quiet muted header (matching the Memo sidebar), accessible button rows,
 * fixed header + scrolling list. The owning manager injects grouped data.
 */
export function EntitySidebarList({
  title,
  onViewAll,
  viewAllLabel,
  onAdd,
  addLabel,
  groups,
  selectedId,
  onSelect,
  emptyDescriptionLabel,
  belowHeader,
}: EntitySidebarListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 flex justify-between items-center shrink-0">
        <button
          type="button"
          onClick={onViewAll}
          aria-label={viewAllLabel}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted hover:text-fg transition-colors rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Home size={14} aria-hidden="true" />
          <span>{title}</span>
        </button>

        <button
          type="button"
          onClick={onAdd}
          aria-label={addLabel}
          className="p-0.5 text-muted hover:text-fg transition-colors rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>

      {belowHeader}

      <div className="flex flex-col w-full flex-1 overflow-y-auto">
        {groups.map((group) => (
          <EntityGroupSection
            key={group.key}
            group={group}
            selectedId={selectedId}
            onSelect={onSelect}
            emptyDescriptionLabel={emptyDescriptionLabel}
          />
        ))}
      </div>
    </div>
  );
}

function EntityGroupSection({
  group,
  selectedId,
  onSelect,
  emptyDescriptionLabel,
}: {
  group: EntitySidebarGroup;
  selectedId: string | null;
  onSelect: (id: string) => void;
  emptyDescriptionLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="w-full px-4 py-2 text-xs font-bold text-muted bg-surface border-b border-border flex items-center gap-2 select-none hover:bg-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        {isOpen ? (
          <ChevronDown size={12} aria-hidden="true" />
        ) : (
          <ChevronRight size={12} aria-hidden="true" />
        )}
        <span>
          {group.title} ({group.items.length})
        </span>
      </button>

      {isOpen && (
        <div className="flex flex-col">
          {group.items.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <button
                type="button"
                key={item.id}
                aria-current={isSelected ? "true" : undefined}
                onClick={() => onSelect(item.id)}
                className={cn(
                  "w-full text-left px-4 py-2.5 border-b border-border text-sm text-fg flex flex-col transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
                  isSelected &&
                    "bg-active border-l-[3px] border-l-accent text-accent",
                )}
              >
                <span className="font-semibold mb-0.5">{item.name}</span>
                <span className="text-[11px] text-subtle">
                  {item.description || emptyDescriptionLabel}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
