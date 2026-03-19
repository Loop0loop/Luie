import { useEffect, useRef } from "react";
import { useMemoStore } from "@renderer/features/research/stores/memoStore";
import type { Note } from "@renderer/features/research/stores/memo.types";

const EMPTY_NOTES: Note[] = [];

type UseProjectMemoNotesOptions = {
  defaultNotes?: Note[];
  flushOnCleanup?: boolean;
  projectId?: string;
  projectPath?: string | null;
};

export function useProjectMemoNotes(options: UseProjectMemoNotesOptions) {
  const {
    defaultNotes = [],
    flushOnCleanup = false,
    projectId,
    projectPath,
  } = options;
  const notes = useMemoStore((state) => state.notes);
  const isLoading = useMemoStore((state) => state.isLoading);
  const addNote = useMemoStore((state) => state.addNote);
  const updateNote = useMemoStore((state) => state.updateNote);
  const deleteNote = useMemoStore((state) => state.deleteNote);
  const loadNotes = useMemoStore((state) => state.loadNotes);
  const flushSave = useMemoStore((state) => state.flushSave);
  const fallbackNotesRef = useRef<Note[]>(
    defaultNotes.length > 0 ? defaultNotes : EMPTY_NOTES,
  );

  useEffect(() => {
    fallbackNotesRef.current =
      defaultNotes.length > 0 ? defaultNotes : EMPTY_NOTES;
  }, [defaultNotes]);

  useEffect(() => {
    if (!projectId) return;
    void loadNotes(projectId, projectPath, fallbackNotesRef.current);

    return () => {
      if (flushOnCleanup) {
        void flushSave();
      }
    };
  }, [flushOnCleanup, flushSave, loadNotes, projectId, projectPath]);

  return {
    addNote,
    deleteNote,
    flushSave,
    isLoading,
    notes,
    updateNote,
  };
}
