import type { TFunction } from "i18next";
import type { Note } from "@renderer/features/research/stores/memo.types";

export const cloneNotes = (notes: Note[]): Note[] =>
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
