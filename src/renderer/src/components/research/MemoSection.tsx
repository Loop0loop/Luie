import { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import {
  DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS,
  DEFAULT_NOTE_TITLE,
  DEFAULT_UNTITLED_LABEL,
  LABEL_MEMO_EMPTY,
  LABEL_MEMO_SECTION_TITLE,
  MEMO_DEFAULT_NOTES,
  PLACEHOLDER_MEMO_BODY,
  PLACEHOLDER_MEMO_SEARCH,
  PLACEHOLDER_MEMO_TAGS,
  PLACEHOLDER_MEMO_TITLE,
  STORAGE_KEY_MEMOS_NONE,
  STORAGE_KEY_MEMOS_PREFIX,
} from "../../../../shared/constants";
import { Virtuoso } from "react-virtuoso";
import { Clock, Plus, Search, Tag } from "lucide-react";
import { cn } from "../../../../shared/types/utils";
import { useProjectStore } from "../../stores/projectStore";

type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
};

const defaultUpdatedAt = new Date().toISOString();
const DEFAULT_NOTES: Note[] = MEMO_DEFAULT_NOTES.map((note) => ({
  ...note,
  tags: [...note.tags],
  updatedAt: defaultUpdatedAt,
}));

export default function MemoSection() {
  const { currentItem: currentProject } = useProjectStore();

  const storageKey = useMemo(() => {
    if (!currentProject?.id) return null;
    return `${STORAGE_KEY_MEMOS_PREFIX}${currentProject.id}`;
  }, [currentProject?.id]);

  return (
    <MemoSectionInner
      key={storageKey ?? STORAGE_KEY_MEMOS_NONE}
      storageKey={storageKey}
    />
  );
}

function loadInitialNotes(storageKey: string | null): {
  notes: Note[];
  activeNoteId: string;
} {
  if (!storageKey) {
    return { notes: DEFAULT_NOTES, activeNoteId: DEFAULT_NOTES[0]?.id ?? "1" };
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return { notes: DEFAULT_NOTES, activeNoteId: DEFAULT_NOTES[0]?.id ?? "1" };
    }

    const parsed = JSON.parse(raw) as { notes?: Note[] };
    const loaded = Array.isArray(parsed.notes) ? parsed.notes : [];
    const effectiveNotes = loaded.length > 0 ? loaded : DEFAULT_NOTES;
    return {
      notes: effectiveNotes,
      activeNoteId: effectiveNotes[0]?.id ?? DEFAULT_NOTES[0]?.id ?? "1",
    };
  } catch (e) {
    window.api.logger.warn("Failed to load memos", e);
    return { notes: DEFAULT_NOTES, activeNoteId: DEFAULT_NOTES[0]?.id ?? "1" };
  }
}

