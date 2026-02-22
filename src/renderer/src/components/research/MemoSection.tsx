import { useMemo, useRef } from "react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import type { Layout } from "react-resizable-panels";
import { STORAGE_KEY_MEMO_SIDEBAR_LAYOUT } from "../../../../shared/constants";
import { Tag } from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { useTranslation } from "react-i18next";
import { useShortcutCommand } from "../../hooks/useShortcutCommand";
import { readLocalStorageJson, writeLocalStorageJson } from "../../utils/localStorage";
import { useMemoManager, buildDefaultNotes, type Note } from "./memo/useMemoManager";
import { MemoSidebarList } from "./memo/MemoSidebarList";

const MEMO_SIDEBAR_PANEL_ID = "memo-sidebar";
const MEMO_CONTENT_PANEL_ID = "memo-content";
const MEMO_SIDEBAR_DEFAULT_SIZE = 230;
const MEMO_SIDEBAR_MIN_SIZE = 145;
const MEMO_SIDEBAR_MAX_SIZE = 360;
const MEMO_CONTENT_MIN_SIZE = 30;

const normalizeMemoLayout = (layout: Layout): Layout | undefined => {
  const rawSidebar = layout[MEMO_SIDEBAR_PANEL_ID];
  const rawContent = layout[MEMO_CONTENT_PANEL_ID];
  if (!Number.isFinite(rawSidebar) || !Number.isFinite(rawContent)) return undefined;

  let normalizedSidebar = Math.max(0, Math.min(100, Math.round(Number(rawSidebar))));
  if (normalizedSidebar < 0) normalizedSidebar = 0;
  if (normalizedSidebar > 1000) normalizedSidebar = 1000;

  return {
    [MEMO_SIDEBAR_PANEL_ID]: normalizedSidebar,
    [MEMO_CONTENT_PANEL_ID]: 1000 - normalizedSidebar,
  };
};

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

  const {
    activeNoteId,
    setActiveNoteId,
    searchTerm,
    setSearchTerm,
    activeNote,
    filteredNotes,
    handleAddNote,
    updateActiveNote,
  } = useMemoManager(projectId, projectPath, defaultNotes, t);

  const saveLayoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialLayout = useMemo(() => {
    const parsed = readLocalStorageJson<Layout>(STORAGE_KEY_MEMO_SIDEBAR_LAYOUT);
    if (!parsed) return undefined;
    return normalizeMemoLayout(parsed);
  }, []);

  const handleLayoutChange = (layout: Layout) => {
    if (saveLayoutTimeoutRef.current) {
      clearTimeout(saveLayoutTimeoutRef.current);
    }
    saveLayoutTimeoutRef.current = setTimeout(() => {
      const normalized = normalizeMemoLayout(layout);
      if (!normalized) return;
      void writeLocalStorageJson(STORAGE_KEY_MEMO_SIDEBAR_LAYOUT, normalized);
    }, 500);
  };

  useShortcutCommand((command) => {
    if (command.type === "scrap.addMemo") {
      handleAddNote();
    }
  });

  return (
    <div className="flex flex-col h-full bg-sidebar/30">
      <PanelGroup
        orientation="vertical"
        onLayoutChanged={handleLayoutChange}
        defaultLayout={
          initialLayout ?? {
            [MEMO_SIDEBAR_PANEL_ID]: MEMO_SIDEBAR_DEFAULT_SIZE,
            [MEMO_CONTENT_PANEL_ID]: 1000 - MEMO_SIDEBAR_DEFAULT_SIZE, // Use a larger base to accommodate 230 proportional layout
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
          <MemoSidebarList
            t={t}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filteredNotes={filteredNotes}
            activeNoteId={activeNoteId}
            setActiveNoteId={setActiveNoteId}
            handleAddNote={handleAddNote}
          />
        </Panel>

        <PanelResizeHandle className="h-1 shrink-0 bg-border/40 hover:bg-accent focus-visible:bg-accent transition-colors cursor-row-resize flex items-center justify-center -mx-4 z-10 relative">
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
                    updateActiveNote({ tags });
                  }}
                />
              </div>

              <input
                className="px-6 pt-5 pb-3 text-xl font-bold border-none bg-transparent outline-none text-fg placeholder:text-muted"
                value={activeNote.title}
                onChange={(e) => updateActiveNote({ title: e.target.value })}
                placeholder={t("memo.placeholder.title")}
              />
              <textarea
                className="flex-1 px-6 pb-6 border-none bg-transparent resize-none outline-none leading-relaxed text-[15px] text-secondary placeholder:text-muted"
                value={activeNote.content}
                onChange={(e) => updateActiveNote({ content: e.target.value })}
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
