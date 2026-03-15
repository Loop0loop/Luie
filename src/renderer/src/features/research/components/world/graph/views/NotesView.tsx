import type { ScrapMemo } from "@shared/types";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent } from "@renderer/components/ui/card";
import { Input } from "@renderer/components/ui/input";

type NotesViewProps = {
  currentProjectId: string | null;
  notesLoading: boolean;
  notesSaving: boolean;
  activeNote: ScrapMemo | null;
  onCreateNote: () => void;
  onUpdateNote: (noteId: string, updates: Partial<Omit<ScrapMemo, "id">>) => void;
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
  if (!currentProjectId) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0f1319] px-8">
        <div className="max-w-md rounded-[24px] border border-dashed border-border/60 bg-white/5 px-6 py-8 text-center text-sm text-fg/65">
          프로젝트를 열면 스크랩 노트가 여기에서 편집됩니다.
        </div>
      </div>
    );
  }

  if (notesLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0f1319] text-sm text-fg/65">
        노트를 불러오는 중입니다...
      </div>
    );
  }

  if (!activeNote) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0f1319] px-8">
        <div className="max-w-md rounded-[24px] border border-dashed border-border/60 bg-white/5 px-6 py-8 text-center">
          <p className="text-sm text-fg/70">아직 노트가 없습니다.</p>
          <button
            type="button"
            onClick={onCreateNote}
            className="mt-5 rounded-xl border border-border/60 bg-white/10 px-4 py-2 text-sm text-fg transition hover:bg-white/15"
          >
            첫 노트 만들기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0f1319]">
      <div className="mx-auto flex max-w-4xl flex-col px-10 py-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Card className="flex-1 border-white/10 bg-[#161a21]">
            <CardContent className="flex flex-wrap items-center gap-2 pt-4">
            <span className="text-xs text-fg/45">태그</span>
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
              className="min-w-[240px] flex-1 border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0"
              placeholder="예: 떡밥, 시즌1, 설정"
            />
            </CardContent>
          </Card>

          <div className="flex items-center gap-2">
            <Button
              onClick={onSaveNow}
              size="sm"
              variant="secondary"
            >
              {notesSaving ? "저장 중..." : "지금 저장"}
            </Button>
            <Button
              onClick={() => onDeleteNote(activeNote.id)}
              size="sm"
              variant="destructive"
            >
              삭제
            </Button>
          </div>
        </div>

        <Input
          value={activeNote.title}
          onChange={(event) =>
            onUpdateNote(activeNote.id, { title: event.target.value })
          }
          className="h-auto border-0 bg-transparent px-0 pb-4 text-4xl font-semibold tracking-tight text-fg shadow-none ring-0 focus-visible:ring-0"
          placeholder="노트 제목"
        />

        <textarea
          value={activeNote.content}
          onChange={(event) =>
            onUpdateNote(activeNote.id, { content: event.target.value })
          }
          className="min-h-[560px] w-full resize-none border-none bg-transparent text-base leading-8 text-fg/85 outline-none"
          placeholder="설정, 메모, 장면 아이디어를 자유롭게 적으세요."
        />
      </div>
    </div>
  );
}
