import { useDeferredValue, useMemo, useState } from "react";
import type { Note } from "@renderer/features/research/stores/memo.types";

export function useMemoViewState(notes: Note[], defaultNotes: Note[]) {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(
    defaultNotes[0]?.id ?? "1",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const activeNoteId = useMemo(() => {
    if (selectedNoteId && notes.some((note) => note.id === selectedNoteId)) {
      return selectedNoteId;
    }
    return notes[0]?.id ?? defaultNotes[0]?.id ?? "1";
  }, [defaultNotes, notes, selectedNoteId]);

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId) ?? null,
    [activeNoteId, notes],
  );

  const filteredNotes = useMemo(() => {
    if (!deferredSearchTerm) return notes;
    const query = deferredSearchTerm.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query),
    );
  }, [deferredSearchTerm, notes]);

  return {
    activeNote,
    activeNoteId,
    filteredNotes,
    searchTerm,
    setActiveNoteId: setSelectedNoteId,
    setSearchTerm,
  };
}