function MemoSectionInner({ storageKey }: { storageKey: string | null }) {
  const initial = loadInitialNotes(storageKey);

  const [notes, setNotes] = useState<Note[]>(() => initial.notes);
  const [activeNoteId, setActiveNoteId] = useState(() => initial.activeNoteId);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // Save notes (debounced)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!storageKey) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ notes }));
      } catch (e) {
        window.api.logger.warn("Failed to save memos", e);
      }
    }, DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [notes, storageKey]);

  const activeNote = notes.find((n) => n.id === activeNoteId);
  const filteredNotes = useMemo(() => {
    if (!deferredSearchTerm) return notes;
    const query = deferredSearchTerm.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        n.content.toLowerCase().includes(query),
    );
  }, [notes, deferredSearchTerm]);

  const handleAddNote = () => {
    const newId = String(Date.now());
    const newNote: Note = {
      id: newId,
      title: DEFAULT_NOTE_TITLE,
      content: "",
      tags: [],
      updatedAt: new Date().toISOString(),
    };
    setNotes([...notes, newNote]);
    setActiveNoteId(newId);
  };

  return (
    <div className="flex h-full w-full bg-bg-primary overflow-hidden">
      <div className="w-[220px] bg-sidebar border-r border-border flex flex-col shrink-0 content-visibility-auto contain-intrinsic-size-[1px_600px]">
        <div className="px-4 py-3 text-xs font-bold text-muted flex justify-between items-center uppercase tracking-wider">
          <span>{LABEL_MEMO_SECTION_TITLE}</span>
          <Plus className="icon-sm cursor-pointer hover:text-fg transition-colors" onClick={handleAddNote} />
        </div>

        <div className="px-3 py-2">
          <div className="flex items-center gap-2 bg-element px-2 py-1.5 rounded">
            <Search
              style={{ width: "var(--memo-search-icon-size)", height: "var(--memo-search-icon-size)" }}
              color="var(--text-tertiary)"
            />
            <input
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: "var(--memo-search-font-size)",
                width: "100%",
                color: "var(--text-primary)",
              }}
              placeholder={PLACEHOLDER_MEMO_SEARCH}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <Virtuoso
            data={filteredNotes}
            style={{ height: "100%" }}
            itemContent={(_index, note) => (
              <div
                className={cn(
                  "px-4 py-3 border-b border-border cursor-pointer transition-colors hover:bg-element-hover",
                  activeNoteId === note.id && "bg-active border-l-[3px] border-l-accent pl-[13px]" // Adjust padding to compensate border
                )}
                onClick={() => setActiveNoteId(note.id)}
              >
                <div style={{ fontWeight: "var(--memo-title-font-weight)", marginBottom: 4 }}>
                  {note.title || DEFAULT_UNTITLED_LABEL}
                </div>
                <div className="flex gap-1 flex-wrap mb-1">
                  {note.tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: "var(--memo-tag-font-size)",
                        padding: "2px 4px",
                        background: "var(--bg-element-hover)",
                        borderRadius: 2,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div
                  style={{
                    fontSize: "var(--memo-date-font-size)",
                    color: "var(--text-tertiary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Clock
                    style={{
                      width: "var(--memo-date-icon-size)",
                      height: "var(--memo-date-icon-size)",
                    }}
                  />
                  {new Date(note.updatedAt).toLocaleDateString()}
                </div>
              </div>
            )}
          />
        </div>
      </div>

      {activeNote ? (
        <div className="flex-1 flex flex-col bg-panel overflow-hidden">
          <div className="px-6 pt-3 flex items-center gap-2">
            <Tag className="icon-sm" color="var(--text-tertiary)" />
            <input
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: "var(--memo-tag-input-font-size)",
                color: "var(--text-secondary)",
                width: "100%",
              }}
              placeholder={PLACEHOLDER_MEMO_TAGS}
              value={activeNote.tags.join(", ")}
              onChange={(e) => {
                const tags = e.target.value.split(",").map((t) => t.trim());
                setNotes(notes.map((n) => (n.id === activeNoteId ? { ...n, tags } : n)));
              }}
            />
          </div>

          <input
            className="px-6 pt-5 pb-3 text-xl font-bold border-none bg-transparent outline-none text-fg placeholder:text-muted"
            value={activeNote.title}
            onChange={(e) =>
              setNotes(
                notes.map((n) =>
                  n.id === activeNoteId
                    ? { ...n, title: e.target.value, updatedAt: new Date().toISOString() }
                    : n,
                ),
              )
            }
            placeholder={PLACEHOLDER_MEMO_TITLE}
          />
          <textarea
            className="flex-1 px-6 pb-6 border-none bg-transparent resize-none outline-none leading-relaxed text-[15px] text-secondary placeholder:text-muted"
            value={activeNote.content}
            onChange={(e) =>
              setNotes(
                notes.map((n) =>
                  n.id === activeNoteId
                    ? {
                        ...n,
                        content: e.target.value,
                        updatedAt: new Date().toISOString(),
                      }
                    : n,
                ),
              )
            }
            placeholder={PLACEHOLDER_MEMO_BODY}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-tertiary">
          {LABEL_MEMO_EMPTY}
        </div>
      )}
    </div>
  );
}
