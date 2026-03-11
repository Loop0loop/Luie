import type { ScrapMemo } from "@shared/types";

export type MemoNote = ScrapMemo;
export type MemoNoteInput = Omit<MemoNote, "id" | "updatedAt">;
export type Note = MemoNote;
