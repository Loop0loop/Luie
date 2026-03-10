import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { TFunction } from "i18next";
import {
  useMemoStore,
  type MemoNote,
} from "@renderer/features/research/stores/memoStore";

export type Note = MemoNote;

const cloneNotes = (notes: Note[]): Note[] =>
  notes.map((note) => ({
    ...note,
    tags: [...note.tags],
  }));

export function buildDefaultNotes(t: TFunction): Note[] {
  const rawNotes = t("memo.defaultNotes", { returnObjects: true }) as Array<
    Omit<Note, "updatedAt">
  >;
  const updatedAt = new Date().toISOString();

  return rawNotes.map((note) => ({
    ...note,
    tags: [...note.tags],
    updatedAt,
  }));
}

export function useMemoManager(
  projectId: string | undefined,
  projectPath: string | null | undefined,
  defaultNotes: Note[],
  t: TFunction,
) {
  const notes = useMemoStore((state) => state.notes);
  const isLoading = useMemoStore((state) => state.isLoading);
  const loadNotes = useMemoStore((state) => state.loadNotes);
  const addNote = useMemoStore((state) => state.addNote);
  const updateNote = useMemoStore((state) => state.updateNote);

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(
    defaultNotes[0]?.id ?? "1",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  useEffect(() => {
    if (!projectId) return;
    void loadNotes(projectId, projectPath, defaultNotes);
  }, [defaultNotes, loadNotes, projectId, projectPath]);

  const activeNoteId = useMemo(() => {
    if (selectedNoteId && notes.some((note) => note.id === selectedNoteId)) {
      return selectedNoteId;
    }
    return notes[0]?.id ?? defaultNotes[0]?.id ?? "1";
  }, [defaultNotes, notes, selectedNoteId]);

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId) ?? null,
    [notes, activeNoteId],
  );

  const filteredNotes = useMemo(() => {
    if (!deferredSearchTerm) return notes;
    const query = deferredSearchTerm.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query),
    );
  }, [notes, deferredSearchTerm]);

  const handleAddNote = () => {
    if (!projectId) return;

    const created = addNote(projectId, {
      title: t("project.defaults.noteTitle"),
      content: "",
      tags: [],
    });

    if (created?.id) {
      setSelectedNoteId(created.id);
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
    setActiveNoteId: setSelectedNoteId,
    searchTerm,
    setSearchTerm,
    activeNote,
    filteredNotes,
    handleAddNote,
    updateActiveNote,
  };
}
