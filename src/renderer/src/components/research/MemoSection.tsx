import { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import {
  DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS,
  DEFAULT_NOTE_TITLE,
  DEFAULT_UNTITLED_LABEL,
  MEMO_DATE_FONT_SIZE,
  MEMO_DATE_ICON_SIZE,
  MEMO_SEARCH_FONT_SIZE,
  MEMO_SEARCH_ICON_SIZE,
  MEMO_TAG_FONT_SIZE,
  MEMO_TAG_ICON_SIZE,
  MEMO_TAG_INPUT_FONT_SIZE,
  STORAGE_KEY_MEMOS_NONE,
  STORAGE_KEY_MEMOS_PREFIX,
} from "../../../../shared/constants";
import { Virtuoso } from "react-virtuoso";
import { Clock, Plus, Search, Tag } from "lucide-react";
import styles from "../../styles/components/ResearchPanel.module.css";
import { useProjectStore } from "../../stores/projectStore";

type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
};

const DEFAULT_NOTES: Note[] = [
  {
    id: "1",
    title: "참고자료: 중세 복식",
    content:
      "링크: https://wiki...\n\n중세 귀족들의 의상은 생각보다 화려했다...",
    tags: ["자료", "의상"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "아이디어 파편",
    content:
      "- 주인공이 사실은 악역이었다면?\n- 회귀 전의 기억이 왜곡된 것이라면?",
    tags: ["아이디어", "플롯"],
    updatedAt: new Date().toISOString(),
  },
];

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
    <div className={styles.scrapContainer}>
      <div className={styles.noteList}>
        <div className={styles.noteListHeader}>
          <span>MEMOS</span>
          <Plus size={14} style={{ cursor: "pointer" }} onClick={handleAddNote} />
        </div>

        <div
          style={{
            padding: "8px 12px",
            borderBottom: "1px solid var(--border-default)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "var(--bg-element)",
              padding: "6px 8px",
              borderRadius: 4,
            }}
          >
            <Search size={MEMO_SEARCH_ICON_SIZE} color="var(--text-tertiary)" />
            <input
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: MEMO_SEARCH_FONT_SIZE,
                width: "100%",
                color: "var(--text-primary)",
              }}
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.noteListBody}>
          <Virtuoso
            data={filteredNotes}
            style={{ height: "100%" }}
            itemContent={(_index, note) => (
              <div
                className={`${styles.noteItem} ${activeNoteId === note.id ? styles.active : ""}`}
                onClick={() => setActiveNoteId(note.id)}
              >
                <div style={{ fontWeight: 500, marginBottom: 4 }}>
                  {note.title || DEFAULT_UNTITLED_LABEL}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    flexWrap: "wrap",
                    marginBottom: 4,
                  }}
                >
                  {note.tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: MEMO_TAG_FONT_SIZE,
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
                    fontSize: MEMO_DATE_FONT_SIZE,
                    color: "var(--text-tertiary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Clock size={MEMO_DATE_ICON_SIZE} />
                  {new Date(note.updatedAt).toLocaleDateString()}
                </div>
              </div>
            )}
          />
        </div>
      </div>

      {activeNote ? (
        <div className={styles.noteContent}>
          <div
            style={{
              padding: "12px 24px 0 24px",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <Tag size={MEMO_TAG_ICON_SIZE} color="var(--text-tertiary)" />
            <input
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: MEMO_TAG_INPUT_FONT_SIZE,
                color: "var(--text-secondary)",
                width: "100%",
              }}
              placeholder="Add tags (comma separated)..."
              value={activeNote.tags.join(", ")}
              onChange={(e) => {
                const tags = e.target.value.split(",").map((t) => t.trim());
                setNotes(notes.map((n) => (n.id === activeNoteId ? { ...n, tags } : n)));
              }}
            />
          </div>

          <input
            className={styles.noteTitleInput}
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
            placeholder="Title"
          />
          <textarea
            className={styles.noteBodyInput}
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
            placeholder="Start typing your memo..."
          />
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-tertiary)",
          }}
        >
          Select a note to view
        </div>
      )}
    </div>
  );
}
