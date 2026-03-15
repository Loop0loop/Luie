import { useDeferredValue, useMemo } from "react";
import { Lightbulb, Plus, Search, StickyNote } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@renderer/components/ui/input";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useWorldGraphUiStore } from "@renderer/features/research/stores/worldGraphUiStore";
import { useMemoStore } from "@renderer/features/research/stores/memoStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";

export function NoteSidebarContent() {
  const { t } = useTranslation();
  const currentProjectId = useProjectStore((state) => state.currentItem?.id);
  const notes = useMemoStore((state) => state.notes);
  const addNote = useMemoStore((state) => state.addNote);
  const activeMemoProjectId = useMemoStore((state) => state.activeProjectId);
  const selectedNoteId = useWorldGraphUiStore((state) => state.selectedNoteId);
  const setSelectedNoteId = useWorldGraphUiStore((state) => state.setSelectedNoteId);
  const noteSearchQuery = useWorldGraphUiStore((state) => state.noteSearchQuery);
  const setNoteSearchQuery = useWorldGraphUiStore((state) => state.setNoteSearchQuery);
  const setMainView = useUIStore((state) => state.setMainView);
  const deferredSearchQuery = useDeferredValue(noteSearchQuery);

  const filteredNotes = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    if (!query) {
      return [...notes].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      );
    }
    return notes
      .filter((note) => {
        const haystack = `${note.title} ${note.content} ${note.tags.join(" ")}`.toLowerCase();
        return haystack.includes(query);
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [deferredSearchQuery, notes]);

  const handleCreateNote = () => {
    if (!currentProjectId) {
      return;
    }
    const created = addNote(currentProjectId, {
      title: t("project.defaults.noteTitle", "새 메모"),
      content: "",
      tags: [],
    });
    if (created?.id) {
      setSelectedNoteId(created.id);
      setMainView({ type: "memo", id: created.id });
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto px-3 py-2">
      <button
        type="button"
        onClick={handleCreateNote}
        className="mb-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 px-3 py-2 text-sm font-medium text-fg transition-colors hover:border-accent/50 hover:bg-accent/5"
      >
        <Plus className="h-4 w-4" />
        {t("world.graph.note.add", "새 노트")}
      </button>

      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={noteSearchQuery}
          onChange={(event) => setNoteSearchQuery(event.target.value)}
          placeholder={t("world.graph.note.searchPlaceholder", "노트 검색...")}
          className="h-9 bg-background pl-9"
        />
      </div>

      <SidebarTreeSection
        title={t("world.graph.ide.sidebar.notes.recent", "Recent Notes")}
        actionIcon={<StickyNote className="h-3.5 w-3.5" />}
      >
        {activeMemoProjectId !== currentProjectId ? (
          <p className="px-2 py-1.5 text-[11px] text-muted-foreground/50">
            {t("world.graph.note.loading", "노트를 불러오는 중입니다...")}
          </p>
        ) : filteredNotes.length === 0 ? (
          <p className="px-2 py-1.5 text-[11px] text-muted-foreground/50">
            {noteSearchQuery.trim().length > 0
              ? t("world.graph.note.emptySearch", "검색 결과가 없습니다")
              : t("world.graph.note.empty", "아직 작성된 노트가 없습니다")}
          </p>
        ) : (
          filteredNotes.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => {
                setSelectedNoteId(note.id);
                setMainView({ type: "memo", id: note.id });
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-[5px] text-left text-[12px] transition-all ${
                selectedNoteId === note.id
                  ? "bg-accent/10 font-medium text-accent"
                  : "text-fg/80 hover:bg-element/80"
              }`}
            >
              <Lightbulb className="h-[14px] w-[14px] text-yellow-400/70" />
              <span className="flex-1 truncate">{note.title || t("world.graph.note.untitled", "제목 없음")}</span>
            </button>
          ))
        )}
      </SidebarTreeSection>

      <SidebarTreeSection
        title={t("world.graph.ide.sidebar.notes.tags", "Tags")}
        actionIcon={<Search className="h-3.5 w-3.5" />}
        defaultExpanded={false}
      >
        {Array.from(
          new Set(notes.flatMap((note) => note.tags.filter((tag) => tag.length > 0))),
        )
          .sort((left, right) => left.localeCompare(right, "ko"))
          .map((tag) => (
            <TreeItem
              key={tag}
              icon={<StickyNote className="h-[14px] w-[14px] text-orange-400/70" />}
              label={`#${tag}`}
            />
          ))}
      </SidebarTreeSection>
    </div>
  );
}
