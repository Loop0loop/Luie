import { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import type { Layout } from "react-resizable-panels";
import {
  DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS,
  STORAGE_KEY_MEMO_SIDEBAR_LAYOUT,
} from "../../../../shared/constants";
import { Virtuoso } from "react-virtuoso";
import { Clock, Plus, Tag } from "lucide-react";
import { cn } from "../../../../shared/types/utils";
import { useProjectStore } from "../../stores/projectStore";
import { api } from "../../services/api";
import SearchInput from "../common/SearchInput";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useShortcutCommand } from "../../hooks/useShortcutCommand";
import {
  readLocalStorageJson,
  writeLocalStorageJson
} from "../../utils/localStorage";
import { worldPackageStorage } from "../../services/worldPackageStorage";

type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
};

const defaultUpdatedAt = new Date().toISOString();
const MEMO_SIDEBAR_PANEL_ID = "memo-sidebar";
const MEMO_CONTENT_PANEL_ID = "memo-content";
const MEMO_SIDEBAR_DEFAULT_SIZE = 256;
const MEMO_SIDEBAR_MIN_SIZE = 140;
const MEMO_SIDEBAR_MAX_SIZE = 272;
const MEMO_CONTENT_MIN_SIZE = 122;

const normalizeMemoLayout = (layout: Layout): Layout | undefined => {
  const rawSidebar = layout[MEMO_SIDEBAR_PANEL_ID];
  const rawContent = layout[MEMO_CONTENT_PANEL_ID];
  if (!Number.isFinite(rawSidebar) || !Number.isFinite(rawContent)) return undefined;

  const sum = rawSidebar + rawContent;
  if (sum <= 0) return undefined;

  const sidebarRatio = (rawSidebar / sum) * 100;
  const clampedSidebar = Math.min(
    MEMO_SIDEBAR_MAX_SIZE,
    Math.max(MEMO_SIDEBAR_MIN_SIZE, sidebarRatio),
  );
  const contentSize = 100 - clampedSidebar;
  const normalizedContent = Math.max(MEMO_CONTENT_MIN_SIZE, contentSize);
  const normalizedSidebar = 100 - normalizedContent;

  return {
    [MEMO_SIDEBAR_PANEL_ID]: normalizedSidebar,
    [MEMO_CONTENT_PANEL_ID]: normalizedContent,
  };
};

function buildDefaultNotes(t: TFunction): Note[] {
  const rawNotes = t("memo.defaultNotes", { returnObjects: true }) as Array<
    Omit<Note, "updatedAt">
  >;
  return rawNotes.map((note) => ({
    ...note,
    tags: [...note.tags],
    updatedAt: defaultUpdatedAt,
  }));
}

export default function MemoSection() {
  const { t } = useTranslation();
  const { currentItem: currentProject } = useProjectStore();
  const defaultNotes = useMemo(() => buildDefaultNotes(t), [t]);
  const currentProjectId = currentProject?.id;
  const currentProjectPath = currentProject?.projectPath ?? null;

  return (
    <MemoSectionInner
      key={currentProjectId ?? "memo-none"}
      projectId={currentProjectId}
      projectPath={currentProjectPath}
      defaultNotes={defaultNotes}
    />
  );
}

