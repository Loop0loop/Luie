import { useCallback, useEffect, useMemo } from "react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { useShallow } from "zustand/react/shallow";
import {
  STORAGE_KEY_MEMO_SIDEBAR_LAYOUT,
  STORAGE_KEY_MEMO_SIDEBAR_LAYOUT_LEGACY,
} from "@shared/constants";
import { Tag } from "lucide-react";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useTranslation } from "react-i18next";
import { useShortcutCommand } from "@renderer/features/workspace/hooks/useShortcutCommand";
import { readLocalStorageJson, writeLocalStorageJson } from "@shared/utils/localStorage";
import { useMemoManager, buildDefaultNotes, type Note } from "@renderer/features/research/components/memo/useMemoManager";
import { MemoSidebarList } from "@renderer/features/research/components/memo/MemoSidebarList";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import {
  clampSidebarWidth,
  getSidebarDefaultWidth,
  getSidebarWidthConfig,
  toPercentSize,
  toPxSize,
} from "@shared/constants/sidebarSizing";
import { useSidebarResizeCommit } from "@renderer/features/workspace/hooks/useSidebarResizeCommit";

const MEMO_SIDEBAR_PANEL_ID = "memo-sidebar";
const MEMO_CONTENT_PANEL_ID = "memo-content";
const MEMO_CONTENT_MIN_SIZE_PERCENT = 20;

type MemoSidebarLayoutV3 = {
  sidebarWidthPx: number;
};

const readMemoSidebarWidthFromStorage = (): number | null => {
  const v3 = readLocalStorageJson<MemoSidebarLayoutV3>(STORAGE_KEY_MEMO_SIDEBAR_LAYOUT);
  if (typeof v3?.sidebarWidthPx === "number" && Number.isFinite(v3.sidebarWidthPx)) {
    return Math.round(v3.sidebarWidthPx);
  }

  // v2 layout exists as percentage-based pair; skip conversion and use default width.
  if (localStorage.getItem(STORAGE_KEY_MEMO_SIDEBAR_LAYOUT_LEGACY)) {
    return null;
  }

  return null;
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
  const { sidebarWidths, setSidebarWidth } = useUIStore(
    useShallow((state: any) => ({
      sidebarWidths: state.sidebarWidths,
      setSidebarWidth: state.setSidebarWidth,
    }))
  );

  const sidebarFeature = "memoSidebar" as const;
  const sidebarConfig = getSidebarWidthConfig(sidebarFeature);

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

  const storedSidebarWidthPx = useMemo(() => {
    const width = readMemoSidebarWidthFromStorage();
    if (width === null) return null;
    return clampSidebarWidth(sidebarFeature, width);
  }, []);

  useEffect(() => {
    if (storedSidebarWidthPx === null) return;
    setSidebarWidth(sidebarFeature, storedSidebarWidthPx);
  }, [setSidebarWidth, sidebarFeature, storedSidebarWidthPx]);

  const memoSidebarWidthPx = clampSidebarWidth(
    sidebarFeature,
    storedSidebarWidthPx ??
    sidebarWidths[sidebarFeature] ??
    getSidebarDefaultWidth(sidebarFeature),
  );

  const commitMemoSidebarWidth = useCallback(
    (_feature: string, widthPx: number) => {
      setSidebarWidth(sidebarFeature, widthPx);
      writeLocalStorageJson(STORAGE_KEY_MEMO_SIDEBAR_LAYOUT, { sidebarWidthPx: widthPx });
    },
    [setSidebarWidth, sidebarFeature],
  );

  const handleMemoSidebarResize = useSidebarResizeCommit(
    sidebarFeature,
    commitMemoSidebarWidth,
  );

  useShortcutCommand((command) => {
    if (command.type === "scrap.addMemo") {
      handleAddNote();
    }
  });

  return (
    <div className="flex flex-col h-full bg-sidebar/30">
      <PanelGroup
        orientation="horizontal"
        id="memo-panel-group"
        className="h-full! w-full!"
      >
        <Panel
          id={MEMO_SIDEBAR_PANEL_ID}
          defaultSize={toPxSize(memoSidebarWidthPx)}
          minSize={toPxSize(sidebarConfig.minPx)}
          maxSize={toPxSize(sidebarConfig.maxPx)}
          onResize={handleMemoSidebarResize}
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

        <PanelResizeHandle className="w-1 shrink-0 bg-border/40 hover:bg-accent focus-visible:bg-accent transition-colors cursor-col-resize flex flex-col items-center justify-center -my-4 z-10 relative">
        </PanelResizeHandle>

        <Panel id={MEMO_CONTENT_PANEL_ID} minSize={toPercentSize(MEMO_CONTENT_MIN_SIZE_PERCENT)} className="min-w-0">
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
                className="flex-1 px-6 pb-6 border-none bg-transparent resize-none outline-none leading-relaxed text-[15px] text-muted placeholder:text-muted"
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
