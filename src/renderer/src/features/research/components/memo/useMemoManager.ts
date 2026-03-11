import type { TFunction } from "i18next";
import type { Note } from "@renderer/features/research/stores/memo.types";
import { cloneNotes } from "./memoDefaults";
import { useMemoViewState } from "./useMemoViewState";
import { useProjectMemoNotes } from "./useProjectMemoNotes";

export type { Note } from "@renderer/features/research/stores/memo.types";
export { buildDefaultNotes } from "./memoDefaults";

export function useMemoManager(
  projectId: string | undefined,
  projectPath: string | null | undefined,
  defaultNotes: Note[],
  t: TFunction,
) {
  const { addNote, isLoading, notes, updateNote } = useProjectMemoNotes({
    defaultNotes,
    projectId,
    projectPath,
  });
  const {
    activeNote,
    activeNoteId,
    filteredNotes,
    searchTerm,
    setActiveNoteId,
    setSearchTerm,
  } = useMemoViewState(notes, defaultNotes);

  const handleAddNote = () => {
    if (!projectId) return;

    const created = addNote(projectId, {
      title: t("project.defaults.noteTitle"),
      content: "",
      tags: [],
    });

    if (created?.id) {
      setActiveNoteId(created.id);
    }
  };

  const updateActiveNote = (updates: Partial<Note>) => {
    if (!activeNoteId) return;
    updateNote(activeNoteId, updates);
  };

  return {
    notes: cloneNotes(notes),
    isLoading,
    activeNoteId,
    setActiveNoteId,
    searchTerm,
    setSearchTerm,
    activeNote,
    filteredNotes,
    handleAddNote,
    updateActiveNote,
  };
}
