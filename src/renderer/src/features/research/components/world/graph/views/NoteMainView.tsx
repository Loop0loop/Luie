import { useEffect, useMemo } from "react";
import { Plus, Save, StickyNote, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@renderer/components/ui/button";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useGraphIdeStore } from "@renderer/features/research/stores/graphIdeStore";
import { useMemoStore } from "@renderer/features/research/stores/memoStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { getReadableLuieAttachmentPath } from "@shared/projectAttachment";

export function NoteMainView() {
  const { t } = useTranslation();
  const currentProject = useProjectStore((state) => state.currentItem);
  const projectPath = getReadableLuieAttachmentPath(currentProject);
  const notes = useMemoStore((state) => state.notes);
  const isLoading = useMemoStore((state) => state.isLoading);
  const isSaving = useMemoStore((state) => state.isSaving);
  const loadNotes = useMemoStore((state) => state.loadNotes);
  const addNote = useMemoStore((state) => state.addNote);
  const updateNote = useMemoStore((state) => state.updateNote);
  const deleteNote = useMemoStore((state) => state.deleteNote);
  const flushSave = useMemoStore((state) => state.flushSave);
  const selectedNoteId = useGraphIdeStore((state) => state.selectedNoteId);
  const setSelectedNoteId = useGraphIdeStore((state) => state.setSelectedNoteId);
  const mainView = useUIStore((state) => state.mainView);
  const setMainView = useUIStore((state) => state.setMainView);

  useEffect(() => {
    if (currentProject?.id || selectedNoteId === null) {
      return;
    }
    setSelectedNoteId(null);
  }, [currentProject?.id, selectedNoteId, setSelectedNoteId]);

  useEffect(() => {
    if (!currentProject?.id) {
      return;
    }
    void loadNotes(currentProject.id, projectPath, []);
  }, [currentProject?.id, loadNotes, projectPath]);

  const activeNote = useMemo(() => {
    if (selectedNoteId) {
      const matched = notes.find((note) => note.id === selectedNoteId);
      if (matched) {
        return matched;
      }
    }
    return notes[0] ?? null;
  }, [notes, selectedNoteId]);

  useEffect(() => {
    const nextNoteId = activeNote?.id ?? null;
    if (selectedNoteId === nextNoteId) {
      return;
    }
    setSelectedNoteId(nextNoteId);
  }, [activeNote?.id, selectedNoteId, setSelectedNoteId]);

  useEffect(() => {
    const editorNoteId =
      mainView.type === "memo" && mainView.id ? mainView.id : null;
    if (!editorNoteId || editorNoteId === selectedNoteId) {
      return;
    }
    if (notes.some((note) => note.id === editorNoteId)) {
      setSelectedNoteId(editorNoteId);
    }
  }, [mainView, notes, selectedNoteId, setSelectedNoteId]);

  useEffect(() => {
    const nextNoteId = activeNote?.id ?? null;
    const currentEditorNoteId =
      mainView.type === "memo" && mainView.id ? mainView.id : null;
    if (!nextNoteId || currentEditorNoteId === nextNoteId) {
      return;
    }
    setMainView({ type: "memo", id: nextNoteId });
  }, [activeNote?.id, mainView, setMainView]);

  const handleCreateNote = () => {
    if (!currentProject?.id) {
      return;
    }
    const created = addNote(currentProject.id, {
      title: t("project.defaults.noteTitle", "새 메모"),
      content: "",
      tags: [],
    });
    if (created?.id) {
      setSelectedNoteId(created.id);
      setMainView({ type: "memo", id: created.id });
    }
  };

  const handleDeleteNote = () => {
    if (!activeNote) {
      return;
    }
    deleteNote(activeNote.id);
    const remaining = notes.filter((note) => note.id !== activeNote.id);
    setSelectedNoteId(remaining[0]?.id ?? null);
  };

  return (
    <div className="flex h-full flex-col bg-transparent">
      <header className="flex items-center justify-between border-b px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
            <StickyNote className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("world.graph.note.title", "아이디어 노트")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              이 탭의 내용은 scrap memo 문서로 저장되고 `.luie` 첨부가 있으면 함께 보존됩니다.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={handleCreateNote}>
            <Plus className="h-4 w-4" />
            {t("world.graph.note.add", "새 노트")}
          </Button>
          <Button className="gap-2" onClick={() => void flushSave()}>
            <Save className="h-4 w-4" />
            {isSaving
              ? t("world.graph.note.saving", "저장 중")
              : t("world.graph.note.saveNow", "지금 저장")}
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          {t("world.graph.note.loading", "노트를 불러오는 중입니다...")}
        </div>
      ) : !activeNote ? (
        <div className="flex flex-1 items-center justify-center px-8">
          <div className="max-w-md rounded-xl border border-dashed border-border/60 bg-card/40 px-6 py-10 text-center">
            <p className="text-sm font-medium text-foreground">
              {t("world.graph.note.empty", "아직 작성된 노트가 없습니다")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("world.graph.note.emptyHint", "새 노트를 만들면 사이드바와 `.luie`에 바로 반영됩니다.")}
            </p>
            <Button className="mt-5 gap-2" onClick={handleCreateNote}>
              <Plus className="h-4 w-4" />
              {t("world.graph.note.addFirst", "첫 노트 만들기")}
            </Button>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="mx-auto flex max-w-4xl flex-col px-8 py-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex flex-1 flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("world.graph.note.tags", "태그")}
                </span>
                <input
                  className="min-w-[220px] flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  value={activeNote.tags.join(", ")}
                  onChange={(event) => {
                    updateNote(activeNote.id, {
                      tags: event.target.value
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter((tag) => tag.length > 0),
                    });
                  }}
                  placeholder={t("world.graph.note.tagsPlaceholder", "예: 떡밥, 설정, 시즌1")}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={handleDeleteNote}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <input
              className="border-none bg-transparent pb-3 text-3xl font-bold tracking-tight text-foreground outline-none placeholder:text-muted-foreground"
              value={activeNote.title}
              onChange={(event) =>
                updateNote(activeNote.id, { title: event.target.value })
              }
              placeholder={t("world.graph.note.titlePlaceholder", "노트 제목")}
            />

            <textarea
              className="min-h-[520px] w-full resize-none border-none bg-transparent text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
              value={activeNote.content}
              onChange={(event) =>
                updateNote(activeNote.id, { content: event.target.value })
              }
              placeholder={t("world.graph.note.bodyPlaceholder", "설정, 떡밥, 메모를 자유롭게 기록하세요.")}
            />
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