function MemoSectionInner({
  projectId,
  projectPath,
  defaultNotes,
}: {
  projectId?: string;
  projectPath?: string | null;
  defaultNotes: Note[];
}) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<Note[]>(defaultNotes);
  const [activeNoteId, setActiveNoteId] = useState(defaultNotes[0]?.id ?? "1");
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const initialLayout = useMemo(() => {
    const parsed = readLocalStorageJson<Layout>(STORAGE_KEY_MEMO_SIDEBAR_LAYOUT);
    if (!parsed) return undefined;
    return normalizeMemoLayout(parsed);
  }, []);

  const handleLayoutChange = (layout: Layout) => {
    const normalized = normalizeMemoLayout(layout);
    if (!normalized) return;
    void writeLocalStorageJson(STORAGE_KEY_MEMO_SIDEBAR_LAYOUT, normalized);
  };

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    void (async () => {
      try {
        const loaded = await worldPackageStorage.loadScrapMemos(projectId, projectPath);
        if (cancelled) return;
        const effective = loaded.memos.length > 0 ? loaded.memos : defaultNotes;
        setNotes(effective);
        setActiveNoteId(effective[0]?.id ?? defaultNotes[0]?.id ?? "1");
      } catch (e) {
        api.logger.warn("Failed to load memos", e);
        if (!cancelled) {
          setNotes(defaultNotes);
          setActiveNoteId(defaultNotes[0]?.id ?? "1");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [defaultNotes, projectId, projectPath]);

  // Save notes (debounced)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!projectId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      void worldPackageStorage.saveScrapMemos(projectId, projectPath, { memos: notes });
    }, DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [notes, projectId, projectPath]);

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
      title: t("project.defaults.noteTitle"),
      content: "",
      tags: [],
      updatedAt: new Date().toISOString(),
    };
    setNotes([...notes, newNote]);
    setActiveNoteId(newId);
  };

  useShortcutCommand((command) => {
    if (command.type === "scrap.addMemo") {
      handleAddNote();
    }
  });

  return (
    <div className="h-full w-full bg-bg-primary overflow-hidden">
      <PanelGroup
        orientation="horizontal"
        onLayoutChanged={handleLayoutChange}
        defaultLayout={
          initialLayout ?? {
            [MEMO_SIDEBAR_PANEL_ID]: MEMO_SIDEBAR_DEFAULT_SIZE,
            [MEMO_CONTENT_PANEL_ID]: 100 - MEMO_SIDEBAR_DEFAULT_SIZE,
          }
        }
        className="h-full! w-full!"
      >
        <Panel
          id={MEMO_SIDEBAR_PANEL_ID}
          defaultSize={MEMO_SIDEBAR_DEFAULT_SIZE}
          minSize={MEMO_SIDEBAR_MIN_SIZE}
          maxSize={MEMO_SIDEBAR_MAX_SIZE}
          className="min-w-0"
        >
          <div className="h-full bg-sidebar border-r border-border flex flex-col content-visibility-auto contain-intrinsic-size-[1px_600px]">
            <div className="px-4 py-3 text-xs font-bold text-muted flex justify-between items-center uppercase tracking-wider">
              <span>{t("memo.sectionTitle")}</span>
              <Plus className="icon-sm cursor-pointer hover:text-fg transition-colors" onClick={handleAddNote} />
            </div>

            <div className="px-3 py-2">
              <SearchInput
                variant="memo"
                placeholder={t("memo.placeholder.search")}
                value={searchTerm}
                onChange={setSearchTerm}
              />
            </div>

            <div className="flex-1 min-h-0">
              <Virtuoso
                data={filteredNotes}
                style={{ height: "100%" }}
                itemContent={(_index, note) => (
                  <div
                    className={cn(
                      "px-4 py-3 border-b border-border cursor-pointer transition-colors hover:bg-element-hover",
                      activeNoteId === note.id && "bg-active border-l-[3px] border-l-accent pl-3.25",
                    )}
                    onClick={() => setActiveNoteId(note.id)}
                  >
                    <div style={{ fontWeight: "var(--memo-title-font-weight)", marginBottom: 4 }}>
                      {note.title || t("project.defaults.untitled")}
                    </div>
                    <div className="flex gap-1 flex-wrap mb-1">
                      {note.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: "var(--memo-tag-font-size)",
                            padding: "2px 4px",
                            background: "var(--bg-element-hover)",
                            borderRadius: 2,
                          }}
                        >
                          {tag}
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
        </Panel>

        <PanelResizeHandle className="w-1 -ml-0.5 bg-transparent hover:bg-primary/50 active:bg-primary z-20 transition-colors flex items-center justify-center group cursor-col-resize focus:outline-none relative">
          <div className="w-0.5 h-full bg-transparent group-hover:bg-primary/20" />
        </PanelResizeHandle>

        <Panel id={MEMO_CONTENT_PANEL_ID} minSize={MEMO_CONTENT_MIN_SIZE} className="min-w-0">
          {activeNote ? (
            <div className="h-full flex flex-col bg-panel overflow-hidden">
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
                  placeholder={t("memo.placeholder.tags")}
                  value={activeNote.tags.join(", ")}
                  onChange={(e) => {
                    const tags = e.target.value.split(",").map((tag) => tag.trim());
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
                placeholder={t("memo.placeholder.title")}
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
                placeholder={t("memo.placeholder.body")}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-tertiary">
              {t("memo.empty")}
            </div>
          )}
        </Panel>
      </PanelGroup>
    </div>
  );
}
