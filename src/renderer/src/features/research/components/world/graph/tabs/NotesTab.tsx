import { useMemo } from "react";
import { useMemoStore } from "@renderer/features/research/stores/memoStore";
import { useWorldGraphWorkspace } from "../hooks/useWorldGraphWorkspace";
import { NotesView } from "../views/NotesView";

type NotesTabProps = {
  selectedNoteId: string | null;
  onDeleteNote: (noteId: string) => void;
  onCreateNote: () => void;
};

export function NotesTab({
  selectedNoteId,
  onDeleteNote,
  onCreateNote,
}: NotesTabProps) {
  const { projectId, notes, notesLoading, notesSaving } =
    useWorldGraphWorkspace();

  const updateNote = useMemoStore((state) => state.updateNote);
  const flushSave = useMemoStore((state) => state.flushSave);

  const effectiveSelectedNoteId =
    selectedNoteId && notes.some((note) => note.id === selectedNoteId)
      ? selectedNoteId
      : (notes[0]?.id ?? null);

  const activeNote = useMemo(
    () => notes.find((note) => note.id === effectiveSelectedNoteId) ?? null,
    [effectiveSelectedNoteId, notes],
  );

  return (
    <NotesView
      currentProjectId={projectId}
      notesLoading={notesLoading}
      notesSaving={notesSaving}
      activeNote={activeNote}
      onCreateNote={onCreateNote}
      onUpdateNote={updateNote}
      onDeleteNote={onDeleteNote}
      onSaveNow={() => {
        void flushSave();
      }}
    />
  );
}
