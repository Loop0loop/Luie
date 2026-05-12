import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StickyNote, Plus, Search, Trash2, X } from "lucide-react";
import type { MemoNote } from "@renderer/features/research/stores/memo.types";
import { cn } from "@renderer/lib/utils";

interface NotesViewProps {
  notes: MemoNote[];
  selectedNoteId: string | null;
  searchQuery: string;
  onSelectNote: (id: string | null) => void;
  onSearchChange: (q: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
}

const NOTE_COLORS = [
  "border-zinc-500/20 bg-zinc-500/5",
  "border-amber-500/20 bg-amber-500/5",
  "border-sky-500/20 bg-sky-500/5",
  "border-emerald-500/20 bg-emerald-500/5",
  "border-rose-500/20 bg-rose-500/5",
];

function getNoteColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return NOTE_COLORS[Math.abs(hash) % NOTE_COLORS.length];
}

export function NotesView({
  notes,
  selectedNoteId,
  searchQuery,
  onSelectNote,
  onSearchChange,
  onCreateNote,
  onDeleteNote,
}: NotesViewProps) {
  const { t } = useTranslation();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = searchQuery.trim()
    ? notes.filter(
        (n) =>
          n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.content?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : notes;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/30 px-5 py-3">
        <div className="flex items-center gap-2">
          <StickyNote size={14} className="text-muted" />
          <span className="text-[12px] font-semibold text-fg">{t("canvas.tab.notes")}</span>
          <span className="rounded-full border border-border/40 bg-element px-2 py-0.5 text-[10px] text-muted">
            {filtered.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onCreateNote}
          className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-element px-2.5 py-1 text-[11px] text-muted transition-colors hover:bg-element-hover hover:text-fg"
        >
          <Plus size={11} />
          {t("canvas.notes.create")}
        </button>
      </div>

      {/* Search */}
      <div className="shrink-0 border-b border-border/20 px-4 py-2">
        <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-element/50 px-3 py-1.5">
          <Search size={12} className="shrink-0 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("canvas.notes.search")}
            className="min-w-0 flex-1 bg-transparent text-[12px] text-fg placeholder:text-muted/50 focus:outline-none"
          />
          {searchQuery && (
            <button type="button" onClick={() => onSearchChange("")}>
              <X size={11} className="text-muted hover:text-fg" />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <StickyNote size={32} className="text-muted/30" strokeWidth={1} />
            <p className="text-[12px] text-muted">
              {searchQuery ? t("canvas.notes.noResults") : t("canvas.notes.empty")}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={onCreateNote}
                className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-element px-3 py-1.5 text-[11px] text-muted transition-colors hover:text-fg"
              >
                <Plus size={11} />
                {t("canvas.notes.create")}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {filtered.map((note) => {
              const isSelected = selectedNoteId === note.id;
              const colorClass = getNoteColor(note.id);
              return (
                <div
                  key={note.id}
                  onMouseEnter={() => setHoveredId(note.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="group relative"
                >
                  <button
                    type="button"
                    onClick={() => onSelectNote(isSelected ? null : note.id)}
                    className={cn(
                      "w-full rounded-xl border p-3 text-left transition-all duration-150",
                      colorClass,
                      isSelected && "ring-1 ring-white/10 shadow-md",
                    )}
                  >
                    {note.title && (
                      <p className="mb-1.5 truncate text-[12px] font-semibold text-fg">
                        {note.title}
                      </p>
                    )}
                    <p className="line-clamp-4 text-[11px] leading-relaxed text-muted">
                      {note.content || <span className="italic">Empty note</span>}
                    </p>
                    {note.updatedAt && (
                      <p className="mt-2 text-[9px] text-muted/50">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </p>
                    )}
                  </button>

                  {hoveredId === note.id && (
                    <button
                      type="button"
                      title={t("canvas.notes.delete")}
                      onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md bg-panel/80 text-muted opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
