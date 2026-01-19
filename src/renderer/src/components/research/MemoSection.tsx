import { useState } from "react";
import { Clock, Plus, Search, Tag } from "lucide-react";
import styles from "../../styles/components/ResearchPanel.module.css";

type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
};

export default function MemoSection() {
  const [notes, setNotes] = useState<Note[]>([
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
  ]);
  const [activeNoteId, setActiveNoteId] = useState("1");
  const [searchTerm, setSearchTerm] = useState("");

  const activeNote = notes.find((n) => n.id === activeNoteId);
  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.content.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleAddNote = () => {
    const newId = String(notes.length + 1);
    const newNote: Note = {
      id: newId,
      title: "새로운 메모",
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
            <Search size={12} color="var(--text-tertiary)" />
            <input
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: 12,
                width: "100%",
                color: "var(--text-primary)",
              }}
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredNotes.map((note) => (
          <div
            key={note.id}
            className={`${styles.noteItem} ${activeNoteId === note.id ? styles.active : ""}`}
            onClick={() => setActiveNoteId(note.id)}
          >
            <div style={{ fontWeight: 500, marginBottom: 4 }}>
              {note.title || "Untitled"}
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
                    fontSize: 9,
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
                fontSize: 10,
                color: "var(--text-tertiary)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Clock size={8} />
              {new Date(note.updatedAt).toLocaleDateString()}
            </div>
          </div>
        ))}
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
            <Tag size={14} color="var(--text-tertiary)" />
            <input
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: 12,
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
