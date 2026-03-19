import type { ScrapMemo } from "@shared/types";
import { useTranslation } from "react-i18next";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent } from "@renderer/components/ui/card";
import { Input } from "@renderer/components/ui/input";

type NotesViewProps = {
  currentProjectId: string | null;
  notesLoading: boolean;
  notesSaving: boolean;
  activeNote: ScrapMemo | null;
  onCreateNote: () => void;
  onUpdateNote: (
    noteId: string,
    updates: Partial<Omit<ScrapMemo, "id">>,
  ) => void;
  onDeleteNote: (noteId: string) => void;
  onSaveNow: () => void;
};

export function NotesView({
  currentProjectId,
  notesLoading,
  notesSaving,
  activeNote,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onSaveNow,
}: NotesViewProps) {
  const { t } = useTranslation();

  if (!currentProjectId) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas px-8">
        <div className="max-w-md rounded-[24px] border border-dashed border-border/60 bg-white/5 px-6 py-8 text-center text-sm text-fg/65">
          {t("research.graph.notes.noProject")}
        </div>
      </div>
    );
  }

  if (notesLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas text-sm text-fg/65">
        {t("research.graph.notes.loading")}
      </div>
    );
  }

  if (!activeNote) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas px-8">
        <div className="max-w-md rounded-[24px] border border-dashed border-border/60 bg-white/5 px-6 py-8 text-center">
          <p className="text-sm text-fg/70">
            {t("research.graph.notes.empty")}
          </p>
          <button
            type="button"
            onClick={onCreateNote}
            className="mt-5 rounded-xl border border-border/60 bg-white/10 px-4 py-2 text-sm text-fg transition hover:bg-white/15"
          >
            {t("research.graph.notes.createFirst")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-canvas px-8 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-end gap-2">
          <Button onClick={onSaveNow} size="sm" variant="secondary">
            {notesSaving
              ? t("research.graph.notes.saving")
              : t("research.graph.notes.saveNow")}
          </Button>
          <Button
            onClick={() => onDeleteNote(activeNote.id)}
            size="sm"
            variant="destructive"
          >
            {t("research.graph.notes.delete")}
          </Button>
        </div>

        <Card className="border-white/10 bg-panel shadow-[0_24px_70px_rgba(0,0,0,0.38)]">
          <CardContent className="space-y-6 pt-8">
            <div className="space-y-3 text-center">
              <p className="text-[11px] uppercase tracking-[0.26em] text-fg/42">
                {t("research.graph.notes.kicker")}
              </p>
              <Input
                value={activeNote.title}
                onChange={(event) =>
                  onUpdateNote(activeNote.id, { title: event.target.value })
                }
                className="mx-auto h-auto max-w-xl border-0 bg-transparent px-0 text-center text-2xl font-semibold tracking-tight text-fg shadow-none ring-0 focus-visible:ring-0"
                placeholder={t("research.graph.notes.titlePlaceholder")}
              />
            </div>

            <div className="mx-auto max-w-xl">
              <p className="mb-2 text-center text-[11px] uppercase tracking-[0.24em] text-fg/42">
                {t("research.graph.notes.tags")}
              </p>
              <Input
                value={activeNote.tags.join(", ")}
                onChange={(event) =>
                  onUpdateNote(activeNote.id, {
                    tags: event.target.value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  })
                }
                className="h-10 border-white/10 bg-surface text-center"
                placeholder={t("research.graph.notes.tagsPlaceholder")}
              />
            </div>

            <div className="rounded-[28px] border border-white/8 bg-surface p-5">
              <textarea
                value={activeNote.content}
                onChange={(event) =>
                  onUpdateNote(activeNote.id, { content: event.target.value })
                }
                className="min-h-[560px] w-full resize-none border-none bg-transparent text-base leading-8 text-fg/85 outline-none"
                placeholder={t("research.graph.notes.bodyPlaceholder")}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
